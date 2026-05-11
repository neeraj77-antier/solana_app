import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { WalletState } from '@/types';
import { getSolBalance, getTokenBalance } from '@/services/solana/balance';

const initialState: WalletState = {
  connected: false,
  address: null,
  balance: 0,
  nrjBalance: 0,
  isLoading: false,
  error: null,
};

// Async thunk to fetch SOL balance
export const fetchSolBalance = createAsyncThunk(
  'wallet/fetchSolBalance',
  async (address: string, { rejectWithValue }) => {
    try {
      const balance = await getSolBalance(address);
      return balance;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Async thunk to fetch NRJ token balance
export const fetchNRJBalance = createAsyncThunk(
  'wallet/fetchNRJBalance',
  async (
    { address, mintAddress }: { address: string; mintAddress: string },
    { rejectWithValue }
  ) => {
    try {
      const balance = await getTokenBalance(address, mintAddress);
      return balance;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<{ address: string }>) => {
      state.connected = true;
      state.address = action.payload.address;
      state.error = null;
    },
    setDisconnected: (state) => {
      state.connected = false;
      state.address = null;
      state.balance = 0;
      state.nrjBalance = 0;
      state.error = null;
    },
    setSolBalance: (state, action: PayloadAction<number>) => {
      state.balance = action.payload;
    },
    setNRJBalance: (state, action: PayloadAction<number>) => {
      state.nrjBalance = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // SOL balance
    builder
      .addCase(fetchSolBalance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSolBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.balance = action.payload;
      })
      .addCase(fetchSolBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // NRJ balance
    builder
      .addCase(fetchNRJBalance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNRJBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nrjBalance = action.payload;
      })
      .addCase(fetchNRJBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setConnected,
  setDisconnected,
  setSolBalance,
  setNRJBalance,
  setError,
  clearError,
} = walletSlice.actions;

export default walletSlice.reducer;
