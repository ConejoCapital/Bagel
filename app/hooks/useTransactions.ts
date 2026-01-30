import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '06227422-9d57-42de-a7b3-92f1491c58af';
const HELIUS_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const IS_DEVNET = HELIUS_RPC_URL.includes('devnet');

export interface Transaction {
  id: string;
  type: string;
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
  instructions?: Array<{
    programId: string;
    data?: string;
    accounts?: string[];
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange?: number;
    tokenBalanceChanges?: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
    }>;
  }>;
}

// Known token mints
const TOKEN_MINTS: Record<string, string> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'So11111111111111111111111111111111111111112': 'SOL',
};

// Known program IDs
const KNOWN_PROGRAMS: Record<string, string> = {
  // SPL Token programs
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program',
  // System program
  '11111111111111111111111111111111': 'System Program',
  // Confidential Transfer (Inco)
  '5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj': 'Inco Confidential',
  '5SpaVk72hvLTpxwEgtxDRKNcohJrg2xUavvDnDnE9XV1': 'Inco SDK',
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

  // Determine transaction type from program interactions and description
  let type: string = 'Transfer';

  // Check for specific program interactions
  const hasIncoProgram = tx.instructions?.some(
    inst => inst.programId === '5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj' ||
            inst.programId === '5SpaVk72hvLTpxwEgtxDRKNcohJrg2xUavvDnDnE9XV1'
  );

  // Detect confidential transfers
  // Pattern 1: Has Inco program + token transfer
  // Pattern 2: Small SOL amount (just fees) + no visible token transfers (encrypted transfer)
  const isConfidentialTransfer =
    (hasIncoProgram && tx.tokenTransfers && tx.tokenTransfers.length > 0) ||
    (currency === 'SOL' && amount < 0.01 && (!tx.tokenTransfers || tx.tokenTransfers.length === 0));

  if (isConfidentialTransfer) {
    type = 'Confidential Transfer';
  }
  // Use description if available for more specific transaction names
  else if (tx.description && tx.description.trim() !== '' && tx.description.toUpperCase() !== 'UNKNOWN') {
    type = tx.description;
  } else if (tx.type === 'SWAP') {
    type = 'Swap';
  } else if (tx.type === 'NFT_SALE') {
    type = 'NFT Sale';
  } else if (tx.type === 'NFT_MINT') {
    type = 'NFT Mint';
  } else if (tx.source && tx.source.trim() !== '' && tx.source.toUpperCase() !== 'UNKNOWN') {
    type = tx.source;
  } else if (tx.type && tx.type !== 'UNKNOWN') {
    type = tx.type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  } else {
    // Default based on direction and amount
    if (currency === 'SOL') {
      type = direction === 'in' ? 'SOL Received' : 'SOL Transfer';
    } else if (currency !== 'SOL' && amount > 0) {
      type = direction === 'in' ? `${currency} Received` : `${currency} Transfer`;
    } else {
      type = direction === 'in' ? 'Deposit' : 'Transaction';
    }
  }

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
    privacy: 'Maximum',
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
