import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Transaction, TransactionState } from '@/types';
import { getWalletTransactions } from '@/services/solana/transactions';
import { ITEMS_PER_PAGE } from '@/constants';

const initialState: TransactionState = {
  transactions: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
};

// Async thunk to fetch transactions
export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async (
    { walletAddress, limit = ITEMS_PER_PAGE, before }: 
    { walletAddress: string; limit?: number; before?: string },
    { rejectWithValue }
  ) => {
    try {
      const transactions = await getWalletTransactions({
        walletAddress,
        limit,
        before,
      });
      return transactions;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      // Add to front of list
      state.transactions.unshift(action.payload);
      state.total += 1;
    },
    updateTransaction: (state, action: PayloadAction<Partial<Transaction> & { signature: string }>) => {
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
        state.transactions = action.payload;
        state.total = action.payload.length;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  addTransaction,
  updateTransaction,
  setPage,
  clearTransactions,
  setError,
} = transactionsSlice.actions;

export default transactionsSlice.reducer;
