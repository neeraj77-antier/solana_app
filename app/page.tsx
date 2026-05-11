'use client';

import { useState } from 'react';
import { Navbar } from '@/components/dashboard/Navbar';
import { WalletOverview } from '@/components/dashboard/WalletOverview';
import { SendSolForm } from '@/components/forms/SendSolForm';
import { SendTokenForm } from '@/components/forms/SendTokenForm';
import { TransactionHistory } from '@/components/dashboard/TransactionHistory';
import { TokenManagement } from '@/components/dashboard/TokenManagement';
import { NetworkStatus } from '@/components/dashboard/NetworkStatus';
import { TransactionChart } from '@/components/dashboard/TransactionChart';
import { WalletQRCode } from '@/components/wallet/WalletQRCode';
import { WalletWatcher } from '@/components/wallet/WalletWatcher';
import { NetworkWarning } from '@/components/wallet/NetworkWarning';
import { TokenFlowGuide } from '@/components/dashboard/TokenFlowGuide';
import { LayoutDashboard, Send, Coins, History, Settings, Activity } from 'lucide-react';

type Tab = 'overview' | 'send-sol' | 'send-nrj' | 'history' | 'tokens' | 'network';

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'overview', label: 'Overview',  icon: LayoutDashboard, color: '#6366f1' },
  { id: 'send-sol', label: 'Send SOL',  icon: Send,            color: '#22c55e' },
  { id: 'send-nrj', label: 'Send NRJ',  icon: Coins,           color: '#f59e0b' },
  { id: 'history',  label: 'History',   icon: History,         color: '#06b6d4' },
  { id: 'tokens',   label: 'Tokens',    icon: Settings,        color: '#8b5cf6' },
  { id: 'network',  label: 'Network',   icon: Activity,        color: '#22c55e' },
]; 

export default function DashboardPage() {
  const [active, setActive] = useState<Tab>('overview');

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 10 }}>
      <WalletWatcher />
      <NetworkWarning />
      <Navbar />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Tab Bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: 6, borderRadius: 20, marginBottom: 32,
          background: '#0d0d28', border: '1px solid rgba(255,255,255,0.08)',
          overflowX: 'auto',
        }}>
          {TABS.map(({ id, label, icon: Icon, color }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 14, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13, fontWeight: 600,
                  transition: 'all 0.18s ease',
                  background: isActive ? `${color}18` : 'transparent',
                  color: isActive ? color : '#64748b',
                  border: isActive ? `1px solid ${color}30` : '1px solid transparent',
                  boxShadow: isActive ? `0 2px 12px ${color}18` : 'none',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {active === 'overview' && (
            <>
              <WalletOverview />
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                <TransactionChart />
                <WalletQRCode />
              </div>
              <NetworkStatus />
              <TokenFlowGuide />
            </>
          )}

          {active === 'send-sol' && (
            <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
              <SendSolForm />
            </div>
          )}

          {active === 'send-nrj' && (
            <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
              <SendTokenForm />
            </div>
          )}

          {active === 'history' && <TransactionHistory />}

          {active === 'tokens' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <TokenManagement />
              <TokenFlowGuide />
            </div>
          )}

          {active === 'network' && <NetworkStatus />}

        </div>
      </main>

      <footer style={{
        marginTop: 64, padding: '32px 24px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{ fontSize: 13, color: '#334155' }}>
          Neeraj Pay — Solana Devnet — Built with ❤️
        </p>
        <p style={{ fontSize: 12, color: '#1e293b', marginTop: 4 }}>
          Your keys are never exposed. All transactions are signed via Phantom Wallet.
        </p>
      </footer>
    </div>
  );
}
