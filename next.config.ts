import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Prisma on Vercel serverless edge
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  // Suppress build warnings from Solana/wallet packages
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
