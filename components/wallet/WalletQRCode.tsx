'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { useAppSelector } from '@/store';
import { copyToClipboard } from '@/lib/utils';
import { QrCode, Copy, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

export function WalletQRCode() {
  const walletState = useAppSelector((state) => state.wallet);
  const [show, setShow] = useState(false);

  if (!walletState.connected || !walletState.address) {
    return (
      <div style={{
        background: '#13133a', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20, padding: 24, display: 'flex',
        alignItems: 'center', justifyContent: 'center', minHeight: 160,
      }}>
        <p style={{ fontSize: 13, color: '#475569' }}>Connect wallet to receive funds</p>
      </div>
    );
  }

  const handleCopy = async () => {
    await copyToClipboard(walletState.address!);
    toast.success('Address copied!');
  };

  return (
    <div style={{
      background: '#13133a', border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 20, padding: 24, height: '100%',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          }}>
            <QrCode size={20} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>Receive Funds</h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>Share your wallet address</p>
          </div>
        </div>
        <button
          onClick={() => setShow(!show)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
            color: '#06b6d4', fontSize: 12, fontWeight: 700,
          }}
        >
          {show ? 'Hide' : 'Show QR'}
          <ChevronDown size={13} style={{ transform: show ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
      </div>

      {/* Address row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderRadius: 12, marginBottom: show ? 20 : 0,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <p style={{
          fontSize: 12, fontFamily: 'monospace', color: '#94a3b8',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {walletState.address}
        </p>
        <button
          onClick={handleCopy}
          title="Copy address"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 8, cursor: 'pointer', flexShrink: 0,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <Copy size={13} color="#818cf8" />
        </button>
      </div>

      {/* QR Code */}
      {show && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 16, borderRadius: 16, background: 'white', display: 'inline-flex' }}>
            <QRCode value={walletState.address} size={160} />
          </div>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 20px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
              color: '#06b6d4', fontSize: 13, fontWeight: 600,
            }}
          >
            <Copy size={14} />
            Copy Address
          </button>
        </div>
      )}
    </div>
  );
}
