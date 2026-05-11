'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendTokenSchema, SendTokenFormValues } from '@/lib/validations';
import { useTokenTransfer } from '@/hooks/useTransfer';
import { useAppSelector } from '@/store';
import { getSolscanTxUrl, NRJ_TOKEN_NAME, NRJ_TOKEN_SYMBOL, NRJ_TOKEN_DECIMALS } from '@/constants';
import { Send, AlertCircle, CheckCircle2, ExternalLink, Loader2, Coins } from 'lucide-react';

const CARD: React.CSSProperties = {
  background: '#13133a', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 28,
};
const INPUT: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '12px 16px', color: '#f1f5f9', fontSize: 14,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8,
};

export function SendTokenForm() {
  const { isLoading, signature, sendToken } = useTokenTransfer();
  const walletState = useAppSelector((s) => s.wallet);
  const tokenState = useAppSelector((s) => s.tokens);
  const nrjMint = tokenState.nrjToken?.mint || '';

  const { register, handleSubmit, formState: { errors, isValid }, watch, reset } = useForm<SendTokenFormValues>({
    resolver: zodResolver(sendTokenSchema),
    defaultValues: { tokenMint: nrjMint },
    mode: 'onChange',
  });
  const amount = watch('amount');

  const onSubmit = async (data: SendTokenFormValues) => {
    if (!walletState.connected || !nrjMint) return;
    const sig = await sendToken(data.recipientAddress, data.amount, nrjMint, NRJ_TOKEN_DECIMALS);
    if (sig) reset({ tokenMint: nrjMint });
  };

  if (!walletState.connected) {
    return (
      <div style={{ ...CARD, textAlign: 'center', padding: 48 }}>
        <Coins size={40} color="#334155" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, color: '#475569' }}>Connect your wallet to send NRJ tokens</p>
      </div>
    );
  }

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
        }}>
          <Coins size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>
            Send {NRJ_TOKEN_SYMBOL} Tokens
          </h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Transfer {NRJ_TOKEN_NAME} tokens</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>
            {walletState.nrjBalance >= 1000 ? walletState.nrjBalance.toLocaleString() : walletState.nrjBalance.toFixed(4)} NRJ
          </p>
          <p style={{ fontSize: 11, color: '#475569' }}>Available</p>
        </div>
      </div>

      {/* NRJ token banner */}
      {tokenState.nrjToken && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 14, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            fontSize: 11, fontWeight: 800, color: 'white',
          }}>NRJ</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{NRJ_TOKEN_NAME}</p>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tokenState.nrjToken.mint ? `${tokenState.nrjToken.mint.slice(0, 14)}...${tokenState.nrjToken.mint.slice(-8)}` : '—'}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>
              {walletState.nrjBalance >= 1000 ? walletState.nrjBalance.toLocaleString() : walletState.nrjBalance.toFixed(4)}
            </p>
            <p style={{ fontSize: 11, color: '#64748b' }}>NRJ</p>
          </div>
        </div>
      )}

      {/* No mint warning */}
      {!nrjMint && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 14, padding: '14px 18px', marginBottom: 20,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 3 }}>No NRJ Token Found</p>
            <p style={{ fontSize: 12, color: '#64748b' }}>Create the NRJ token first from the Token Management section.</p>
          </div>
        </div>
      )}

      <input type="hidden" {...register('tokenMint')} />

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Recipient */}
        <div>
          <label style={LABEL}>Recipient Address</label>
          <input
            {...register('recipientAddress')}
            style={{ ...INPUT, fontFamily: 'monospace', borderColor: errors.recipientAddress ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
            placeholder="Enter recipient Solana wallet address"
            onFocus={e => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.12)'; }}
            onBlur={e => { e.target.style.borderColor = errors.recipientAddress ? '#ef4444' : 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
          />
          {errors.recipientAddress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <AlertCircle size={13} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.recipientAddress.message}</span>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label style={LABEL}>Amount (NRJ)</label>
          <div style={{ position: 'relative' }}>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number" step="any" min="0"
              style={{ ...INPUT, paddingRight: 60, borderColor: errors.amount ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
              placeholder="0.0"
              onFocus={e => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = errors.amount ? '#ef4444' : 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
            <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
              NRJ
            </span>
          </div>
          {errors.amount && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{errors.amount.message}</p>}
          {amount > walletState.nrjBalance && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <AlertCircle size={13} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444' }}>Insufficient NRJ balance</span>
            </div>
          )}
        </div>

        {/* Success */}
        {signature && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>Tokens Sent Successfully!</span>
            </div>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', wordBreak: 'break-all', marginBottom: 10 }}>{signature}</p>
            <a href={getSolscanTxUrl(signature)} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#60a5fa' }}>
              <ExternalLink size={13} /> View on Solscan
            </a>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !isValid || !nrjMint || !walletState.connected}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px 24px', borderRadius: 14, cursor: isLoading ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none',
            color: 'white', fontSize: 15, fontWeight: 700, width: '100%',
            boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
            opacity: (isLoading || !isValid || !nrjMint) ? 0.5 : 1,
          }}
        >
          {isLoading
            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
            : <><Send size={18} /> Send {NRJ_TOKEN_SYMBOL} Tokens</>
          }
        </button>
      </form>
    </div>
  );
}
