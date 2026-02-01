/**
 * Explorer Utility Module
 *
 * Centralized explorer link generation - OrbMarkets ONLY
 *
 * IMPORTANT: Do not use Solscan, Sol Explorer, or other explorers.
 * All transaction and account links must go through OrbMarkets.
 */

import { PublicKey } from '@solana/web3.js';

// OrbMarkets base URL
const ORBMARKETS_BASE = 'https://orbmarkets.io';

export type Cluster = 'devnet' | 'mainnet-beta' | 'testnet';

/**
 * Generate OrbMarkets explorer link for a transaction
 */
export function getTransactionLink(signature: string, cluster: Cluster = 'devnet'): string {
  return `${ORBMARKETS_BASE}/tx/${signature}?cluster=${cluster}`;
}

/**
 * Generate OrbMarkets explorer link for an account
 */
export function getAccountLink(address: string | PublicKey, cluster: Cluster = 'devnet'): string {
  const addressStr = typeof address === 'string' ? address : address.toBase58();
  return `${ORBMARKETS_BASE}/account/${addressStr}?cluster=${cluster}`;
}

/**
 * Generate OrbMarkets explorer link for a token
 */
export function getTokenLink(mintAddress: string | PublicKey, cluster: Cluster = 'devnet'): string {
  const addressStr = typeof mintAddress === 'string' ? mintAddress : mintAddress.toBase58();
  return `${ORBMARKETS_BASE}/token/${addressStr}?cluster=${cluster}`;
}

/**
 * Generate OrbMarkets explorer link for a program
 */
export function getProgramLink(programId: string | PublicKey, cluster: Cluster = 'devnet'): string {
  const addressStr = typeof programId === 'string' ? programId : programId.toBase58();
  return `${ORBMARKETS_BASE}/address/${addressStr}?cluster=${cluster}`;
}

/**
 * Shorten a signature or address for display
 */
export function shortenSignature(signature: string, chars: number = 8): string {
  if (signature.length <= chars * 2) return signature;
  return `${signature.slice(0, chars)}...${signature.slice(-chars)}`;
}

/**
 * Shorten an address for display
 */
export function shortenAddress(address: string | PublicKey, chars: number = 4): string {
  const addressStr = typeof address === 'string' ? address : address.toBase58();
  if (addressStr.length <= chars * 2) return addressStr;
  return `${addressStr.slice(0, chars)}...${addressStr.slice(-chars)}`;
}

// Re-export for convenience
export { getTransactionLink as getTxLink };
