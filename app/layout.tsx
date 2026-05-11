import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { APP_NAME } from '@/constants';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} - Solana Crypto Dashboard`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    'Professional Solana Web3 wallet dashboard. Send SOL, manage NRJ tokens, view transaction history, and interact with the Solana blockchain.',
  keywords: ['Solana', 'Web3', 'Crypto', 'NRJ Token', 'Blockchain', 'Wallet', 'DeFi'],
  authors: [{ name: 'Neeraj Pay Team' }],
  creator: 'Neeraj Pay',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: APP_NAME,
    description: 'Professional Solana Web3 wallet dashboard',
    siteName: APP_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: 'Professional Solana Web3 wallet dashboard',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
