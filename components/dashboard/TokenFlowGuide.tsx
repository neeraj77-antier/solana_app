'use client';

import { useState } from 'react';
import { ChevronRight, Info, Wallet, Zap, Coins, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppSelector } from '@/store';

interface Step {
  number: number; title: string; description: string; detail: string;
  icon: React.ElementType; color: string;
}

function FlowStep({ step, isComplete, isCurrent }: { step: Step; isComplete: boolean; isCurrent: boolean }) {
  const [expanded, setExpanded] = useState(isCurrent);
  const { number, title, description, detail, icon: Icon, color } = step;

  const borderColor = isCurrent ? `${color}50` : isComplete ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)';
  const bg = isCurrent ? `${color}09` : isComplete ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)';
  const labelColor = isComplete ? '#22c55e' : isCurrent ? color : '#475569';

  return (
    <div style={{ border: `1px solid ${borderColor}`, background: bg, borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Step icon/status */}
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isComplete ? 'rgba(34,197,94,0.18)' : isCurrent ? `${color}1e` : 'rgba(255,255,255,0.06)',
          border: isComplete ? '1px solid rgba(34,197,94,0.4)' : isCurrent ? `1px solid ${color}44` : '1px solid rgba(255,255,255,0.1)',
        }}>
          {isComplete ? <CheckCircle2 size={18} color="#22c55e" /> : <Icon size={18} color={isCurrent ? color : '#475569'} />}
        </div>

        {/* Title area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor }}>
              Step {number}
            </span>
            {isCurrent && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${color}1e`, color }}>
                Current
              </span>
            )}
            {isComplete && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                Done
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{title}</p>
          <p style={{ fontSize: 12, color: '#64748b' }}>{description}</p>
        </div>

        <ChevronRight size={16} color="#475569" style={{ flexShrink: 0, transform: expanded ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
      </button>

      {expanded && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginTop: 12 }}>{detail}</p>
        </div>
      )}
    </div>
  );
}

export function TokenFlowGuide() {
  const walletState = useAppSelector((s) => s.wallet);
  const tokenState = useAppSelector((s) => s.tokens);

  const isConnected = walletState.connected;
  const hasToken = !!tokenState.nrjToken?.mint;
  const hasMinted = walletState.nrjBalance > 0;
  const currentStep = !isConnected ? 1 : !hasToken ? 2 : !hasMinted ? 3 : 4;
  const progress = Math.round(((Math.min(currentStep, 4) - 1) / 3) * 100);

  const steps: Step[] = [
    {
      number: 1, icon: Wallet, color: '#6366f1',
      title: 'Get Devnet SOL (Gas)',
      description: 'SOL pays tiny transaction fees — it is NOT converted to NRJ',
      detail: 'Devnet SOL is only used to pay gas fees on Solana (~0.000005 SOL per transaction). Get it free from https://faucet.solana.com. IMPORTANT: SOL and NRJ are completely separate assets. SOL is never "converted" into NRJ — NRJ is a custom SPL token you create and mint at any quantity.',
    },
    {
      number: 2, icon: Zap, color: '#8b5cf6',
      title: 'Create the NRJ Token Mint',
      description: 'One-time setup — deploys the NRJ SPL token on Solana Devnet',
      detail: 'Go to the Tokens tab → click "Create NRJ Token". This deploys a new SPL token mint onto the Solana blockchain. Your wallet becomes the Mint Authority (only you can mint new NRJ). Cost: ~0.002 SOL (rent for on-chain storage). The mint address is saved automatically.',
    },
    {
      number: 3, icon: Coins, color: '#f59e0b',
      title: 'Mint NRJ Tokens to Your Wallet',
      description: 'Create NRJ tokens from scratch — you define the amount',
      detail: 'Go to Tokens → "Mint Tokens" tab. Enter any amount (e.g. 1,000,000 NRJ). Your wallet receives that many NRJ tokens. There is no SOL-to-NRJ conversion — you are literally creating new NRJ tokens as the mint authority. Costs only ~0.000005 SOL in gas fees.',
    },
    {
      number: 4, icon: Send, color: '#22c55e',
      title: 'Transfer NRJ to Another Wallet',
      description: 'Send NRJ tokens to any Solana wallet address',
      detail: 'Go to the "Send NRJ" tab. Enter the recipient\'s Solana wallet address and amount of NRJ. If the recipient doesn\'t have an NRJ token account yet, one is created automatically (~0.002 SOL fee). The NRJ tokens arrive instantly once confirmed on Solana.',
    },
  ];

  return (
    <div style={{ background: '#13133a', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
        }}>
          <Info size={22} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>SOL → NRJ: How It Works</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Step-by-step guide to minting and transferring NRJ</p>
        </div>
      </div>

      {/* Key Concept Banner */}
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12 }}>
        <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>SOL is NOT converted to NRJ</p>
          <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
            SOL = network gas (fuel). NRJ = your custom SPL token (created from scratch). You mint NRJ at any quantity — SOL only pays tiny transaction fees.
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Progress</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>Step {Math.min(currentStep, 4)} of 4</span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, transition: 'width 0.5s ease',
            width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #22c55e)',
          }} />
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step) => (
          <FlowStep
            key={step.number} step={step}
            isComplete={step.number < currentStep}
            isCurrent={step.number === currentStep}
          />
        ))}
      </div>

      {/* Cost Summary */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginTop: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 14 }}>
          Estimated SOL Costs
        </p>
        {[
          { action: 'Create NRJ Token Mint',      cost: '~0.0015 SOL', color: '#8b5cf6' },
          { action: 'Mint NRJ Tokens (any amount)', cost: '~0.000005 SOL', color: '#f59e0b' },
          { action: 'Transfer NRJ (existing ATA)', cost: '~0.000005 SOL', color: '#22c55e' },
          { action: 'Transfer NRJ (new recipient)', cost: '~0.002 SOL', color: '#06b6d4' },
        ].map(({ action, cost, color }, i, arr) => (
          <div key={action} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingBottom: i < arr.length - 1 ? 10 : 0,
            marginBottom: i < arr.length - 1 ? 10 : 0,
            borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{action}</span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color }}>{cost}</span>
          </div>
        ))}
        <p style={{ fontSize: 11, color: '#334155', marginTop: 10 }}>
          * All costs are in Solana Devnet SOL (free test tokens). Mainnet costs are similar.
        </p>
      </div>
    </div>
  );
}
