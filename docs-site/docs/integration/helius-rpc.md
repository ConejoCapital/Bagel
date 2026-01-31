---
sidebar_position: 4
---

# Helius RPC Integration

Guide to using Helius for high-performance RPC and APIs.

## Overview

Helius provides:

- High-performance RPC endpoints
- Enhanced transaction APIs (DAS)
- Real-time WebSocket streams
- Transaction parsing

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_HELIUS_API_KEY=your_api_key
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Connection Setup

```typescript
import { Connection } from '@solana/web3.js';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const connection = new Connection(HELIUS_RPC_URL, 'confirmed');
```

## Enhanced Transactions API

### Fetch Transaction History

```typescript
const HELIUS_API_URL = `https://api-devnet.helius.xyz`;

async function fetchTransactions(wallet: string, limit: number = 20) {
  const response = await fetch(
    `${HELIUS_API_URL}/v0/addresses/${wallet}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  return response.json();
}
```

### Parse Transaction Types

```typescript
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
  }>;
  description?: string;
  source?: string;
}

function parseTransaction(tx: HeliusTransaction, walletAddress: string) {
  const isIncoming = tx.tokenTransfers?.some(
    t => t.toUserAccount === walletAddress
  );

  return {
    id: tx.signature,
    type: tx.type || 'Transfer',
    direction: isIncoming ? 'in' : 'out',
    amount: tx.tokenTransfers?.[0]?.tokenAmount || 0,
    timestamp: tx.timestamp,
    fee: tx.fee / 1e9,
  };
}
```

## WebSocket Streaming

### Subscribe to Account Changes

```typescript
const wsUrl = `wss://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  // Subscribe to account changes
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'accountSubscribe',
    params: [
      employeeEntryPda.toBase58(),
      { encoding: 'jsonParsed', commitment: 'confirmed' }
    ]
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Account updated:', data);
};
```

### Subscribe to Program Logs

```typescript
ws.send(JSON.stringify({
  jsonrpc: '2.0',
  id: 2,
  method: 'logsSubscribe',
  params: [
    { mentions: [BAGEL_PROGRAM_ID.toBase58()] },
    { commitment: 'confirmed' }
  ]
}));
```

## Transaction Hooks

### Use in React

```typescript
import { useQuery } from '@tanstack/react-query';

export function useTransactions(wallet: string, limit: number = 20) {
  return useQuery({
    queryKey: ['transactions', wallet, limit],
    queryFn: () => fetchTransactions(wallet, limit),
    refetchInterval: 10000, // 10 seconds
  });
}
```

### Transaction Stats

```typescript
function calculateStats(transactions: ParsedTransaction[]) {
  const outgoing = transactions
    .filter(tx => tx.direction === 'out')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const incoming = transactions
    .filter(tx => tx.direction === 'in')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    totalOutgoing: outgoing,
    totalIncoming: incoming,
    transactionCount: transactions.length,
  };
}
```

## Rate Limits

| Plan | Requests/second | WebSocket |
|------|-----------------|-----------|
| Free | 10 | Limited |
| Developer | 50 | Yes |
| Business | 200 | Yes |
| Enterprise | Custom | Yes |

## Best Practices

1. **Cache responses** - Reduce API calls
2. **Use WebSockets** - For real-time updates
3. **Handle rate limits** - Implement backoff
4. **Batch requests** - When possible

```typescript
// Implement exponential backoff
async function fetchWithRetry(
  fn: () => Promise<any>,
  maxRetries: number = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

## Error Handling

```typescript
async function safeHeliusFetch(endpoint: string) {
  try {
    const response = await fetch(endpoint);

    if (response.status === 429) {
      throw new Error('Rate limited - try again later');
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Helius API error:', error);
    throw error;
  }
}
```

## References

- [Helius Documentation](https://docs.helius.dev/)
- [Enhanced Transactions API](https://docs.helius.dev/solana-apis/enhanced-transactions-api)
- [WebSocket API](https://docs.helius.dev/webhooks-and-websockets/websockets)
