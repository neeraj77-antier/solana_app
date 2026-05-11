import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';

const prisma = new PrismaClient();

function isValidSolanaAddress(addr: string): boolean {
  try { new PublicKey(addr); return true; } catch { return false; }
}

// GET /api/transactions?wallet=<addr>&limit=20&page=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet') || '';
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const skip = (page - 1) * limit;

  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 });
  }

  try {
    const walletRecord = await prisma.wallet.findUnique({ where: { address: wallet } });
    if (!walletRecord) {
      return NextResponse.json({ success: true, data: { transactions: [], total: 0, page, limit } });
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { walletId: walletRecord.id },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.transaction.count({ where: { walletId: walletRecord.id } }),
    ]);

    return NextResponse.json({ success: true, data: { transactions, total, page, limit, hasMore: skip + limit < total } });
  } catch (error) {
    console.error('GET /api/transactions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { signature, walletAddress, type, amount, tokenMint, fromAddress, toAddress, status, blockTime, slot, fee, memo } = body;

    // Basic validation
    if (!signature || !isValidSolanaAddress(walletAddress) || !type || amount === undefined
        || !isValidSolanaAddress(fromAddress) || !isValidSolanaAddress(toAddress)) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const wallet = await prisma.wallet.upsert({
      where: { address: walletAddress },
      update: {},
      create: { address: walletAddress },
    });

    const transaction = await prisma.transaction.upsert({
      where: { signature },
      update: { status },
      create: {
        signature, walletId: wallet.id, type, amount,
        tokenMint: tokenMint || null, fromAddress, toAddress,
        status: status || 'CONFIRMED',
        blockTime: blockTime ? new Date(blockTime * 1000) : null,
        slot: slot || null, fee: fee || null, memo: memo || null,
      },
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    console.error('POST /api/transactions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save transaction' }, { status: 500 });
  }
}
