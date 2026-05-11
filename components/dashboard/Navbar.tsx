'use client';

import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useAppSelector } from '@/store';
import { useWalletIntegration } from '@/hooks/useWalletIntegration';
import { copyToClipboard, shortenAddress } from '@/lib/utils';
import { Wallet, Copy, LogOut, ChevronDown, Zap } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { SOLANA_NETWORK } from '@/constants';

export function Navbar() {
  const { setVisible } = useWalletModal();
  const wallet = useWallet();
  const walletState = useAppSelector((state) => state.wallet);
  const [open, setOpen] = useState(false);

  const handleCopy = async () => {
    if (walletState.address) {
      await copyToClipboard(walletState.address);
      toast.success('Address copied!');
      setOpen(false);
    }
  };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      backgroundColor: 'rgba(8,8,28,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.09)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
            }}>
              <Zap size={18} color="white" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                Neeraj Pay
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.3)', textTransform: 'capitalize',
              }}>
                {SOLANA_NETWORK}
              </span>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {walletState.connected ? (
              <>
                {/* Balance pills */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  background: '#0f0f2a', border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  <div style={{ padding: '8px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>SOL</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', fontVariantNumeric: 'tabular-nums' }}>
                      {walletState.balance.toFixed(4)}
                    </div>
                  </div>
                  <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ padding: '8px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>NRJ</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                      {walletState.nrjBalance >= 1000 ? walletState.nrjBalance.toLocaleString() : walletState.nrjBalance.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Wallet dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpen(!open)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                      color: '#c7d2fe', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    }} />
                    <span style={{ fontFamily: 'monospace' }}>{shortenAddress(walletState.address!, 4)}</span>
                    <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                  </button>

                  {open && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
                      <div style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                        width: 240, borderRadius: 16, overflow: 'hidden', zIndex: 50,
                        background: '#0f0f2a', border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                      }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Connected as</div>
                          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', wordBreak: 'break-all', lineHeight: 1.5 }}>
                            {walletState.address}
                          </div>
                        </div>
                        <div style={{ padding: 6 }}>
                          {[
                            { icon: Copy, label: 'Copy Address', color: '#94a3b8', onClick: handleCopy },
                            { icon: LogOut, label: 'Disconnect', color: '#ef4444', onClick: () => { wallet.disconnect(); setOpen(false); } },
                          ].map(({ icon: Icon, label, color, onClick }) => (
                            <button
                              key={label} onClick={onClick}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                                background: 'transparent', border: 'none', color, fontSize: 13,
                                fontWeight: 500, textAlign: 'left', transition: '0.15s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Icon size={15} />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setVisible(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 12, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none', color: 'white', fontSize: 14, fontWeight: 700,
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                }}
              >
                <Wallet size={16} />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
