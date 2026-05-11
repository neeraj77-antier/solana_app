'use client';
// NOTE: This is a .ts file — no JSX allowed. Toast messages use plain strings.

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useAppDispatch } from '@/store';
import { addTransaction } from '@/store/transactionsSlice';
import { fetchSolBalance, fetchNRJBalance } from '@/store/walletSlice';
import { transferSol } from '@/services/solana/transfer';
import { transferSPLToken, mintNRJTokens } from '@/services/solana/token';
import { isValidSolanaAddress } from '@/lib/utils';
import toast from 'react-hot-toast';
import { getSolscanTxUrl } from '@/constants';

interface TransferSolHookState {
  isLoading: boolean;
  signature: string | null;
  error: string | null;
}

interface TransferTokenHookState {
  isLoading: boolean;
  signature: string | null;
  error: string | null;
}

/**
 * Hook for SOL transfers
 */
export function useSolTransfer() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const dispatch = useAppDispatch();

  const [state, setState] = useState<TransferSolHookState>({
    isLoading: false,
    signature: null,
    error: null,
  });

  const sendSol = useCallback(
    async (toAddress: string, amount: number, memo?: string) => {
      if (!wallet.publicKey || !wallet.connected) {
        toast.error('Please connect your wallet first');
        return null;
      }

      if (!isValidSolanaAddress(toAddress)) {
        toast.error('Invalid recipient address');
        return null;
      }

      if (amount <= 0) {
        toast.error('Amount must be greater than 0');
        return null;
      }

      setState({ isLoading: true, signature: null, error: null });

      const toastId = toast.loading('Sending SOL transaction...');

      try {
        const fromAddress = wallet.publicKey.toString();
        const result = await transferSol(
          {
            fromAddress,
            toAddress,
            amountSol: amount,
            memo,
            wallet,
          },
          connection
        );

        setState({
          isLoading: false,
          signature: result.signature,
          error: null,
        });

        // Add to transaction history
        dispatch(
          addTransaction({
            signature: result.signature,
            type: 'SOL_TRANSFER',
            amount,
            fromAddress,
            toAddress,
            status: 'CONFIRMED',
            blockTime: Math.floor(Date.now() / 1000),
            fee: result.fee,
          })
        );

        // Refresh balance
        dispatch(fetchSolBalance(fromAddress));

        toast.dismiss(toastId);
        toast.success(
          `SOL Sent! View: ${getSolscanTxUrl(result.signature)}`,
          { duration: 8000 }
        );

        return result.signature;
      } catch (error) {
        const errorMsg = (error as Error).message || 'Transaction failed';
        setState({ isLoading: false, signature: null, error: errorMsg });
        toast.dismiss(toastId);
        toast.error(`Failed: ${errorMsg.slice(0, 100)}`);
        return null;
      }
    },
    [wallet, connection, dispatch]
  );

  return { ...state, sendSol };
}

/**
 * Hook for SPL Token transfers
 */
export function useTokenTransfer() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const dispatch = useAppDispatch();

  const [state, setState] = useState<TransferTokenHookState>({
    isLoading: false,
    signature: null,
    error: null,
  });

  const sendToken = useCallback(
    async (toAddress: string, amount: number, mintAddress: string, decimals = 9) => {
      if (!wallet.publicKey || !wallet.connected) {
        toast.error('Please connect your wallet first');
        return null;
      }

      if (!isValidSolanaAddress(toAddress)) {
        toast.error('Invalid recipient address');
        return null;
      }

      setState({ isLoading: true, signature: null, error: null });
      const toastId = toast.loading('Sending NRJ tokens...');

      try {
        const fromAddress = wallet.publicKey.toString();
        const signature = await transferSPLToken(
          {
            fromAddress,
            toAddress,
            mintAddress,
            amount,
            decimals,
            wallet,
          },
          connection
        );

        setState({ isLoading: false, signature, error: null });

        dispatch(
          addTransaction({
            signature,
            type: 'TOKEN_TRANSFER',
            amount,
            tokenMint: mintAddress,
            fromAddress,
            toAddress,
            status: 'CONFIRMED',
            blockTime: Math.floor(Date.now() / 1000),
          })
        );

        // Refresh balances after transfer
        dispatch(fetchSolBalance(fromAddress));
        dispatch(fetchNRJBalance({ address: fromAddress, mintAddress }));

        toast.dismiss(toastId);
        toast.success(
          `NRJ Tokens Sent! 🚀 View: ${getSolscanTxUrl(signature)}`,
          { duration: 8000 }
        );

        return signature;
      } catch (error) {
        const errorMsg = (error as Error).message || 'Transfer failed';
        setState({ isLoading: false, signature: null, error: errorMsg });
        toast.dismiss(toastId);
        toast.error(`Failed: ${errorMsg.slice(0, 100)}`);
        return null;
      }
    },
    [wallet, connection, dispatch]
  );

  const mintTokens = useCallback(
    async (mintAddress: string, recipientAddress: string, amount: number) => {
      if (!wallet.publicKey || !wallet.connected) {
        toast.error('Please connect your wallet first');
        return null;
      }

      setState({ isLoading: true, signature: null, error: null });
      const toastId = toast.loading('Minting NRJ tokens...');

      try {
        const walletAddress = wallet.publicKey.toString();

        const signature = await mintNRJTokens(
          { mintAddress, recipientAddress, amount, wallet },
          connection
        );

        setState({ isLoading: false, signature, error: null });

        dispatch(
          addTransaction({
            signature,
            type: 'TOKEN_MINT',
            amount,
            tokenMint: mintAddress,
            fromAddress: walletAddress,
            toAddress: recipientAddress,
            status: 'CONFIRMED',
            blockTime: Math.floor(Date.now() / 1000),
          })
        );

        // ✅ Refresh BOTH balances immediately after a successful mint
        // SOL drops slightly (gas fee), NRJ balance increases
        dispatch(fetchSolBalance(walletAddress));
        dispatch(fetchNRJBalance({ address: recipientAddress, mintAddress }));
        // Also refresh sender's NRJ if minting to a different recipient
        if (recipientAddress !== walletAddress) {
          dispatch(fetchNRJBalance({ address: walletAddress, mintAddress }));
        }

        toast.dismiss(toastId);
        toast.success('Tokens minted successfully! 🎉 Balance updated.', { duration: 5000 });
        return signature;
      } catch (error) {
        const errorMsg = (error as Error).message || 'Minting failed';
        setState({ isLoading: false, signature: null, error: errorMsg });
        toast.dismiss(toastId);
        toast.error(`Mint failed: ${errorMsg.slice(0, 100)}`);
        return null;
      }
    },
    [wallet, connection, dispatch]
  );

  return { ...state, sendToken, mintTokens };
}
