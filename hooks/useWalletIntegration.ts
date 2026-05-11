'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  setConnected,
  setDisconnected,
  fetchSolBalance,
  fetchNRJBalance,
} from '@/store/walletSlice';
import { fetchNRJTokenInfo } from '@/store/tokenSlice';
import { clearTransactions, fetchTransactions } from '@/store/transactionsSlice';
import { NRJ_TOKEN_MINT, BALANCE_REFRESH_INTERVAL } from '@/constants';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import toast from 'react-hot-toast';

export function useWalletIntegration() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const dispatch = useAppDispatch();
  const walletState = useAppSelector((state) => state.wallet);
  const tokenState = useAppSelector((state) => state.tokens);

  const prevAddressRef = useRef<string | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WebSocket subscription IDs — so we can cleanly unsubscribe
  const solSubRef = useRef<number | null>(null);
  const nrjSubRef = useRef<number | null>(null);

  /**
   * Resolve NRJ mint: Redux → localStorage → env
   */
  const getNRJMint = useCallback((): string | null => {
    if (tokenState.nrjToken?.mint) return tokenState.nrjToken.mint;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nrj_token_mint') : null;
    if (saved) return saved;
    if (NRJ_TOKEN_MINT) return NRJ_TOKEN_MINT;
    return null;
  }, [tokenState.nrjToken?.mint]);

  /**
   * Refresh all balances — uses the current mint address
   */
  const refreshBalances = useCallback(async () => {
    if (!wallet.publicKey) return;
    const address = wallet.publicKey.toString();
    dispatch(fetchSolBalance(address));
    const mintAddress = getNRJMint();
    if (mintAddress) dispatch(fetchNRJBalance({ address, mintAddress }));
  }, [wallet.publicKey, dispatch, getNRJMint]);

  /**
   * Remove existing WebSocket subscriptions
   */
  const clearSubscriptions = useCallback(() => {
    if (solSubRef.current !== null) {
      connection.removeAccountChangeListener(solSubRef.current).catch(() => {});
      solSubRef.current = null;
    }
    if (nrjSubRef.current !== null) {
      connection.removeAccountChangeListener(nrjSubRef.current).catch(() => {});
      nrjSubRef.current = null;
    }
  }, [connection]);

  /**
   * Subscribe to SOL account changes (catches incoming SOL transfers)
   */
  const subscribeSol = useCallback((address: string) => {
    if (solSubRef.current !== null) return; // already subscribed
    try {
      const pubkey = new PublicKey(address);
      solSubRef.current = connection.onAccountChange(
        pubkey,
        (accountInfo) => {
          const newBalance = accountInfo.lamports / LAMPORTS_PER_SOL;
          // Dispatch a direct balance update (no round-trip RPC needed)
          dispatch({ type: 'wallet/setSolBalance', payload: newBalance });
          toast.success(`SOL balance updated: ${newBalance.toFixed(4)} SOL`, {
            id: 'sol-ws-update', duration: 3000,
          });
        },
        'confirmed'
      );
    } catch (err) {
      console.warn('SOL subscription failed:', err);
    }
  }, [connection, dispatch]);

  /**
   * Subscribe to NRJ ATA (Associated Token Account) changes.
   * This fires when anyone sends NRJ tokens to this wallet.
   */
  const subscribeNRJ = useCallback(async (address: string, mintAddress: string) => {
    if (nrjSubRef.current !== null) return; // already subscribed
    try {
      const walletPubkey = new PublicKey(address);
      const mintPubkey = new PublicKey(mintAddress);
      const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey);

      nrjSubRef.current = connection.onAccountChange(
        ata,
        () => {
          // When ATA data changes, re-fetch the token balance
          dispatch(fetchNRJBalance({ address, mintAddress }));
          toast.success('NRJ balance updated!', {
            id: 'nrj-ws-update', icon: '🪙', duration: 3000,
          });
        },
        'confirmed'
      );
    } catch (err) {
      console.warn('NRJ subscription failed (ATA may not exist yet):', err);
    }
  }, [connection, dispatch]);

  /**
   * Set up subscriptions whenever the wallet connects or mint changes
   */
  const setupSubscriptions = useCallback(async (address: string) => {
    clearSubscriptions();
    subscribeSol(address);
    const mintAddress = getNRJMint();
    if (mintAddress) await subscribeNRJ(address, mintAddress);
  }, [clearSubscriptions, subscribeSol, subscribeNRJ, getNRJMint]);

  /**
   * Main wallet connect/disconnect effect
   */
  useEffect(() => {
    const address = wallet.publicKey?.toString() || null;

    // ── Connected ──
    if (wallet.connected && address && address !== prevAddressRef.current) {
      prevAddressRef.current = address;
      dispatch(setConnected({ address }));

      // Fetch initial balances
      dispatch(fetchSolBalance(address));
      const mintAddress = getNRJMint();
      if (mintAddress) {
        dispatch(fetchNRJBalance({ address, mintAddress }));
        dispatch(fetchNRJTokenInfo(mintAddress));
      }

      dispatch(fetchTransactions({ walletAddress: address }));

      // WebSocket subscriptions (real-time)
      setupSubscriptions(address);

      // Fallback polling (catches edge cases where WS might miss events)
      refreshIntervalRef.current = setInterval(refreshBalances, BALANCE_REFRESH_INTERVAL);

      toast.success(`Wallet connected: ${address.slice(0, 8)}...`, { icon: '🔗' });
    }

    // ── Disconnected ──
    if (!wallet.connected && prevAddressRef.current) {
      prevAddressRef.current = null;
      dispatch(setDisconnected());
      dispatch(clearTransactions());
      clearSubscriptions();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      toast('Wallet disconnected', { icon: '👋' });
    }
  }, [wallet.connected, wallet.publicKey, dispatch, refreshBalances, getNRJMint, setupSubscriptions, clearSubscriptions]);

  /**
   * Re-subscribe to NRJ ATA whenever the mint address becomes known
   * (e.g. after createNRJToken — the ATA might not have existed before)
   */
  useEffect(() => {
    const mintAddress = getNRJMint();
    if (!mintAddress || !wallet.publicKey || !wallet.connected) return;

    const address = wallet.publicKey.toString();
    dispatch(fetchNRJBalance({ address, mintAddress }));
    dispatch(fetchNRJTokenInfo(mintAddress));

    // Re-subscribe with the new mint (clears old sub automatically)
    if (nrjSubRef.current === null) {
      subscribeNRJ(address, mintAddress);
    }
  }, [
    tokenState.nrjToken?.mint,
    wallet.publicKey,
    wallet.connected,
    dispatch,
    getNRJMint,
    subscribeNRJ,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSubscriptions();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [clearSubscriptions]);

  return {
    wallet,
    connection,
    walletState,
    refreshBalances,
    isConnected: walletState.connected,
    address: walletState.address,
    solBalance: walletState.balance,
    nrjBalance: walletState.nrjBalance,
    isLoading: walletState.isLoading,
  };
}
