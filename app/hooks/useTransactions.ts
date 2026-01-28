import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '06227422-9d57-42de-a7b3-92f1491c58af';
const HELIUS_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const IS_DEVNET = HELIUS_RPC_URL.includes('devnet');

export interface Transaction {
  id: string;
  type: 'Transfer' | 'Swap' | 'NFT' | 'Unknown' | 'Payroll' | 'Deposit' | 'Withdrawal';
  direction: 'in' | 'out';
  recipient: string;
  wallet: string;
  amount: number;
  currency: string;
  date: string;
  time: string;
  status: 'Completed' | 'Pending' | 'Failed';
  privacy: 'Standard' | 'Enhanced' | 'Maximum';
  txHash: string;
  timestamp: number;
  fee?: number;
}

export interface TransactionStats {
  totalOutgoing: number;
  totalIncoming: number;
  transactionCount: number;
  privateTransactionPercent: number;
}

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  fee: number;
  feePayer: string;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  description?: string;
  source?: string;
}

// Known token mints
const TOKEN_MINTS: Record<string, string> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'So11111111111111111111111111111111111111112': 'SOL',
};

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatDate(timestamp: number): { date: string; time: string } {
  const d = new Date(timestamp * 1000);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { date, time };
}

function parseHeliusTransaction(tx: HeliusTransaction, walletAddress: string): Transaction {
  const { date, time } = formatDate(tx.timestamp);

  // Determine direction and amount from native transfers
  let direction: 'in' | 'out' = 'out';
  let amount = 0;
  let currency = 'SOL';
  let recipient = '';
  let recipientWallet = '';

  // Check native SOL transfers first
  if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
    const transfer = tx.nativeTransfers[0];
    const isIncoming = transfer.toUserAccount === walletAddress;
    direction = isIncoming ? 'in' : 'out';
    amount = transfer.amount / 1e9; // Convert lamports to SOL
    currency = 'SOL';
    recipient = isIncoming ? shortenAddress(transfer.fromUserAccount) : shortenAddress(transfer.toUserAccount);
    recipientWallet = isIncoming ? transfer.fromUserAccount : transfer.toUserAccount;
  }

  // Check token transfers (override if present)
  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
    const transfer = tx.tokenTransfers[0];
    const isIncoming = transfer.toUserAccount === walletAddress;
    direction = isIncoming ? 'in' : 'out';
    amount = transfer.tokenAmount;
    currency = TOKEN_MINTS[transfer.mint] || 'Token';
    recipient = isIncoming ? shortenAddress(transfer.fromUserAccount) : shortenAddress(transfer.toUserAccount);
    recipientWallet = isIncoming ? transfer.fromUserAccount : transfer.toUserAccount;
  }

  // Determine transaction type
  let type: Transaction['type'] = 'Transfer';
  if (tx.type === 'SWAP') type = 'Swap';
  else if (tx.type === 'NFT_SALE' || tx.type === 'NFT_MINT') type = 'NFT';
  else if (direction === 'in') type = 'Deposit';
  else if (tx.description?.toLowerCase().includes('payroll')) type = 'Payroll';
  else type = direction === 'out' ? 'Withdrawal' : 'Deposit';

  // Assign random privacy for demo (in real app, this would come from your privacy layer)
  const privacyLevels: Transaction['privacy'][] = ['Standard', 'Enhanced', 'Maximum'];
  const privacy = privacyLevels[Math.floor(Math.random() * privacyLevels.length)];

  return {
    id: tx.signature,
    type,
    direction,
    recipient: recipient || 'Unknown',
    wallet: shortenAddress(recipientWallet || tx.feePayer),
    amount,
    currency,
    date,
    time,
    status: 'Completed',
    privacy,
    txHash: shortenAddress(tx.signature),
    timestamp: tx.timestamp,
    fee: tx.fee / 1e9,
  };
}

export function useTransactions(limit: number = 20) {
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats>({
    totalOutgoing: 0,
    totalIncoming: 0,
    transactionCount: 0,
    privateTransactionPercent: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!publicKey) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use Helius enhanced transactions API (devnet or mainnet based on config)
      const baseUrl = IS_DEVNET ? 'https://api-devnet.helius.xyz' : 'https://api.helius.xyz';
      const response = await fetch(
        `${baseUrl}/v0/addresses/${publicKey.toBase58()}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const data: HeliusTransaction[] = await response.json();

      const parsedTransactions = data.map((tx) =>
        parseHeliusTransaction(tx, publicKey.toBase58())
      );

      setTransactions(parsedTransactions);

      // Calculate stats
      const totalOutgoing = parsedTransactions
        .filter(tx => tx.direction === 'out')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalIncoming = parsedTransactions
        .filter(tx => tx.direction === 'in')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const privateCount = parsedTransactions.filter(
        tx => tx.privacy === 'Enhanced' || tx.privacy === 'Maximum'
      ).length;

      setStats({
        totalOutgoing,
        totalIncoming,
        transactionCount: parsedTransactions.length,
        privateTransactionPercent: parsedTransactions.length > 0
          ? (privateCount / parsedTransactions.length) * 100
          : 0,
      });

    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [publicKey, limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    stats,
    loading,
    error,
    refetch: fetchTransactions,
  };
}

// Hook for recent transactions (smaller list for dashboard)
export function useRecentTransactions(limit: number = 5) {
  return useTransactions(limit);
}
