'use client';

import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import { SOLANA_NETWORK, SOLANA_RPC_URL } from '@/constants';

// Import Solana Wallet Adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Map string network to WalletAdapterNetwork enum
  const network = useMemo(() => {
    switch (SOLANA_NETWORK) {
      case 'mainnet-beta':
        return WalletAdapterNetwork.Mainnet;
      case 'testnet':
        return WalletAdapterNetwork.Testnet;
      default:
        return WalletAdapterNetwork.Devnet;
    }
  }, []);

  // Use custom RPC or default cluster URL
  const endpoint = useMemo(
    () => SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  );

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [network]
  );

  return (
    <Provider store={store}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 5000,
                style: {
                  background: '#1a1a2e',
                  color: '#e2e8f0',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(20px)',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#1a1a2e',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#1a1a2e',
                  },
                },
              }}
            />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </Provider>
  );
}
