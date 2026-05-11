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
 * Parse a single transaction into our Transaction type.
 * Returns a best-effort result — never returns null for confirmed txs.
 */
function parseTransaction(
  tx: ParsedTransactionWithMeta | null,
  signature: string,
  walletAddress: string
): Transaction | null {
  if (!tx || !tx.meta) return null;

  const accountKeys = tx.transaction.message.accountKeys;
  const walletPubkeyLower = walletAddress.toLowerCase();

  // Find wallet index in accounts
  const walletIndex = accountKeys.findIndex(
    (key) => key.pubkey.toString().toLowerCase() === walletPubkeyLower
  );

  // If wallet isn't in the accounts at all, skip
  if (walletIndex === -1) return null;

  const preBalances = tx.meta.preBalances;
  const postBalances = tx.meta.postBalances;
  const balanceDiff = postBalances[walletIndex] - preBalances[walletIndex];
  const isReceiving = balanceDiff > 0;

  // Detect token transactions
  const postTokenBals = tx.meta.postTokenBalances || [];
  const preTokenBals  = tx.meta.preTokenBalances  || [];
  const hasTokenActivity = postTokenBals.length > 0 || preTokenBals.length > 0;

  let txType: Transaction['type'] = 'SOL_TRANSFER';
  let amount = Math.abs(balanceDiff) / LAMPORTS_PER_SOL;
  let tokenMint: string | undefined;

  if (hasTokenActivity) {
    // Try to figure out if this is a mint or a transfer
    const isMint = preTokenBals.length === 0 && postTokenBals.length > 0;
    txType = isMint ? 'TOKEN_MINT' : 'TOKEN_TRANSFER';

    // Find token amount change for this wallet
    const relevant =
      postTokenBals.find((b) => b.owner === walletAddress) ||
      preTokenBals.find((b)  => b.owner === walletAddress);

    if (relevant) {
      const pre  = preTokenBals.find((b)  => b.accountIndex === relevant.accountIndex);
      const post = postTokenBals.find((b) => b.accountIndex === relevant.accountIndex);
      const preAmt  = pre?.uiTokenAmount.uiAmount  || 0;
      const postAmt = post?.uiTokenAmount.uiAmount || 0;
      amount = Math.abs(postAmt - preAmt);
      tokenMint = relevant.mint;
    }
  }

  // Derive from/to addresses — best effort
  let fromAddress = accountKeys[0]?.pubkey.toString() || walletAddress;
  let toAddress   = accountKeys[1]?.pubkey.toString() || walletAddress;

  if (txType === 'SOL_TRANSFER') {
    if (isReceiving) {
      toAddress = walletAddress;
      // Find the sender (largest decrease)
      const senderIdx = preBalances
        .map((pre, i) => ({ diff: pre - postBalances[i], i }))
        .filter(({ i }) => i !== walletIndex)
        .sort((a, b) => b.diff - a.diff)[0]?.i;
      fromAddress = senderIdx !== undefined
        ? accountKeys[senderIdx].pubkey.toString()
        : accountKeys[0].pubkey.toString();
    } else {
      fromAddress = walletAddress;
      // Find the receiver (largest increase)
      const receiverIdx = postBalances
        .map((post, i) => ({ diff: post - preBalances[i], i }))
        .filter(({ i }) => i !== walletIndex)
        .sort((a, b) => b.diff - a.diff)[0]?.i;
      toAddress = receiverIdx !== undefined
        ? accountKeys[receiverIdx].pubkey.toString()
        : accountKeys[1]?.pubkey.toString() || walletAddress;
    }
  }

  // Skip zero-amount, zero-diff transactions (e.g. vote txs) that aren't relevant
  if (amount === 0 && txType === 'SOL_TRANSFER') return null;

  return {
    signature,
    type: txType,
    amount,
    tokenMint,
    fromAddress,
    toAddress,
    status: tx.meta.err ? 'FAILED' : 'CONFIRMED',
    blockTime: tx.blockTime || undefined,
    slot: tx.slot,
    fee: (tx.meta.fee || 0) / LAMPORTS_PER_SOL,
  };
}

/**
 * Fetch and parse recent transactions for a wallet
 */
export async function getWalletTransactions(
  params: FetchTransactionsParams
): Promise<Transaction[]> {
  const { walletAddress, limit = 50, before } = params;
  const conn = params.connection || getConnection();

  try {
    const signatures = await getTransactionSignatures({ ...params, limit });
    if (signatures.length === 0) return [];

    const batchSize = 10;
    const transactions: Transaction[] = [];

    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const txDetails = await conn.getParsedTransactions(
        batch.map((s) => s.signature),
        { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }
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
