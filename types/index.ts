// Wallet Types
export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  nrjBalance: number;
  isLoading: boolean;
  error: string | null;
}

// Transaction Types
export interface Transaction {
  id?: string;
  signature: string;
  type: 'SOL_TRANSFER' | 'TOKEN_TRANSFER' | 'TOKEN_MINT' | 'TOKEN_CREATE';
  amount: number;
  tokenMint?: string;
  fromAddress: string;
  toAddress: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  blockTime?: number;
  slot?: number;
  fee?: number;
  memo?: string;
  createdAt?: string;
}

export interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
}

// Token Types
export interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  supply?: number;
}

export interface TokenState {
  tokens: TokenInfo[];
  nrjToken: TokenInfo | null;
  isLoading: boolean;
  error: string | null;
  isMinting: boolean;
}

// Form Types
export interface SendSolForm {
  recipientAddress: string;
  amount: number;
  memo?: string;
}

export interface SendTokenForm {
  recipientAddress: string;
  amount: number;
  tokenMint: string;
}

export interface MintTokenForm {
  amount: number;
  recipientAddress?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Network Status
export interface NetworkStatus {
  isOnline: boolean;
  tps: number;
  slot: number;
  epoch: number;
  blockTime: number;
}

// Chart Data
export interface ChartDataPoint {
  date: string;
  amount: number;
  type?: string;
}

// Notification Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  txSignature?: string;
  duration?: number;
}
