'use client';

import { useEffect, useState } from 'react';
import { getNetworkStatus } from '@/services/solana/transactions';
import { SOLANA_NETWORK } from '@/constants';
import { Activity, Zap, Clock, Server, Globe } from 'lucide-react';

interface NetworkInfo {
  isOnline: boolean; tps: number; slot: number; epoch: number; blockTime: number;
}

const card: React.CSSProperties = {
  background: '#13133a', border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20, padding: 24,
};

export function NetworkStatus() {
  const [status, setStatus] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const data = await getNetworkStatus();
      setStatus(data); setLoading(false);
    };
    fetch();
    const iv = setInterval(fetch, 15000);
    return () => clearInterval(iv);
  }, []);

  const stats = status ? [
    { icon: Zap,    label: 'TPS',          value: status.tps.toLocaleString(),  sub: 'Transactions/sec', color: '#22c55e' },
    { icon: Server, label: 'Current Slot', value: status.slot.toLocaleString(), sub: 'Block height',      color: '#6366f1' },
    { icon: Clock,  label: 'Epoch',        value: status.epoch.toLocaleString(),sub: 'Current epoch',     color: '#f59e0b' },
    { icon: Globe,  label: 'Network',      value: SOLANA_NETWORK,               sub: 'Active cluster',    color: '#06b6d4' },
  ] : [];

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          }}>
            <Activity size={20} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>Network Status</h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>Real-time Solana network info</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: status?.isOnline ? '#22c55e' : '#ef4444',
            boxShadow: status?.isOnline ? '0 0 8px #22c55e' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: status?.isOnline ? '#22c55e' : '#ef4444' }}>
            {loading ? 'Checking...' : status?.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {loading
          ? [...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 90, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.5s infinite' }} />
            ))
          : stats.map(({ icon: Icon, label, value, sub, color }) => (
              <div key={label} style={{
                padding: '16px 18px', borderRadius: 16, textAlign: 'center',
                background: `${color}0d`, border: `1px solid ${color}25`,
              }}>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                  <Icon size={20} color={color} />
                </div>
                <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                  {label}
                </p>
                <p style={{ fontSize: 15, fontWeight: 800, color, textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
                  {value}
                </p>
                <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{sub}</p>
              </div>
            ))
        }
      </div>
    </div>
  );
}
