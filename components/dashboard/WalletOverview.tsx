'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletIntegration } from '@/hooks/useWalletIntegration';
import { Wallet, Coins, ArrowUpRight, ArrowDownLeft, RefreshCw, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { SOLANA_NETWORK } from '@/constants';
import toast from 'react-hot-toast';

const S = {
  card: (accentColor: string): React.CSSProperties => ({
    background: `linear-gradient(145deg, #13133a 0%, #0d0d28 100%)`,
    border: `1px solid ${accentColor}28`,
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }),
  cardAccent: (color: string): React.CSSProperties => ({
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)`,
  }),
  iconBox: (color: string): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `${color}18`, border: `1px solid ${color}30`,
    flexShrink: 0,
  }),
  badge: (color: string): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
    background: `${color}14`, color, border: `1px solid ${color}25`,
    letterSpacing: '0.02em',
  }),
};

function StatCard({
  label, value, unit, sub, icon: Icon, color,
}: {
  label: string; value: string; unit: string; sub: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div style={S.card(color)}>
      {/* Top color bar */}
      <div style={S.cardAccent(color)} />

      {/* Icon + badge row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={S.iconBox(color)}>
          <Icon size={20} color={color} />
        </div>
        <span style={S.badge(color)}>{sub}</span>
      </div>

      {/* Label */}
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: 8 }}>
        {label}
      </p>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{unit}</span>
      </div>
    </div>
  );
}

export function WalletOverview() {
  const { setVisible } = useWalletModal();
  const { refreshBalances } = useWalletIntegration();
  const walletState = useAppSelector((state) => state.wallet);
  const transactions = useAppSelector((state) => state.transactions.transactions);
  const [refreshing, setRefreshing] = useState(false);

  const sentCount = transactions.filter((t) => t.fromAddress === walletState.address).length;
  const receivedCount = transactions.filter((t) => t.toAddress === walletState.address).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalances();
    setTimeout(() => setRefreshing(false), 1200);
  };

  /* ── Not Connected ── */
  if (!walletState.connected) {
    return (
      <div style={{
        background: 'linear-gradient(145deg, #13133a, #0d0d28)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 24, padding: 64, textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: '0 auto 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
          border: '1px solid rgba(99,102,241,0.3)',
        }}>
          <Wallet size={36} color="#818cf8" />
        </div>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>Connect Your Wallet</h3>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32, maxWidth: 360, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Connect your Phantom wallet to view balances, send SOL, mint &amp; transfer NRJ tokens.
        </p>
        <button
          onClick={() => setVisible(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 14, cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none',
            color: 'white', fontSize: 15, fontWeight: 700,
            boxShadow: '0 6px 24px rgba(99,102,241,0.4)',
          }}
        >
          <Wallet size={18} />
          Connect Phantom Wallet
        </button>
        <p style={{ fontSize: 12, color: '#334155', marginTop: 16, textTransform: 'capitalize' }}>
          Solana {SOLANA_NETWORK}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Address Banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderRadius: 16, flexWrap: 'wrap', gap: 12,
        background: '#0d0d28', border: '1px solid rgba(255,255,255,0.09)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}>
            <Wallet size={17} color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
              Connected Wallet
            </p>
            <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {walletState.address}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={async () => { if (walletState.address) { await copyToClipboard(walletState.address); toast.success('Copied!'); } }}
            title="Copy address"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            <Copy size={14} color="#64748b" />
          </button>
          <button
            onClick={handleRefresh} disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
              color: '#818cf8', fontSize: 12, fontWeight: 700, opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 8px #22c55e',
            }} />
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Active</span>
          </div>
        </div>
      </div>

      {/* ── Stat Cards Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
      }}>
        <StatCard
          label="SOL Balance" value={walletState.balance.toFixed(4)}
          unit="SOL" sub="Devnet" icon={Wallet} color="#6366f1"
        />
        <StatCard
          label="NRJ Balance"
          value={walletState.nrjBalance >= 1000
            ? walletState.nrjBalance.toLocaleString()
            : walletState.nrjBalance.toFixed(2)}
          unit="NRJ" sub="Neeraj Token" icon={Coins} color="#f59e0b"
        />
        <StatCard
          label="Txns Sent" value={String(sentCount)}
          unit="txns" sub="Outgoing" icon={ArrowUpRight} color="#22c55e"
        />
        <StatCard
          label="Txns Received" value={String(receivedCount)}
          unit="txns" sub="Incoming" icon={ArrowDownLeft} color="#06b6d4"
        />
      </div>
    </div>
  );
}
