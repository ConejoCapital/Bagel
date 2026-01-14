---
description: Helius RPC configuration, webhooks, and priority fees
globs: ["app/utils/helius.ts", "scripts/*.ts", "lib/helius/**/*"]
---

# 🌩️ The Infrastructure Engineer

You ensure our connection to Solana is fast and reliable using **Helius**.

## 🛠️ Configuration

### Environment Variables
```bash
# .env
NEXT_PUBLIC_HELIUS_API_KEY=06227422-9d57-42de-a7b3-92f1491c58af
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# For backend/scripts
HELIUS_API_KEY=06227422-9d57-42de-a7b3-92f1491c58af
```

### Connection Setup
```typescript
// lib/helius/connection.ts
import { Connection } from '@solana/web3.js';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY!;
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';

const RPC_URLS = {
  mainnet: `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
  devnet: `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
};

const WS_URLS = {
  mainnet: `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
  devnet: `wss://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
};

export const connection = new Connection(
  RPC_URLS[NETWORK as keyof typeof RPC_URLS],
  {
    commitment: 'confirmed',
    wsEndpoint: WS_URLS[NETWORK as keyof typeof WS_URLS],
  }
);
```

## 🚦 Priority Fees

### Dynamic Fee Calculator
```typescript
// lib/helius/priorityFees.ts
export type FeeLevel = 'Min' | 'Low' | 'Medium' | 'High' | 'VeryHigh';

export async function getDynamicPriorityFee(
  accountKeys: string[],
  level: FeeLevel = 'High'
): Promise<number> {
  const response = await fetch(
    `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getPriorityFeeEstimate',
        params: [{
          accountKeys,
          options: {
            recommendedFeeLevel: level,
            includeAllPriorityFeeLevels: true,
          }
        }]
      })
    }
  );
  
  const data = await response.json();
  
  if (data.error) {
    console.error('Priority fee estimation failed:', data.error);
    return 10000; // Fallback to 10k microlamports
  }
  
  return data.result.priorityFeeEstimate;
}
```

### Transaction Builder
```typescript
// lib/helius/transaction.ts
import { 
  Transaction, 
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';

export async function buildTransactionWithPriorityFee(
  instructions: TransactionInstruction[],
  accountKeys: string[],
  feeLevel: FeeLevel = 'High',
): Promise<Transaction> {
  const tx = new Transaction();
  
  // Get dynamic priority fee from Helius
  const priorityFee = await getDynamicPriorityFee(accountKeys, feeLevel);
  
  // Add compute budget instructions
  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    })
  );
  
  // Optional: Set compute unit limit
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 200_000,
    })
  );
  
  // Add actual instructions
  tx.add(...instructions);
  
  return tx;
}
```

### Usage in Components
```typescript
// Example: Withdraw flow
const withdrawDough = async () => {
  const instruction = await program.methods
    .getDough()
    .accounts({...})
    .instruction();
  
  const tx = await buildTransactionWithPriorityFee(
    [instruction],
    [
      bagelJarAddress.toString(),
      employeeAddress.toString(),
    ],
    'High' // Users hate waiting for money!
  );
  
  const signature = await sendTransaction(tx, connection);
  await connection.confirmTransaction(signature);
};
```

## 🔔 Webhooks

### Webhook Setup Script
```typescript
// scripts/setup-webhook.ts
import fetch from 'node-fetch';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;

async function createBagelWebhook() {
  const response = await fetch(
    `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookURL: 'https://your-backend.com/api/webhooks/bagel',
        transactionTypes: ['ANY'],
        accountAddresses: [
          'BaGe1111111111111111111111111111111111111', // Program ID
        ],
        webhookType: 'enhanced',
        authHeader: process.env.WEBHOOK_SECRET,
      })
    }
  );
  
  const webhook = await response.json();
  console.log('✅ Webhook created:', webhook.webhookID);
  return webhook;
}

createBagelWebhook().catch(console.error);
```

### Webhook Handler (Backend)
```typescript
// app/api/webhooks/bagel/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const authHeader = request.headers.get('authorization');
  if (authHeader !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const data = await request.json();
  
  // Parse Helius enhanced transaction
  for (const tx of data) {
    if (tx.type === 'UNKNOWN') continue;
    
    // Check if it's a BagelWithdrawal event
    const isWithdrawal = tx.instructions.some(
      (ix: any) => ix.programId === 'BaGe...' && ix.data.includes('get_dough')
    );
    
    if (isWithdrawal) {
      // Notify employer dashboard
      await notifyEmployer({
        employee: tx.feePayer,
        timestamp: tx.timestamp,
        // Amount is private, so we just show "Withdrawal"
        event: 'Dough Delivered 🥯',
      });
    }
  }
  
  return NextResponse.json({ success: true });
}
```

## 📊 Enhanced Transaction API

### Get Readable Transaction History
```typescript
// lib/helius/transactions.ts
export async function getEnrichedTransactions(
  address: string,
  limit: number = 50
) {
  const response = await fetch(
    `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getEnrichedTransactions',
        params: {
          addresses: [address],
          limit,
        }
      })
    }
  );
  
  const data = await response.json();
  
  // Transform to human-readable format
  return data.result.map((tx: any) => ({
    signature: tx.signature,
    timestamp: new Date(tx.timestamp * 1000),
    type: getBagelEventType(tx),
    description: getBagelDescription(tx),
    status: tx.status,
  }));
}

function getBagelEventType(tx: any): string {
  // Parse instruction data to determine event type
  if (tx.instructions.some((ix: any) => ix.data.includes('bake_payroll'))) {
    return 'Payroll Started 🥯';
  }
  if (tx.instructions.some((ix: any) => ix.data.includes('get_dough'))) {
    return 'Dough Delivered 💰';
  }
  if (tx.instructions.some((ix: any) => ix.data.includes('deposit'))) {
    return 'Dough Added 📈';
  }
  return 'Unknown Event';
}
```

## 🎯 Key Deliverables
1. ✅ Helius connection configured with API key
2. ✅ Dynamic priority fee integration
3. ✅ Webhook setup for real-time notifications
4. ✅ Enhanced transaction history for dashboards
5. ✅ WebSocket connection for real-time updates

## 📝 Usage Guidelines
- **Always use High priority fees** for withdrawals (users hate waiting)
- **Use Medium fees** for deposits and setup
- **Set up webhooks** for background notifications
- **Cache priority fees** (30 second refresh is fine)
- **Monitor webhook health** (Helius dashboard)
