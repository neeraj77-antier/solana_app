import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import walletReducer from './walletSlice';
import transactionsReducer from './transactionsSlice';
import tokenReducer from './tokenSlice';
import { NRJ_TOKEN_NAME, NRJ_TOKEN_SYMBOL, NRJ_TOKEN_DECIMALS } from '@/constants';

/**
 * Preload NRJ mint from localStorage synchronously at store init time.
 * This eliminates the race condition where wallet.connect fires before
 * the page.tsx useEffect has dispatched setNRJMint.
 */
function getPreloadedTokenState() {
  if (typeof window === 'undefined') return undefined;
  const savedMint = localStorage.getItem('nrj_token_mint');
  if (!savedMint) return undefined;
  return {
    tokens: [],
    nrjToken: {
      mint: savedMint,
      name: NRJ_TOKEN_NAME,
      symbol: NRJ_TOKEN_SYMBOL,
      decimals: NRJ_TOKEN_DECIMALS,
      balance: 0,
    },
    isLoading: false,
    error: null,
    isMinting: false,
  };
}

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    transactions: transactionsReducer,
    tokens: tokenReducer,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preloadedState: getPreloadedTokenState() ? { tokens: getPreloadedTokenState() as any } : undefined,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['wallet/setConnected'],
        ignoredPaths: ['wallet.publicKey'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for Redux
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
