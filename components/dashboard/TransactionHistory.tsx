'use client';

import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchTransactions, setPage } from '@/store/transactionsSlice';
import {
  History, Copy, ExternalLink, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownLeft, Coins, RefreshCw, Loader2,
} from 'lucide-react';
import { formatRelativeTime, copyToClipboard, shortenAddress } from '@/lib/utils';
import { getSolscanTxUrl, ITEMS_PER_PAGE } from '@/constants';
import { Transaction } from '@/types';
import toast from 'react-hot-toast';

const CARD: React.CSSProperties = {
  background: '#13133a', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 24,
};

function TxRow({ tx, walletAddress }: { tx: Transaction; walletAddress: string }) {
  const isOut = tx.fromAddress === walletAddress;
  const isToken = tx.type === 'TOKEN_TRANSFER' || tx.type === 'TOKEN_MINT';

  const statusColor = { CONFIRMED: '#22c55e', PENDING: '#f59e0b', FAILED: '#ef4444' }[tx.status];
  const typeMap = {
    SOL_TRANSFER:   { icon: isOut ? ArrowUpRight : ArrowDownLeft, label: isOut ? 'Sent SOL' : 'Received SOL', color: isOut ? '#ef4444' : '#22c55e' },
    TOKEN_TRANSFER: { icon: Coins, label: 'Token Transfer', color: '#f59e0b' },
    TOKEN_MINT:     { icon: Coins, label: 'Token Mint',     color: '#8b5cf6' },
    TOKEN_CREATE:   { icon: Coins, label: 'Token Created',  color: '#06b6d4' },
  }[tx.type];
  const Icon = typeMap.icon;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 16px', borderRadius: 14,
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${typeMap.color}15`, border: `1px solid ${typeMap.color}25`,
      }}>
        <Icon size={17} color={typeMap.color} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{typeMap.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: `${statusColor}14`, color: statusColor, border: `1px solid ${statusColor}25`,
          }}>
            {tx.status}
          </span>
        </div>
        <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b' }}>
          {shortenAddress(isOut ? tx.toAddress : tx.fromAddress, 8)}
        </p>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: typeMap.color }}>
          {isOut ? '-' : '+'}{tx.amount.toFixed(4)} {isToken ? 'NRJ' : 'SOL'}
        </p>
        <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
          {tx.blockTime ? formatRelativeTime(tx.blockTime) : 'Recent'}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          onClick={async () => { await copyToClipboard(tx.signature); toast.success('Copied!'); }}
          title="Copy signature"
          style={{ display: 'flex', padding: 6, borderRadius: 8, cursor: 'pointer', background: 'transparent', border: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Copy size={13} color="#64748b" />
        </button>
        <a
          href={getSolscanTxUrl(tx.signature)} target="_blank" rel="noopener noreferrer"
          title="View on Solscan"
          style={{ display: 'flex', padding: 6, borderRadius: 8 }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <ExternalLink size={13} color="#64748b" />
        </a>
      </div>
    </div>
  );
}

export function TransactionHistory() {
  const dispatch = useAppDispatch();
  const walletState = useAppSelector((s) => s.wallet);
  const { transactions, isLoading, total, page } = useAppSelector((s) => s.transactions);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const paged = transactions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const refresh = () => {
    if (walletState.address) dispatch(fetchTransactions({ walletAddress: walletState.address }));
  };

  if (!walletState.connected) {
    return (
      <div style={{ ...CARD, textAlign: 'center', padding: 48 }}>
        <History size={48} color="#334155" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, color: '#475569' }}>Connect your wallet to view transaction history</p>
      </div>
    );
  }

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          }}>
            <History size={20} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>Transaction History</h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>{total} transactions found</p>
          </div>
        </div>
        <button
          onClick={refresh} disabled={isLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8', fontSize: 13, fontWeight: 600, opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 68, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : paged.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <History size={52} color="#1e293b" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 6 }}>No transactions yet</p>
          <p style={{ fontSize: 13, color: '#334155' }}>Your transaction history will appear here</p>
        </div>
      ) : (
        <div>
          {paged.map((tx) => <TxRow key={tx.signature} tx={tx} walletAddress={walletState.address || ''} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Page {page} of {totalPages}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[
              { icon: ChevronLeft, action: () => dispatch(setPage(page - 1)), disabled: page === 1 },
              { icon: ChevronRight, action: () => dispatch(setPage(page + 1)), disabled: page === totalPages },
            ].map(({ icon: Icon, action, disabled }, i) => (
              <button
                key={i} onClick={action} disabled={disabled}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                <Icon size={16} color="#94a3b8" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
