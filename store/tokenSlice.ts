import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TokenInfo, TokenState } from '@/types';
import { getTokenMintInfo } from '@/services/solana/token';
import { NRJ_TOKEN_MINT, NRJ_TOKEN_NAME, NRJ_TOKEN_SYMBOL, NRJ_TOKEN_DECIMALS } from '@/constants';

const initialState: TokenState = {
  tokens: [],
  nrjToken: null,
  isLoading: false,
  error: null,
  isMinting: false,
};

// Fetch NRJ token info
export const fetchNRJTokenInfo = createAsyncThunk(
  'tokens/fetchNRJ',
  async (mintAddress: string, { rejectWithValue }) => {
    try {
      const info = await getTokenMintInfo(mintAddress);
      if (!info) throw new Error('Token not found');
      return info;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const tokenSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    setNRJToken: (state, action: PayloadAction<TokenInfo>) => {
      state.nrjToken = action.payload;
    },
    setNRJMint: (state, action: PayloadAction<string>) => {
      state.nrjToken = {
        mint: action.payload,
        name: NRJ_TOKEN_NAME,
        symbol: NRJ_TOKEN_SYMBOL,
        decimals: NRJ_TOKEN_DECIMALS,
        balance: 0,
      };
    },
    updateNRJBalance: (state, action: PayloadAction<number>) => {
      if (state.nrjToken) {
        state.nrjToken.balance = action.payload;
      }
    },
    setIsMinting: (state, action: PayloadAction<boolean>) => {
      state.isMinting = action.payload;
    },
    addToken: (state, action: PayloadAction<TokenInfo>) => {
      const exists = state.tokens.find((t) => t.mint === action.payload.mint);
      if (!exists) {
        state.tokens.push(action.payload);
      }
    },
    clearTokens: (state) => {
      state.tokens = [];
      state.nrjToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNRJTokenInfo.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNRJTokenInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nrjToken = {
          mint: action.payload.address,
          name: NRJ_TOKEN_NAME,
          symbol: NRJ_TOKEN_SYMBOL,
          decimals: action.payload.decimals,
          balance: 0,
          supply: action.payload.supply,
        };
      })
      .addCase(fetchNRJTokenInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setNRJToken,
  setNRJMint,
  updateNRJBalance,
  setIsMinting,
  addToken,
  clearTokens,
} = tokenSlice.actions;

export default tokenSlice.reducer;
