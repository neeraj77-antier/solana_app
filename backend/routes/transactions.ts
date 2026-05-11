import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import { body, query, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

/**
 * Validate Solana address middleware
 */
const validateSolanaAddress = (value: string): boolean => {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * GET /api/transactions?wallet=<address>&limit=20&page=1
 * Fetch paginated transactions for a wallet
 */
router.get(
  '/',
  [
    query('wallet').custom(validateSolanaAddress).withMessage('Invalid Solana wallet address'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('page').optional().isInt({ min: 1 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { wallet, limit = '20', page = '1' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
      // Find or create wallet record
      const walletRecord = await prisma.wallet.findUnique({
        where: { address: wallet as string },
      });

      if (!walletRecord) {
        return res.json({
          success: true,
          data: { transactions: [], total: 0, page: pageNum, limit: limitNum },
        });
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: { walletId: walletRecord.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.transaction.count({
          where: { walletId: walletRecord.id },
        }),
      ]);

      return res.json({
        success: true,
        data: { transactions, total, page: pageNum, limit: limitNum, hasMore: skip + limitNum < total },
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
  }
);

/**
 * POST /api/transactions
 * Save a transaction to the database
 */
router.post(
  '/',
  [
    body('signature').isString().isLength({ min: 64, max: 128 }),
    body('walletAddress').custom(validateSolanaAddress),
    body('type').isIn(['SOL_TRANSFER', 'TOKEN_TRANSFER', 'TOKEN_MINT', 'TOKEN_CREATE']),
    body('amount').isFloat({ min: 0 }),
    body('fromAddress').custom(validateSolanaAddress),
    body('toAddress').custom(validateSolanaAddress),
    body('status').isIn(['PENDING', 'CONFIRMED', 'FAILED']),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      signature, walletAddress, type, amount,
      tokenMint, fromAddress, toAddress, status,
      blockTime, slot, fee, memo,
    } = req.body;

    try {
      // Upsert wallet
      const wallet = await prisma.wallet.upsert({
        where: { address: walletAddress },
        update: {},
        create: { address: walletAddress },
      });

      // Create transaction (ignore duplicate signatures)
      const transaction = await prisma.transaction.upsert({
        where: { signature },
        update: { status },
        create: {
          signature,
          walletId: wallet.id,
          type,
          amount,
          tokenMint: tokenMint || null,
          fromAddress,
          toAddress,
          status,
          blockTime: blockTime ? new Date(blockTime * 1000) : null,
          slot: slot || null,
          fee: fee || null,
          memo: memo || null,
        },
      });

      return res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      console.error('Error saving transaction:', error);
      return res.status(500).json({ success: false, error: 'Failed to save transaction' });
    }
  }
);

export default router;
