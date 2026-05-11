// Solana Network Configuration
export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta' | 'testnet';
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// NRJ Token Configuration
export const NRJ_TOKEN_DECIMALS = 9;
export const NRJ_TOKEN_NAME = 'Neeraj Token';
export const NRJ_TOKEN_SYMBOL = 'NRJ';
export const NRJ_TOKEN_MINT = process.env.NEXT_PUBLIC_NRJ_TOKEN_MINT || '';

// App Configuration
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Neeraj Pay';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Solana Explorer URLs
export const SOLSCAN_BASE_URL = 'https://solscan.io';
export const SOLANA_EXPLORER_BASE_URL = 'https://explorer.solana.com';

export const getSolscanTxUrl = (signature: string) =>
  `${SOLSCAN_BASE_URL}/tx/${signature}?cluster=${SOLANA_NETWORK}`;

export const getSolscanAddressUrl = (address: string) =>
  `${SOLSCAN_BASE_URL}/address/${address}?cluster=${SOLANA_NETWORK}`;

// Transaction Configuration
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;
export const COMMITMENT_LEVEL = 'confirmed' as const;

// UI Configuration
export const ITEMS_PER_PAGE = 10;
export const BALANCE_REFRESH_INTERVAL = 30000; // 30 seconds
