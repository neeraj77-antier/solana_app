/**
 * Solana Connection Service
 * Provides singleton connection management for Solana RPC
 */
import { Connection, clusterApiUrl, Commitment } from '@solana/web3.js';
import { SOLANA_NETWORK, SOLANA_RPC_URL, COMMITMENT_LEVEL } from '@/constants';

let connection: Connection | null = null;

/**
 * Get or create a singleton Solana connection
 */
export function getConnection(commitment: Commitment = COMMITMENT_LEVEL): Connection {
  if (!connection) {
    const endpoint = SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);
    connection = new Connection(endpoint, {
      commitment,
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return connection;
}

/**
 * Create a new connection (for cases where fresh connection is needed)
 */
export function createConnection(
  rpcUrl?: string,
  commitment: Commitment = COMMITMENT_LEVEL
): Connection {
  const endpoint = rpcUrl || SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);
  return new Connection(endpoint, {
    commitment,
    confirmTransactionInitialTimeout: 60000,
  });
}

export default getConnection;
