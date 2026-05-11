'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendSolSchema, SendSolFormValues } from '@/lib/validations';
import { useSolTransfer } from '@/hooks/useTransfer';
import { useAppSelector } from '@/store';
import { getSolscanTxUrl } from '@/constants';
import { Send, AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';

const CARD: React.CSSProperties = {
  background: '#13133a', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 28,
};
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8,
};
const INPUT: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '13px 16px', color: '#f1f5f9', fontSize: 14,
  fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
};
const INPUT_ERR: React.CSSProperties = { ...INPUT, borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' };

export function SendSolForm() {
  const { isLoading, signature, sendSol } = useSolTransfer();
  const walletState = useAppSelector((s) => s.wallet);
  const estimatedFee = 0.000005;

  const { register, handleSubmit, formState: { errors, isValid }, watch, reset } = useForm<SendSolFormValues>({
    resolver: zodResolver(sendSolSchema), mode: 'onChange',
  });
  const amount = watch('amount');

  const onSubmit = async (data: SendSolFormValues) => {
    if (!walletState.connected) return;
    const sig = await sendSol(data.recipientAddress, data.amount, data.memo);
    if (sig) reset();
  };

  if (!walletState.connected) {
    return (
      <div style={{ ...CARD, textAlign: 'center', padding: 48 }}>
        <Send size={40} color="#334155" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, color: '#475569' }}>Connect your wallet to send SOL</p>
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
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
        }}>
          <Send size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>Send SOL</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Transfer SOL to any Solana wallet</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>
            {walletState.balance.toFixed(6)} SOL
          </p>
          <p style={{ fontSize: 11, color: '#475569' }}>Available</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Recipient */}
        <div>
          <label style={LABEL}>Recipient Address</label>
          <input
            {...register('recipientAddress')}
            style={errors.recipientAddress ? INPUT_ERR : INPUT}
            placeholder="Enter Solana wallet address"
            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
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
          <label style={LABEL}>Amount (SOL)</label>
          <div style={{ position: 'relative' }}>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number" step="any" min="0"
              style={{ ...(errors.amount ? INPUT_ERR : INPUT), paddingRight: 60 }}
              placeholder="0.0"
              onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
            <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#818cf8' }}>SOL</span>
          </div>
          {errors.amount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <AlertCircle size={13} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.amount.message}</span>
            </div>
          )}
          {amount > walletState.balance && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <AlertCircle size={13} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444' }}>Insufficient balance</span>
            </div>
          )}
        </div>

        {/* Memo */}
        <div>
          <label style={LABEL}>Memo <span style={{ color: '#475569', fontWeight: 400 }}>(optional)</span></label>
          <input
            {...register('memo')}
            style={INPUT}
            placeholder="Add a note to this transaction"
            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Summary */}
        {amount > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px' }}>
            {[
              { label: 'Send Amount', value: `${amount} SOL` },
              { label: 'Est. Network Fee', value: `~${estimatedFee} SOL` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>Total</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>{(amount + estimatedFee).toFixed(9)} SOL</span>
            </div>
          </div>
        )}

        {/* Success */}
        {signature && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>Transaction Confirmed!</span>
            </div>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', wordBreak: 'break-all', marginBottom: 10 }}>{signature}</p>
            <a href={getSolscanTxUrl(signature)} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>
              <ExternalLink size={13} /> View on Solscan
            </a>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !isValid || !walletState.connected}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px 24px', borderRadius: 14, cursor: isLoading ? 'not-allowed' : 'pointer',
            background: isLoading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', color: 'white', fontSize: 15, fontWeight: 700,
            boxShadow: '0 4px 20px rgba(99,102,241,0.3)', opacity: (!isValid || !walletState.connected) ? 0.5 : 1,
            width: '100%',
          }}
        >
          {isLoading
            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
            : <><Send size={18} /> Send SOL</>
          }
        </button>

        <p style={{ fontSize: 12, color: '#334155', textAlign: 'center' }}>
          You&apos;re on Solana Devnet. Use Devnet SOL from faucet.solana.com
        </p>
      </form>
    </div>
  );
}
