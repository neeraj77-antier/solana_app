'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  setConnected, setDisconnected, fetchSolBalance, fetchNRJBalance,
} from '@/store/walletSlice';
import { setNRJMint, fetchNRJTokenInfo } from '@/store/tokenSlice';
import { clearTransactions, fetchTransactions, loadCachedTransactions } from '@/store/transactionsSlice';
import { NRJ_TOKEN_MINT } from '@/constants';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAllTokenAccounts } from '@/services/solana/balance';
import toast from 'react-hot-toast';

/**
 * Polling interval — primary mechanism for balance updates.
 * 10 seconds is fast enough to feel real-time but not too aggressive.
 * WebSocket subscriptions are set up as a bonus for instant updates
 * but we don't rely on them being stable (public devnet has WS issues).
 */
const POLL_MS = 10_000;

export function useWalletIntegration() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const dispatch = useAppDispatch();
  const walletState = useAppSelector((s) => s.wallet);
  const tokenState  = useAppSelector((s) => s.tokens);

  const prevAddressRef  = useRef<string | null>(null);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const solSubRef       = useRef<number | null>(null);
  const logsSubRef      = useRef<number | null>(null);
  const knownMintRef    = useRef<string | null>(null);
  const discoveryRunRef = useRef<boolean>(false); // prevent concurrent discovery

  // ─── Resolve NRJ mint ────────────────────────────────────────────────────

  const getNRJMint = useCallback((): string | null => {
    if (tokenState.nrjToken?.mint) return tokenState.nrjToken.mint;
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('nrj_token_mint') : null;
      if (saved) return saved;
    } catch {}
    if (NRJ_TOKEN_MINT) return NRJ_TOKEN_MINT;
    return null;
  }, [tokenState.nrjToken?.mint]);

  // ─── Auto-discover NRJ mint from on-chain token accounts ─────────────────
  /**
   * Called when we don't know the mint address.
   * Scans all SPL token accounts of this wallet and:
   *   1. Matches against NRJ_TOKEN_MINT env var (if set)
   *   2. Falls back to the token account with the highest balance
   * This lets receivers who have never visited the Tokens tab
   * automatically detect incoming NRJ transfers.
   */
  const discoverNRJMint = useCallback(async (address: string): Promise<string | null> => {
    if (discoveryRunRef.current) return null; // already running
    discoveryRunRef.current = true;
    try {
      const accounts = await getAllTokenAccounts(address);
      if (accounts.length === 0) return null;

      // Priority 1: match against known env mint
      if (NRJ_TOKEN_MINT) {
        const match = accounts.find((a) => a.mint === NRJ_TOKEN_MINT);
        if (match) {
          dispatch(setNRJMint(NRJ_TOKEN_MINT));
          localStorage.setItem('nrj_token_mint', NRJ_TOKEN_MINT);
          return NRJ_TOKEN_MINT;
        }
      } 

      // Priority 2: token with the highest balance (most likely NRJ)
      const nonZero = accounts.filter((a) => a.balance > 0);
      if (nonZero.length > 0) {
        const best = nonZero.sort((a, b) => b.balance - a.balance)[0];
        dispatch(setNRJMint(best.mint));
        localStorage.setItem('nrj_token_mint', best.mint);
        return best.mint;
      }

      return null;
    } catch {
      return null;
    } finally {
      discoveryRunRef.current = false;
    }
  }, [dispatch]);

  // ─── Core balance refresh — called every poll tick ───────────────────────
  /**
   * This is the primary update mechanism. On every tick:
   * 1. Always fetch SOL balance
   * 2. If mint is known → fetch NRJ balance directly
   * 3. If mint is NOT known → scan token accounts to discover it
   *
   * This means even if Amit sends tokens to this wallet for the first time,
   * within 10 seconds the mint will be discovered and balance updated.
   */
  const refreshBalances = useCallback(async () => {
    if (!wallet.publicKey) return;
    const address = wallet.publicKey.toString();

    // Always refresh SOL
    dispatch(fetchSolBalance(address));

    let mint = getNRJMint();

    // If mint unknown, try to discover it from on-chain token accounts
    if (!mint) {
      mint = await discoverNRJMint(address);
    }

    // Fetch NRJ balance if we know the mint
    if (mint) {
      dispatch(fetchNRJBalance({ address, mintAddress: mint }));
    }
  }, [wallet.publicKey, dispatch, getNRJMint, discoverNRJMint]);

  // ─── Clean up WebSocket subscriptions ────────────────────────────────────

  const clearSubscriptions = useCallback(() => {
    if (solSubRef.current !== null) {
      try { connection.removeAccountChangeListener(solSubRef.current); } catch {}
      solSubRef.current = null;
    }
    if (logsSubRef.current !== null) {
      try { connection.removeOnLogsListener(logsSubRef.current); } catch {}
      logsSubRef.current = null;
    }
  }, [connection]);

  // ─── WebSocket subscriptions (best-effort, public devnet may drop these) ──

  const setupSubscriptions = useCallback(async (address: string) => {
    clearSubscriptions();

    // SOL account change (instant SOL balance update)
    try {
      solSubRef.current = connection.onAccountChange(
        new PublicKey(address),
        (info) => {
          const bal = info.lamports / LAMPORTS_PER_SOL;
          dispatch({ type: 'wallet/setSolBalance', payload: bal });
        },
        'confirmed'
      );
    } catch {}

    // Transaction logs (instant detection of ANY incoming transfer)
    // Fires even for newly created ATAs (new token accounts)
    try {
      logsSubRef.current = connection.onLogs(
        new PublicKey(address),
        async (logs) => {
          if (logs.err) return;
          // Immediately do a full balance refresh when any tx hits this wallet
          await refreshBalances();
          // Also update transaction history after a small delay
          setTimeout(() => dispatch(fetchTransactions({ walletAddress: address })), 2500);
        },
        'confirmed'
      );
    } catch {}
  }, [connection, dispatch, clearSubscriptions, refreshBalances]);

  // ─── Main wallet connect / disconnect effect ──────────────────────────────

  useEffect(() => {
    const address = wallet.publicKey?.toString() || null;

    // ── Connected ──
    if (wallet.connected && address && address !== prevAddressRef.current) {
      prevAddressRef.current = address;
      dispatch(setConnected({ address }));

      // Initial fetch (async, don't block)
      (async () => {
        dispatch(fetchSolBalance(address));
        let mint = getNRJMint();
        if (!mint) {
          // May have received tokens before connecting — try to discover
          mint = await discoverNRJMint(address);
        }
        if (mint) {
          dispatch(fetchNRJBalance({ address, mintAddress: mint }));
          dispatch(fetchNRJTokenInfo(mint));
        }
      })();

      // Restore history cache instantly, then sync from chain
      dispatch(loadCachedTransactions(address));
      dispatch(fetchTransactions({ walletAddress: address }));

      // WebSocket (best-effort instant updates)
      setupSubscriptions(address);

      // ── Polling (primary reliable mechanism) ──
      // Runs every 10s regardless of WebSocket state
      intervalRef.current = setInterval(() => {
        refreshBalances();
      }, POLL_MS);

      toast.success(`Wallet connected: ${address.slice(0, 8)}...`, { icon: '🔗' });
    }

    // ── Disconnected ──
    if (!wallet.connected && prevAddressRef.current) {
      prevAddressRef.current = null;
      dispatch(setDisconnected());
      dispatch(clearTransactions());
      clearSubscriptions();
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      toast('Wallet disconnected', { icon: '👋' });
    }
  }, [
    wallet.connected, wallet.publicKey, dispatch,
    refreshBalances, getNRJMint, discoverNRJMint, setupSubscriptions, clearSubscriptions,
  ]);

  // ─── Re-run when mint becomes known (e.g. after creating the NRJ token) ───

  useEffect(() => {
    const mint = getNRJMint();
    if (!mint || !wallet.publicKey || !wallet.connected) return;
    if (mint === knownMintRef.current) return;
    knownMintRef.current = mint;

    const address = wallet.publicKey.toString();
    dispatch(fetchNRJBalance({ address, mintAddress: mint }));
    dispatch(fetchNRJTokenInfo(mint));

    // Re-setup subscriptions so onLogs closure captures latest mint
    setupSubscriptions(address);
  }, [
    tokenState.nrjToken?.mint, wallet.publicKey, wallet.connected,
    dispatch, getNRJMint, setupSubscriptions,
  ]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearSubscriptions();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [clearSubscriptions]);

  return {
    wallet, connection, walletState, refreshBalances,
    isConnected: walletState.connected,
    address: walletState.address,
    solBalance: walletState.balance,
    nrjBalance: walletState.nrjBalance,
    isLoading: walletState.isLoading,
  };
}
