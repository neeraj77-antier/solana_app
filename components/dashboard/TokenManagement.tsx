'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mintTokenSchema, MintTokenFormValues } from '@/lib/validations';
import { useTokenTransfer } from '@/hooks/useTransfer';
import { useAppSelector, useAppDispatch } from '@/store';
import { setNRJMint } from '@/store/tokenSlice';
import { createNRJToken } from '@/services/solana/token';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { NRJ_TOKEN_NAME, NRJ_TOKEN_SYMBOL, NRJ_TOKEN_DECIMALS, getSolscanTxUrl } from '@/constants';
import { copyToClipboard } from '@/lib/utils';
import { Zap, Plus, AlertCircle, CheckCircle2, ExternalLink, Loader2, Copy, Settings, Coins } from 'lucide-react';
import toast from 'react-hot-toast';

const CARD: React.CSSProperties = {
  background: '#13133a', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 24,
};
const INPUT: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '12px 16px', color: '#f1f5f9', fontSize: 14,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8,
};

export function TokenManagement() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const dispatch = useAppDispatch();
  const walletState = useAppSelector((s) => s.wallet);
  const tokenState = useAppSelector((s) => s.tokens);
  const { mintTokens, isLoading: isMintLoading } = useTokenTransfer();

  const [isCreating, setIsCreating] = useState(false);
  const [createSig, setCreateSig] = useState<string | null>(null);
  const [mintSig, setMintSig] = useState<string | null>(null);
  const [tab, setTab] = useState<'info' | 'mint'>('info');

  const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm<MintTokenFormValues>({
    resolver: zodResolver(mintTokenSchema), mode: 'onChange',
  });

  const handleCreate = async () => {
    if (!walletState.connected) { toast.error('Connect your wallet first'); return; }
    setIsCreating(true);
    const toastId = toast.loading('Creating NRJ Token on Devnet...');
    try {
      const result = await createNRJToken(wallet, connection);
      dispatch(setNRJMint(result.mintAddress));
      localStorage.setItem('nrj_token_mint', result.mintAddress);
      setCreateSig(result.signature);
      toast.dismiss(toastId);
      toast.success(`NRJ Token created! Mint: ${result.mintAddress.slice(0, 8)}...`, { duration: 8000 });
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(`Failed: ${(err as Error).message.slice(0, 100)}`);
    } finally {
      setIsCreating(false);
    }
  };

  const onMint = async (data: MintTokenFormValues) => {
    if (!tokenState.nrjToken?.mint) { toast.error('Create the NRJ token first'); return; }
    const recipient = data.recipientAddress || walletState.address;
    if (!recipient) return;
    const sig = await mintTokens(tokenState.nrjToken.mint, recipient, data.amount);
    if (sig) { setMintSig(sig); reset(); }
  };

  if (!walletState.connected) {
    return (
      <div style={{ ...CARD, textAlign: 'center', padding: 48 }}>
        <Settings size={44} color="#334155" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, color: '#475569' }}>Connect your wallet to manage NRJ tokens</p>
      </div>
    );
  }

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
        }}>
          <Zap size={22} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>Token Management</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Create and manage NRJ tokens</p>
        </div>
      </div>

      {/* NRJ Token Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08))',
        border: '1px solid rgba(139,92,246,0.25)', borderRadius: 16, padding: '18px 20px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokenState.nrjToken?.mint ? 14 : 0, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              fontSize: 12, fontWeight: 800, color: 'white',
            }}>NRJ</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{NRJ_TOKEN_NAME}</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>Symbol: {NRJ_TOKEN_SYMBOL} · Decimals: {NRJ_TOKEN_DECIMALS}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Your Balance</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa' }}>{walletState.nrjBalance.toFixed(4)} <span style={{ fontSize: 13 }}>NRJ</span></p>
          </div>
        </div>

        {tokenState.nrjToken?.mint ? (
          <div>
            <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Token Mint Address</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tokenState.nrjToken.mint}
              </p>
              <button
                onClick={() => { copyToClipboard(tokenState.nrjToken!.mint); toast.success('Copied!'); }}
                style={{ display: 'flex', padding: 6, borderRadius: 8, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
              >
                <Copy size={13} color="#64748b" />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={15} color="#f59e0b" />
            <p style={{ fontSize: 13, color: '#f59e0b' }}>Token not yet created. Click Create below.</p>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div style={{
        display: 'flex', gap: 6, padding: 6, borderRadius: 16, marginBottom: 20,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {(['info', 'mint'] as const).map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
              background: tab === t ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
              color: tab === t ? 'white' : '#64748b',
              border: tab === t ? 'none' : '1px solid transparent',
              boxShadow: tab === t ? '0 4px 12px rgba(139,92,246,0.3)' : 'none',
            }}
          >
            {t === 'info' ? 'Create Token' : 'Mint Tokens'}
          </button>
        ))}
      </div>

      {/* Create Token Tab */}
      {tab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Token details */}
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { label: 'Token Name', value: NRJ_TOKEN_NAME },
              { label: 'Symbol',     value: NRJ_TOKEN_SYMBOL },
              { label: 'Decimals',   value: String(NRJ_TOKEN_DECIMALS) },
              { label: 'Standard',   value: 'SPL Token (Solana)' },
              { label: 'Network',    value: 'Solana Devnet' },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
              }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Devnet warning */}
          <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10 }}>
            <AlertCircle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              <strong style={{ color: '#f59e0b' }}>Phantom must be on Devnet.</strong>{' '}
              Phantom → Settings → Developer Settings → Network → Devnet.
              Getting "insufficient SOL"? That means Phantom is on Mainnet.
            </p>
          </div>

          {createSig && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircle2 size={16} color="#22c55e" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>Token Created!</span>
              </div>
              <a href={getSolscanTxUrl(createSig)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#60a5fa' }}>
                <ExternalLink size={13} /> View on Solscan
              </a>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={isCreating || !!tokenState.nrjToken?.mint}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 24px', borderRadius: 14, cursor: isCreating ? 'not-allowed' : 'pointer',
              background: tokenState.nrjToken?.mint ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              border: tokenState.nrjToken?.mint ? '1px solid rgba(34,197,94,0.3)' : 'none',
              color: tokenState.nrjToken?.mint ? '#22c55e' : 'white',
              fontSize: 15, fontWeight: 700, width: '100%',
              boxShadow: tokenState.nrjToken?.mint ? 'none' : '0 4px 20px rgba(139,92,246,0.3)',
              opacity: isCreating ? 0.6 : 1,
            }}
          >
            {isCreating
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Creating Token...</>
              : tokenState.nrjToken?.mint
              ? <><CheckCircle2 size={18} /> Token Already Created</>
              : <><Plus size={18} /> Create NRJ Token</>
            }
          </button>
        </div>
      )}

      {/* Mint Tokens Tab */}
      {tab === 'mint' && (
        <form onSubmit={handleSubmit(onMint)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!tokenState.nrjToken?.mint && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 10 }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#ef4444' }}>Create the NRJ token first from the "Create Token" tab.</p>
            </div>
          )}

          {/* SOL balance indicator */}
          <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Phantom must be set to <strong style={{ color: '#f59e0b' }}>Devnet</strong></span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: walletState.balance > 0.01 ? '#22c55e' : '#ef4444' }}>
                {walletState.balance.toFixed(6)} SOL
              </span>
            </div>
          </div>

          <div>
            <label style={LABEL}>Mint Amount (NRJ)</label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number" step="any" min="0"
              style={{ ...INPUT, borderColor: errors.amount ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
              placeholder="Amount to mint (e.g. 1000000)"
              onFocus={e => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = errors.amount ? '#ef4444' : 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
            {errors.amount && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{errors.amount.message}</p>}
          </div>

          <div>
            <label style={LABEL}>Recipient <span style={{ color: '#475569', fontWeight: 400 }}>(defaults to your wallet)</span></label>
            <input
              {...register('recipientAddress')}
              style={{ ...INPUT, fontFamily: 'monospace', borderColor: errors.recipientAddress ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
              placeholder={walletState.address || 'Your wallet address'}
              onFocus={e => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {mintSig && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircle2 size={16} color="#22c55e" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>Tokens Minted! 🎉</span>
              </div>
              <a href={getSolscanTxUrl(mintSig)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#60a5fa' }}>
                <ExternalLink size={13} /> View on Solscan
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={isMintLoading || !isValid || !tokenState.nrjToken?.mint}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 24px', borderRadius: 14, cursor: isMintLoading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none',
              color: 'white', fontSize: 15, fontWeight: 700, width: '100%',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
              opacity: (isMintLoading || !isValid || !tokenState.nrjToken?.mint) ? 0.5 : 1,
            }}
          >
            {isMintLoading
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Minting...</>
              : <><Coins size={18} /> Mint NRJ Tokens</>
            }
          </button>
        </form>
      )}
    </div>
  );
}
