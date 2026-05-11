'use client';

import { useWalletIntegration } from '@/hooks/useWalletIntegration';

/**
 * Invisible component that bootstraps wallet ↔ Redux integration.
 * Must be rendered inside Providers and WalletProvider.
 */
export function WalletWatcher() {
  // This hook sets up all the wallet event listeners
  useWalletIntegration();
  return null;
}
