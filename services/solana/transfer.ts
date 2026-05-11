/**
 * SOL Transfer Service
 * Handles SOL transfer transactions with retry logic
 */
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { getConnection } from './connection';
import { MAX_RETRIES, RETRY_DELAY_MS } from '@/constants';
import { sleep } from '@/lib/utils';

export interface TransferSolParams {
  fromAddress: string;
  toAddress: string;
  amountSol: number;
  memo?: string;
  wallet: WalletContextState;
}

export interface TransferResult {
  signature: string;
  slot?: number;
  fee?: number;
}

/**
 * Transfer SOL from one wallet to another
 * Uses Wallet Adapter for signing (never touches private keys)
 */
export async function transferSol(
  params: TransferSolParams,
  connection?: Connection
): Promise<TransferResult> {
  const { fromAddress, toAddress, amountSol, memo, wallet } = params;
  const conn = connection || getConnection();

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const fromPublicKey = new PublicKey(fromAddress);
  const toPublicKey = new PublicKey(toAddress);
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  // Build the transaction
  const transaction = new Transaction();

  // Add SOL transfer instruction
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: toPublicKey,
      lamports,
    })
  );

  // Add optional memo instruction
  if (memo) {
    transaction.add(
      new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(memo, 'utf-8'),
      })
    );
  }

  // Get latest blockhash for transaction validity
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPublicKey;

  // Estimate fee before sending
  const feeCalculator = await conn.getFeeForMessage(
    transaction.compileMessage(),
    'confirmed'
  );
  const estimatedFee = feeCalculator.value ?? 5000;

  // Send transaction via wallet adapter (user signs in Phantom)
  // skipPreflight: true bypasses Phantom's own simulation (which may use Mainnet)
  const signature = await wallet.sendTransaction(transaction, conn, {
    skipPreflight: true,
    preflightCommitment: 'confirmed',
  });

  // Confirm transaction with retry logic
  let confirmed = false;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await conn.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (result.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
      }

      confirmed = true;
      break;
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  if (!confirmed) {
    throw new Error('Transaction confirmation timeout');
  }

  // Fetch transaction details for fee info
  const txDetails = await conn.getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  return {
    signature,
    slot: txDetails?.slot,
    fee: txDetails?.meta?.fee ? txDetails.meta.fee / LAMPORTS_PER_SOL : estimatedFee / LAMPORTS_PER_SOL,
  };
}

/**
 * Estimate the fee for a SOL transfer
 */
export async function estimateSolTransferFee(
  fromAddress: string,
  toAddress: string,
  connection?: Connection
): Promise<number> {
  try {
    const conn = connection || getConnection();
    const fromPublicKey = new PublicKey(fromAddress);
    const toPublicKey = new PublicKey(toAddress);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: LAMPORTS_PER_SOL, // 1 SOL dummy
      })
    );

    const { blockhash } = await conn.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPublicKey;

    const feeInfo = await conn.getFeeForMessage(
      transaction.compileMessage(),
      'confirmed'
    );

    return (feeInfo.value ?? 5000) / LAMPORTS_PER_SOL;
  } catch {
    return 0.000005; // Default 5000 lamports fee
  }
}
