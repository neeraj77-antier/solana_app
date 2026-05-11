import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Transaction, TransactionState } from '@/types';
import { getWalletTransactions } from '@/services/solana/transactions';
import { ITEMS_PER_PAGE } from '@/constants';

const STORAGE_KEY = 'nrj_txn_cache';
const MAX_CACHED = 100; // cap to avoid bloating localStorage

// ─── localStorage helpers ───────────────────────────────────────────────────

function loadCached(walletAddress: string): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${walletAddress}`);
    return raw ? (JSON.parse(raw) as Transaction[]) : [];
  } catch {
    return [];
  }
}

function saveCached(walletAddress: string, txns: Transaction[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${STORAGE_KEY}_${walletAddress}`,
      JSON.stringify(txns.slice(0, MAX_CACHED))
    );
  } catch {
    // quota exceeded — clear old and retry
    localStorage.removeItem(`${STORAGE_KEY}_${walletAddress}`);
  }
}

/** Merge fresh on-chain txns with cached ones, dedup by signature, newest first */
function merge(fresh: Transaction[], cached: Transaction[]): Transaction[] {
  const map = new Map<string, Transaction>();
  // cached first so fresh overwrites stale entries
  cached.forEach((t) => map.set(t.signature, t));
  fresh.forEach((t)  => map.set(t.signature, t));
  return Array.from(map.values()).sort(
    (a, b) => (b.blockTime || 0) - (a.blockTime || 0)
  );
}

// ─── Initial state ──────────────────────────────────────────────────────────

const initialState: TransactionState = {
  transactions: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
};

// ─── Async thunk ─────────────────────────────────────────────────────────────

export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async (
    { walletAddress, limit = ITEMS_PER_PAGE, before }:
    { walletAddress: string; limit?: number; before?: string },
    { rejectWithValue }
  ) => {
    try {
      // Fetch fresh from Solana
      const fresh = await getWalletTransactions({ walletAddress, limit, before });

      // Merge with any cached history so we never lose data
      const cached = loadCached(walletAddress);
      const merged = merge(fresh, cached);

      // Persist the merged result immediately
      saveCached(walletAddress, merged);

      return { merged, walletAddress };
    } catch (error) {
      // If Solana fetch fails, return cached data so history doesn't vanish
      const cached = loadCached(walletAddress);
      if (cached.length > 0) return { merged: cached, walletAddress };
      return rejectWithValue((error as Error).message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    /** Load cached txns for a wallet immediately (before Solana fetch completes) */
    loadCachedTransactions: (state, action: PayloadAction<string>) => {
      const cached = loadCached(action.payload);
      if (cached.length > 0) {
        state.transactions = cached;
        state.total = cached.length;
      }
    },

    addTransaction: (state, action: PayloadAction<Transaction & { walletAddress?: string }>) => {
      // Avoid duplicates
      const exists = state.transactions.some(
        (t) => t.signature === action.payload.signature
      );
      if (!exists) {
        state.transactions.unshift(action.payload);
        state.total += 1;

        // Persist immediately — use walletAddress hint or fall back to fromAddress
        const walletAddr = action.payload.walletAddress || action.payload.fromAddress;
        if (walletAddr) {
          saveCached(walletAddr, state.transactions.slice(0, MAX_CACHED));
        }
      }
    },

    updateTransaction: (
      state,
      action: PayloadAction<Partial<Transaction> & { signature: string }>
    ) => {
      const index = state.transactions.findIndex(
        (tx) => tx.signature === action.payload.signature
      );
      if (index !== -1) {
        state.transactions[index] = {
          ...state.transactions[index],
          ...action.payload,
        };
      }
    },

    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },

    clearTransactions: (state) => {
      state.transactions = [];
      state.total = 0;
      state.page = 1;
      // Note: we do NOT clear localStorage here — data persists across disconnect/reconnect
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.transactions = action.payload.merged;
          state.total = action.payload.merged.length;
        }
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Keep whatever transactions we already have in state
      });
  },
});

export const {
  loadCachedTransactions,
  addTransaction,
  updateTransaction,
  setPage,
  clearTransactions,
  setError,
} = transactionsSlice.actions;

export default transactionsSlice.reducer;
