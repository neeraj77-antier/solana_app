/**
 * SPL Token Service
 * Handles NRJ token creation, minting, and transfers
 */
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  getMint,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { getConnection } from './connection';
import { NRJ_TOKEN_DECIMALS } from '@/constants';
import { sleep } from '@/lib/utils';
import { MAX_RETRIES, RETRY_DELAY_MS } from '@/constants';

export interface CreateTokenResult {
  mintAddress: string;
  signature: string;
}

export interface TransferTokenParams {
  fromAddress: string;
  toAddress: string;
  mintAddress: string;
  amount: number;
  decimals?: number;
  wallet: WalletContextState;
}

export interface MintTokenParams {
  mintAddress: string;
  recipientAddress: string;
  amount: number;
  wallet: WalletContextState;
}

/**
 * Create a new SPL Token (NRJ Token)
 * NOTE: In production, the mint authority would be a program or multisig.
 * For demo purposes, the connected wallet is the mint authority.
 */
export async function createNRJToken(
  wallet: WalletContextState,
  connection?: Connection
): Promise<CreateTokenResult> {
  const conn = connection || getConnection();

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const walletPublicKey = wallet.publicKey;

  // Generate a new keypair for the mint account
  const mintKeypair = Keypair.generate();

  // Calculate rent-exempt balance for mint account
  const rentLamports = await getMinimumBalanceForRentExemptMint(conn);

  const transaction = new Transaction().add(
    // Create the mint account
    SystemProgram.createAccount({
      fromPubkey: walletPublicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: rentLamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    // Initialize the mint with wallet as mint authority and freeze authority
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      NRJ_TOKEN_DECIMALS,
      walletPublicKey, // Mint authority
      walletPublicKey, // Freeze authority
      TOKEN_PROGRAM_ID
    )
  );

  // Get latest blockhash
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPublicKey;

  // Partial sign with mint keypair (mint account creation requires its signature)
  transaction.partialSign(mintKeypair);

  /**
   * IMPORTANT: skipPreflight: true bypasses Phantom's internal simulation
   * which runs against whichever network Phantom is set to.
   * If Phantom is on Mainnet but the app is on Devnet, the simulation
   * would fail with "insufficient SOL" even with 5 Devnet SOL.
   * We do our own validation before calling this, so skipping preflight is safe.
   * The transaction is still confirmed on-chain via confirmTransaction().
   */
  const signature = await wallet.sendTransaction(transaction, conn, {
    signers: [mintKeypair],
    skipPreflight: true,
    preflightCommitment: 'confirmed',
  });

  // Confirm transaction
  await conn.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return {
    mintAddress: mintKeypair.publicKey.toString(),
    signature,
  };
}

/**
 * Mint NRJ tokens to a wallet
 */
export async function mintNRJTokens(
  params: MintTokenParams,
  connection?: Connection
): Promise<string> {
  const { mintAddress, recipientAddress, amount, wallet } = params;
  const conn = connection || getConnection();

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const walletPublicKey = wallet.publicKey;
  const mintPublicKey = new PublicKey(mintAddress);
  const recipientPublicKey = new PublicKey(recipientAddress);

  // Get or create associated token account for recipient
  const recipientATA = await getAssociatedTokenAddress(
    mintPublicKey,
    recipientPublicKey
  );

  const transaction = new Transaction();

  // Check if ATA exists, create if not
  const ataInfo = await conn.getAccountInfo(recipientATA);
  if (!ataInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        walletPublicKey, // Payer
        recipientATA,
        recipientPublicKey,
        mintPublicKey
      )
    );
  }

  // Add mint instruction
  // Amount in raw units (multiply by 10^decimals)
  const rawAmount = BigInt(Math.floor(amount * Math.pow(10, NRJ_TOKEN_DECIMALS)));
  transaction.add(
    createMintToInstruction(
      mintPublicKey,
      recipientATA,
      walletPublicKey, // Mint authority
      rawAmount
    )
  );

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPublicKey;

  /**
   * IMPORTANT: skipPreflight: true bypasses Phantom's internal simulation.
   * Phantom simulates against its own configured network (e.g. Mainnet),
   * which causes "insufficient SOL" errors even when you have 5 Devnet SOL.
   * We still confirm on-chain via confirmTransaction(), so this is safe.
   */
  const signature = await wallet.sendTransaction(transaction, conn, {
    skipPreflight: true,
    preflightCommitment: 'confirmed',
  });
  await conn.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return signature;
}

/**
 * Transfer SPL tokens between wallets
 * Creates recipient's Associated Token Account if needed
 */
export async function transferSPLToken(
  params: TransferTokenParams,
  connection?: Connection
): Promise<string> {
  const { fromAddress, toAddress, mintAddress, amount, wallet } = params;
  const decimals = params.decimals ?? NRJ_TOKEN_DECIMALS;
  const conn = connection || getConnection();

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const walletPublicKey = wallet.publicKey;
  const fromPublicKey = new PublicKey(fromAddress);
  const toPublicKey = new PublicKey(toAddress);
  const mintPublicKey = new PublicKey(mintAddress);

  // Get source ATA
  const fromATA = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);

  // Get destination ATA
  const toATA = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

  const transaction = new Transaction();

  // Create destination ATA if it doesn't exist
  const toATAInfo = await conn.getAccountInfo(toATA);
  if (!toATAInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        walletPublicKey, // Payer
        toATA,
        toPublicKey,
        mintPublicKey
      )
    );
  }

  // Calculate raw amount
  const rawAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));

  // Add transfer instruction (using transferChecked for safety)
  transaction.add(
    createTransferCheckedInstruction(
      fromATA,       // Source
      mintPublicKey, // Mint
      toATA,         // Destination
      fromPublicKey, // Owner of source
      rawAmount,     // Amount
      decimals       // Mint decimals
    )
  );

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPublicKey;

  // Retry logic for sending
  let signature = '';
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      signature = await wallet.sendTransaction(transaction, conn, {
        skipPreflight: true,  // Bypass Phantom's mainnet simulation when on devnet
        preflightCommitment: 'confirmed',
      });

      await conn.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );
      break;
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  return signature;
}

/**
 * Get token mint info (supply, decimals, authority)
 */
export async function getTokenMintInfo(
  mintAddress: string,
  connection?: Connection
) {
  try {
    const conn = connection || getConnection();
    const mintPublicKey = new PublicKey(mintAddress);
    const mintInfo = await getMint(conn, mintPublicKey);

    return {
      address: mintAddress,
      supply: Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals),
      decimals: mintInfo.decimals,
      mintAuthority: mintInfo.mintAuthority?.toString(),
      freezeAuthority: mintInfo.freezeAuthority?.toString(),
      isInitialized: mintInfo.isInitialized,
    };
  } catch (error) {
    console.error('Error getting mint info:', error);
    return null;
  }
}
