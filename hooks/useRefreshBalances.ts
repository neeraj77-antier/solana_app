'use client';

import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchSolBalance, fetchNRJBalance } from '@/store/walletSlice';

/**
 * Lightweight hook — only fetches balances.
 * Use this in display components instead of the full useWalletIntegration
 * to avoid creating duplicate polling intervals and WebSocket subscriptions.
 */
export function useRefreshBalances() {
  const wallet = useWallet();
  const dispatch = useAppDispatch();
  const tokenState = useAppSelector((s) => s.tokens);
  const walletState = useAppSelector((s) => s.wallet);

  const refreshBalances = useCallback(async () => {
    if (!wallet.publicKey) return;
    const address = wallet.publicKey.toString();

    dispatch(fetchSolBalance(address));

    const mintAddress =
      tokenState.nrjToken?.mint ||
      (typeof window !== 'undefined' ? localStorage.getItem('nrj_token_mint') : null);

    if (mintAddress) {
      dispatch(fetchNRJBalance({ address, mintAddress }));
    }
  }, [wallet.publicKey, dispatch, tokenState.nrjToken?.mint]);

  return { refreshBalances, walletState };
}
