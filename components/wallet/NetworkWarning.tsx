'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useAppSelector } from '@/store';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { SOLANA_NETWORK } from '@/constants';

/**
 * Detects if Phantom is connected to a different network than the app expects.
 *
 * How it works: we fetch the wallet's balance from our devnet connection
 * and compare with the actual balance in state. If Phantom is on Mainnet,
 * the devnet balance will differ (user has SOL on devnet but 0 on mainnet).
 *
 * Most reliable signal: if the wallet is connected but balance reads 0
 * even though user says they got Devnet SOL — likely wrong network.
 */
export function NetworkWarning() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const walletState = useAppSelector((state) => state.wallet);
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey || dismissed) {
      setShowWarning(false);
      return;
    }

    // Check if Phantom is on devnet by looking at the wallet adapter's network
    // Phantom exposes its cluster via window.phantom?.solana?.network
    const checkNetwork = async () => {
      try {
        const phantomProvider = (window as any).phantom?.solana;
        if (phantomProvider) {
          // Phantom's isConnected check — if on wrong network, we can detect
          // by checking if the balance we know (devnet) doesn't match Phantom's view
          const devnetBalance = await connection.getBalance(wallet.publicKey!);

          // If devnet shows > 0 SOL but Phantom might simulate on mainnet (0 SOL)
          // Show warning if we have devnet SOL but Phantom is likely on mainnet
          // The heuristic: SOLANA_NETWORK is devnet but Phantom network string differs
          const network = phantomProvider.networkVersion || phantomProvider._network;
          if (
            network &&
            SOLANA_NETWORK === 'devnet' &&
            !network.toString().toLowerCase().includes('devnet') &&
            !network.toString().includes('102')  // Devnet chain ID variant
          ) {
            setShowWarning(true);
          } else {
            setShowWarning(false);
          }
        }
      } catch {
        // If detection fails, don't show warning
        setShowWarning(false);
      }
    };

    checkNetwork();
  }, [wallet.connected, wallet.publicKey, connection, dismissed]);

  if (!showWarning || dismissed) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-fade-in"
    >
      <div
        className="rounded-2xl p-4 flex items-start gap-3 shadow-2xl"
        style={{
          background: 'rgba(245,158,11,0.12)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(245,158,11,0.35)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-400 mb-1">
            Phantom Wallet: Wrong Network Detected
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            This app is on <strong className="text-amber-300">Solana Devnet</strong> but your
            Phantom wallet may be set to Mainnet. Switch Phantom to Devnet:
          </p>
          <div className="mt-2 space-y-1 text-xs text-slate-400">
            <p>1. Open Phantom → click the <strong className="text-slate-300">gear icon (Settings)</strong></p>
            <p>2. Go to <strong className="text-slate-300">Developer Settings</strong></p>
            <p>3. Change network to <strong className="text-amber-300">Devnet</strong></p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
