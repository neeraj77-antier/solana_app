/**
 * Solana Balance Service
 * Handles SOL and SPL Token balance queries
 */
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { getConnection } from './connection';

/**
 * Fetch SOL balance for a wallet address
 * @returns Balance in SOL (not lamports)
 */
export async function getSolBalance(
  walletAddress: string,
  connection?: Connection
): Promise<number> {
  try {
    const conn = connection || getConnection();
    const publicKey = new PublicKey(walletAddress);
    const balanceLamports = await conn.getBalance(publicKey);
    return balanceLamports / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    throw new Error(`Failed to fetch SOL balance: ${error}`);
  }
}

/**
 * Fetch SPL Token balance for a specific mint
 * @returns Token balance (adjusted for decimals)
 */
export async function getTokenBalance(
  walletAddress: string,
  mintAddress: string,
  connection?: Connection
): Promise<number> {
  try {
    const conn = connection || getConnection();
    const walletPublicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(mintAddress);

    // Get the associated token account address
    const ata = await getAssociatedTokenAddress(mintPublicKey, walletPublicKey);

    try {
      const tokenAccountInfo = await conn.getTokenAccountBalance(ata);
      return tokenAccountInfo.value.uiAmount || 0;
    } catch {
      // Token account doesn't exist yet
      return 0;
    }
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}

/**
 * Fetch all token accounts for a wallet
 */
export async function getAllTokenAccounts(
  walletAddress: string,
  connection?: Connection
) {
  try {
    const conn = connection || getConnection();
    const walletPublicKey = new PublicKey(walletAddress);

    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    return tokenAccounts.value.map((account) => {
      const info = account.account.data.parsed.info;
      return {
        mint: info.mint,
        address: account.pubkey.toString(),
        balance: info.tokenAmount.uiAmount || 0,
        decimals: info.tokenAmount.decimals,
        rawAmount: info.tokenAmount.amount,
      };
    });
  } catch (error) {
    console.error('Error fetching token accounts:', error);
    return [];
  }
}

/**
 * Request a SOL airdrop (Devnet only)
 */
export async function requestAirdrop(
  walletAddress: string,
  amountSol = 1,
  connection?: Connection
): Promise<string> {
  try {
    const conn = connection || getConnection();
    const publicKey = new PublicKey(walletAddress);
    const signature = await conn.requestAirdrop(
      publicKey,
      amountSol * LAMPORTS_PER_SOL
    );

    // Confirm the airdrop
    const latestBlockhash = await conn.getLatestBlockhash();
    await conn.confirmTransaction({
      signature,
      ...latestBlockhash,
    });

    return signature;
  } catch (error) {
    console.error('Error requesting airdrop:', error);
    throw new Error(`Airdrop failed: ${error}`);
  }
}
