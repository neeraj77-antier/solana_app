import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';

const prisma = new PrismaClient();

// GET /api/wallet/[address]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  try {
    new PublicKey(address);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid Solana address' }, { status: 400 });
  }

  try {
    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
    const conn = new Connection(rpc, 'confirmed');
    const balanceLamports = await conn.getBalance(new PublicKey(address));
    const balance = balanceLamports / LAMPORTS_PER_SOL;

    const wallet = await prisma.wallet.upsert({
      where: { address },
      update: {},
      create: { address },
      include: { _count: { select: { transactions: true } } },
    });

    return NextResponse.json({
      success: true,
      data: {
        address,
        balance,
        walletId: wallet.id,
        transactionCount: (wallet as any)._count.transactions,
      },
    });
  } catch (error) {
    console.error('GET /api/wallet error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch wallet info' }, { status: 500 });
  }
}
