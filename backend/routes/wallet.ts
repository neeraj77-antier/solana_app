import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PublicKey, Connection } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { param, validationResult } from 'express-validator';
import { SOLANA_RPC_URL, SOLANA_NETWORK } from '@/constants';
import { clusterApiUrl } from '@solana/web3.js';

const router = Router();
const prisma = new PrismaClient();

function getConn() {
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
  return new Connection(rpc, 'confirmed');
}

/**
 * GET /api/wallet/:address
 * Get wallet info and on-chain balance
 */
router.get(
  '/:address',
  [
    param('address')
      .custom((val) => { new PublicKey(val); return true; })
      .withMessage('Invalid Solana address'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const address = req.params.address as string;

    try {
      const conn = getConn();
      const publicKey = new PublicKey(address);
      const balanceLamports = await conn.getBalance(publicKey);
      const balance = balanceLamports / LAMPORTS_PER_SOL;

      // Get or create wallet in DB
      const wallet = await prisma.wallet.upsert({
        where: { address },
        update: {},
        create: { address },
        include: {
          _count: { select: { transactions: true } },
        },
      });

      return res.json({
        success: true,
        data: {
          address,
          balance,
          walletId: wallet.id,
          transactionCount: (wallet as any)._count.transactions,
        },
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch wallet info' });
    }
  }
);

export default router;
