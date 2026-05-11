'use client';

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppSelector } from '@/store';
import { BarChart2 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f0f2a', border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 12, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: '#64748b', marginBottom: 6 }}>{label}</p>
      {payload.map((e: any) => (
        <p key={e.name} style={{ color: e.color, fontWeight: 700 }}>
          {e.name}: {e.value.toFixed(4)}
        </p>
      ))}
    </div>
  );
};

export function TransactionChart() {
  const transactions = useAppSelector((s) => s.transactions.transactions);
  const walletState = useAppSelector((s) => s.wallet);

  const chartData = useMemo(() => {
    const days: Record<string, { sent: number; received: number; date: string }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days[key] = { sent: 0, received: 0, date: key };
    }
    transactions.forEach((tx) => {
      if (!tx.blockTime) return;
      const key = new Date(tx.blockTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (days[key]) {
        if (tx.fromAddress === walletState.address) days[key].sent += tx.amount;
        else days[key].received += tx.amount;
      }
    });
    return Object.values(days);
  }, [transactions, walletState.address]);

  return (
    <div style={{
      background: '#13133a', border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 20, padding: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 14, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        }}>
          <BarChart2 size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>Transaction Analytics</h2>
          <p style={{ fontSize: 12, color: '#64748b' }}>Last 7 days activity</p>
        </div>
        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {[{ color: '#6366f1', label: 'Sent' }, { color: '#22c55e', label: 'Received' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRecv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="sent"     name="Sent (SOL)"     stroke="#6366f1" fill="url(#gSent)" strokeWidth={2} />
            <Area type="monotone" dataKey="received" name="Received (SOL)" stroke="#22c55e" fill="url(#gRecv)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
