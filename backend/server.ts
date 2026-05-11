import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import transactionRoutes from './routes/transactions';
import walletRoutes from './routes/wallet';

const app = express();
const prisma = new PrismaClient();

// ============ MIDDLEWARE ============

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ============ ROUTES ============

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/transactions', transactionRoutes);
app.use('/api/wallet', walletRoutes);

// ============ ERROR HANDLER ============

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ============ START ============

const PORT = process.env.BACKEND_PORT || 4000;

app.listen(PORT, async () => {
  console.log(`🚀 Neeraj Pay API running on port ${PORT}`);
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch {
    console.error('❌ Database connection failed');
  }
});

export { app, prisma };
