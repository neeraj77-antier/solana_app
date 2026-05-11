# 🚀 Neeraj Pay — Solana Web3 Dashboard

A production-grade Solana crypto dashboard built with Next.js 16, TypeScript, TailwindCSS, and the Solana Web3.js stack. Connect your Phantom wallet, send SOL, manage NRJ tokens, view transaction history, and interact with the Solana Devnet.

---

## Features

| Feature | Status |
|---------|--------|
| Connect Phantom Wallet | Done |
| Auto-reconnect wallet | Done |
| View SOL Balance (real-time) | Done |
| Send SOL with memo | Done |
| Create NRJ SPL Token | Done |
| Mint NRJ Tokens | Done |
| Transfer NRJ Tokens | Done |
| Transaction History | Done |
| Solscan links | Done |
| QR Code receiver | Done |
| Network Status (TPS/Slot/Epoch) | Done |
| Transaction Analytics Chart | Done |
| Toast Notifications | Done |
| Dark Premium UI | Done |
| Redux Toolkit State | Done |
| Zod Validation | Done |
| Backend API (Express + Prisma) | Done |
| Docker support | Done |
| CI/CD Pipeline | Done |

---

## Tech Stack

### Frontend
- Next.js 16 (App Router, Turbopack)
- TypeScript - full type safety
- TailwindCSS - custom dark theme with glassmorphism
- Redux Toolkit - global state management
- React Hook Form + Zod - form validation
- Recharts - transaction analytics

### Blockchain
- @solana/web3.js - core Solana primitives
- @solana/spl-token - SPL token creation and transfer
- @solana/wallet-adapter-react - wallet connection
- @solana/wallet-adapter-react-ui - wallet modal
- Phantom, Solflare, Torus wallets supported

### Backend
- Express.js - REST API
- Prisma ORM - type-safe DB queries
- PostgreSQL - transaction storage
- express-rate-limit - rate limiting
- Helmet - security headers

---

## Project Structure

```
neeraj-pay/
app/
  layout.tsx          # Root layout with providers
  page.tsx            # Main dashboard page
  globals.css         # Premium dark theme
  providers.tsx       # Redux + Solana providers

components/
  dashboard/
    Navbar.tsx             # Sticky navbar with wallet dropdown
    WalletOverview.tsx     # Balance cards
    TokenManagement.tsx    # Create/mint NRJ tokens
    TransactionHistory.tsx # Paginated tx list
    TransactionChart.tsx   # 7-day analytics chart
    NetworkStatus.tsx      # Live Solana network info
  forms/
    SendSolForm.tsx        # SOL transfer form
    SendTokenForm.tsx      # NRJ token transfer form
  wallet/
    WalletQRCode.tsx       # QR code receiver
    WalletWatcher.tsx      # Wallet Redux bridge

services/solana/
  connection.ts       # Singleton RPC connection
  balance.ts          # SOL and token balance queries
  transfer.ts         # SOL transfer with retry
  token.ts            # SPL token create/mint/transfer
  transactions.ts     # Transaction history and network status

hooks/
  useWalletIntegration.ts   # Wallet Redux sync
  useTransfer.ts            # SOL and token transfer hooks

store/
  index.ts            # Redux store
  walletSlice.ts      # Wallet state
  transactionsSlice.ts # Transaction state
  tokenSlice.ts       # Token state

backend/
  server.ts           # Express server
  routes/
    transactions.ts # Transaction CRUD API
    wallet.ts       # Wallet info API

types/index.ts          # TypeScript types
constants/index.ts      # App constants
lib/
  utils.ts            # Utility functions
  validations.ts      # Zod schemas

prisma/schema.prisma    # Database schema
Dockerfile              # Production container
docker-compose.yml      # Full stack Docker
.github/workflows/ci.yml # CI/CD pipeline
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (or Docker)
- Phantom Wallet browser extension

### 1. Install
```bash
cd neeraj-pay
npm install
```

### 2. Environment Setup
```bash
cp .env.local .env.local.example
```

Required variables:
```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
DATABASE_URL=postgresql://postgres:password@localhost:5432/neeraj_pay
JWT_SECRET=your-secret-key
```

### 3. Database Setup
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start Development
```bash
npm run dev
# App runs at http://localhost:3000
```

---

## Docker

```bash
docker-compose up -d
docker-compose logs -f app
```

---

## Devnet Setup Guide

### Get Test SOL
1. Go to https://faucet.solana.com
2. Enter your wallet address
3. Request 2 SOL (Devnet)

Or use the CLI:
```bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### Create NRJ Token
1. Connect your Phantom wallet (set to Devnet)
2. Go to the Tokens tab
3. Click Create NRJ Token
4. Confirm transaction in Phantom
5. Copy the mint address displayed

### Mint NRJ Tokens
1. Go to Tokens then Mint Tokens tab
2. Enter amount (e.g. 1000000)
3. Click Mint NRJ Tokens
4. Confirm in Phantom

---

## Security Features

- Never touches private keys, uses Wallet Adapter signing only
- Zod input validation on all forms
- Server-side Solana address validation
- Rate limiting (100 req/15min)
- Helmet security headers
- CORS protection
- Input sanitization

---

## Production Deployment

### Environment Variables
```
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-rpc-endpoint.com
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=strong-random-secret
```

### Build
```bash
npm run build
npm start
```

### Vercel
```bash
vercel --prod
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/wallet/:address | Get wallet info and balance |
| GET | /api/transactions?wallet= | List transactions |
| POST | /api/transactions | Save transaction |
| GET | /health | Health check |

---

## NRJ Token Details

| Field | Value |
|-------|-------|
| Name | Neeraj Token |
| Symbol | NRJ |
| Decimals | 9 |
| Standard | SPL Token |
| Network | Solana Devnet |
| Authority | Connected wallet |

---

## License

MIT License - Built with love on Solana
