/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16+ uses Turbopack by default. Configure fallbacks via turbopack.
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.devnet.solana.com' },
    ],
  },
};

module.exports = nextConfig;
