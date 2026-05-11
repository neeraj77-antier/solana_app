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
import toast from 'react-hot-toast';

/**
 * Custom hook for wallet integration
 * Bridges Solana Wallet Adapter with Redux store
 */
export function useWalletIntegration() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const dispatch = useAppDispatch();
  const walletState = useAppSelector((state) => state.wallet);
  const prevAddressRef = useRef<string | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Also watch the Redux token store so refreshBalances can react to newly-created mints
  const tokenState = useAppSelector((state) => state.tokens);

  /**
   * Get the active NRJ mint address from (in priority order):
   * 1. Redux token store (set after createNRJToken)
   * 2. localStorage (persisted across page reloads)
   * 3. NEXT_PUBLIC_NRJ_TOKEN_MINT env var
   */
  const getNRJMint = useCallback((): string | null => {
    if (tokenState.nrjToken?.mint) return tokenState.nrjToken.mint;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nrj_token_mint') : null;
    if (saved) return saved;
    if (NRJ_TOKEN_MINT) return NRJ_TOKEN_MINT;
    return null;
  }, [tokenState.nrjToken?.mint]);

  /**
   * Refresh all balances — always uses the most current mint address
   */
  const refreshBalances = useCallback(async () => {
    if (!wallet.publicKey) return;
    const address = wallet.publicKey.toString();

    dispatch(fetchSolBalance(address));

    const mintAddress = getNRJMint();
    if (mintAddress) {
      dispatch(fetchNRJBalance({ address, mintAddress }));
    }
  }, [wallet.publicKey, dispatch, getNRJMint]);

  /**
   * Handle wallet connection
   */
  useEffect(() => {
    const address = wallet.publicKey?.toString() || null;

    // Wallet connected
    if (wallet.connected && address && address !== prevAddressRef.current) {
      prevAddressRef.current = address;
      dispatch(setConnected({ address }));

      // Fetch SOL balance
      dispatch(fetchSolBalance(address));

      // Fetch NRJ balance using whichever mint we know about
      const mintAddress = getNRJMint();
      if (mintAddress) {
        dispatch(fetchNRJBalance({ address, mintAddress }));
        dispatch(fetchNRJTokenInfo(mintAddress));
      }

      // Fetch transaction history
      dispatch(fetchTransactions({ walletAddress: address }));

      toast.success(`Wallet connected: ${address.slice(0, 8)}...`, {
        icon: '🔗',
      });

      // Start balance refresh interval
      refreshIntervalRef.current = setInterval(refreshBalances, BALANCE_REFRESH_INTERVAL);
    }

    // Wallet disconnected
    if (!wallet.connected && prevAddressRef.current) {
      prevAddressRef.current = null;
      dispatch(setDisconnected());
      dispatch(clearTransactions());

      // Clear interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      toast('Wallet disconnected', { icon: '👋' });
    }
  }, [wallet.connected, wallet.publicKey, dispatch, refreshBalances]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  /**
   * KEY FIX: When the NRJ mint becomes available (either from token creation
   * or from localStorage restore on page load), immediately fetch the NRJ balance.
   * This is the reactive trigger that runs AFTER mint tokens succeeds.
   */
  useEffect(() => {
    const mintAddress = getNRJMint();
    if (!mintAddress || !wallet.publicKey || !wallet.connected) return;

    const address = wallet.publicKey.toString();
    dispatch(fetchNRJBalance({ address, mintAddress }));
    dispatch(fetchNRJTokenInfo(mintAddress));
  }, [
    // Re-run whenever mint address changes (e.g. after createNRJToken sets it)
    tokenState.nrjToken?.mint,
    wallet.publicKey,
    wallet.connected,
    dispatch,
    getNRJMint,
  ]);

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
