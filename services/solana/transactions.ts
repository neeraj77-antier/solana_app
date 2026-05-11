/**
 * Transaction History Service
 * Fetches and parses transaction history from Solana
 */
import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getConnection } from './connection';
import { Transaction } from '@/types';

export interface FetchTransactionsParams {
  walletAddress: string;
  limit?: number;
  before?: string;
  connection?: Connection;
}

/**
 * Fetch recent transaction signatures for a wallet
 */
export async function getTransactionSignatures(
  params: FetchTransactionsParams
): Promise<ConfirmedSignatureInfo[]> {
  const { walletAddress, limit = 20, before } = params;
  const conn = params.connection || getConnection();

  try {
    const publicKey = new PublicKey(walletAddress);
    const signatures = await conn.getSignaturesForAddress(publicKey, {
      limit,
      before,
    });
    return signatures;
  } catch (error) {
    console.error('Error fetching signatures:', error);
    return [];
  }
}

/**
 * Parse a single transaction into our Transaction type
 */
function parseTransaction(
  tx: ParsedTransactionWithMeta | null,
  signature: string,
  walletAddress: string
): Transaction | null {
  if (!tx || !tx.meta) return null;

  const accountKeys = tx.transaction.message.accountKeys;
  const walletPubkey = walletAddress.toLowerCase();

  // Determine if this is a SOL transfer
  const preBalances = tx.meta.preBalances;
  const postBalances = tx.meta.postBalances;

  // Find wallet index in accounts
  const walletIndex = accountKeys.findIndex(
    (key) => key.pubkey.toString().toLowerCase() === walletPubkey
  );

  if (walletIndex === -1) return null;

  const balanceDiff = postBalances[walletIndex] - preBalances[walletIndex];
  const isReceiving = balanceDiff > 0;

  // Determine transaction type
  let txType: Transaction['type'] = 'SOL_TRANSFER';
  let amount = Math.abs(balanceDiff) / LAMPORTS_PER_SOL;
  let fromAddress = '';
  let toAddress = '';

  // Check for token transfers in inner instructions
  const tokenBalances = tx.meta.postTokenBalances || [];
  const preTokenBalances = tx.meta.preTokenBalances || [];

  if (tokenBalances.length > 0 || preTokenBalances.length > 0) {
    txType = 'TOKEN_TRANSFER';
    // Calculate token amount from balance changes
    const tokenDiff = tokenBalances.find(
      (b) => b.owner === walletAddress
    );
    if (tokenDiff) {
      amount = tokenDiff.uiTokenAmount.uiAmount || 0;
    }
  }

  // Extract from/to addresses for SOL transfer
  if (txType === 'SOL_TRANSFER') {
    const fromIndex = preBalances.findIndex(
      (_, i) => preBalances[i] - postBalances[i] > 0 && i !== walletIndex
    );
    const toIndex = postBalances.findIndex(
      (_, i) => postBalances[i] - preBalances[i] > 0 && i !== walletIndex
    );

    fromAddress = isReceiving
      ? accountKeys[fromIndex >= 0 ? fromIndex : 0]?.pubkey.toString() || ''
      : walletAddress;
    toAddress = isReceiving
      ? walletAddress
      : accountKeys[toIndex >= 0 ? toIndex : 1]?.pubkey.toString() || '';
  }

  return {
    signature,
    type: txType,
    amount,
    fromAddress: fromAddress || accountKeys[0]?.pubkey.toString() || '',
    toAddress: toAddress || accountKeys[1]?.pubkey.toString() || '',
    status: tx.meta.err ? 'FAILED' : 'CONFIRMED',
    blockTime: tx.blockTime || undefined,
    slot: tx.slot,
    fee: tx.meta.fee / LAMPORTS_PER_SOL,
  };
}

/**
 * Fetch and parse recent transactions for a wallet
 */
export async function getWalletTransactions(
  params: FetchTransactionsParams
): Promise<Transaction[]> {
  const { walletAddress, limit = 20, before } = params;
  const conn = params.connection || getConnection();

  try {
    // Get signatures
    const signatures = await getTransactionSignatures(params);

    if (signatures.length === 0) return [];

    // Fetch full transaction details in batches
    const batchSize = 10;
    const transactions: Transaction[] = [];

    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const txDetails = await conn.getParsedTransactions(
        batch.map((s) => s.signature),
        {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        }
      );

      for (let j = 0; j < txDetails.length; j++) {
        const parsed = parseTransaction(
          txDetails[j],
          batch[j].signature,
          walletAddress
        );
        if (parsed) transactions.push(parsed);
      }
    }

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Fetch network status info
 */
export async function getNetworkStatus(connection?: Connection) {
  try {
    const conn = connection || getConnection();
    const [epochInfo, perfSamples, slot] = await Promise.all([
      conn.getEpochInfo(),
      conn.getRecentPerformanceSamples(1),
      conn.getSlot(),
    ]);

    const tps =
      perfSamples.length > 0
        ? Math.round(
            perfSamples[0].numTransactions / perfSamples[0].samplePeriodSecs
          )
        : 0;

    return {
      isOnline: true,
      tps,
      slot,
      epoch: epochInfo.epoch,
      blockTime: Date.now(),
    };
  } catch (error) {
    return {
      isOnline: false,
      tps: 0,
      slot: 0,
      epoch: 0,
      blockTime: 0,
    };
  }
}
