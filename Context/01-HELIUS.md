# Helius Integration Guide

**Prize:** $5,000 (Best privacy project using Helius)  
**Difficulty:** LOW  
**Status:** READY (Devnet + Mainnet)

---

## Overview

Helius provides high-performance RPC infrastructure for Solana. Using Helius qualifies us for their $5,000 bounty.

**Documentation:** https://www.helius.dev/docs

---

## Setup Instructions

### 1. Get API Key

1. Go to https://www.helius.dev/
2. Sign up for free account
3. Create new project
4. Copy devnet API key

### 2. Configure Anchor.toml

```toml
[provider]
cluster = "Devnet"
wallet = "~/.config/solana/id.json"

[programs.devnet]
bagel = "J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE"

# Use Helius RPC
[provider.cluster]
devnet = "https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY"
```

### 3. Configure Frontend (.env.local)

```bash
# Helius RPC (Devnet)
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Bagel Program
NEXT_PUBLIC_PROGRAM_ID=J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE

# Helius API Key (for DAS API)
NEXT_PUBLIC_HELIUS_API_KEY=YOUR_API_KEY
```

---

## Privacy Audit Page

Create a page that shows the difference between raw on-chain data and decrypted view.

### Implementation

```typescript
// app/lib/helius.ts
import { Connection } from '@solana/web3.js';

const HELIUS_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY!;

export class HeliusClient {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(HELIUS_RPC, 'confirmed');
  }

  /**
   * Fetch transactions for program using DAS API
   */
  async getProgramTransactions(programId: string, limit: number = 20) {
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${programId}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`
    );
    return response.json();
  }

  /**
   * Get parsed transaction with human-readable format
   */
  async getEnhancedTransaction(signature: string) {
    const response = await fetch(
      `https://api.helius.xyz/v0/transactions/?api-key=${HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [signature] }),
      }
    );
    return response.json();
  }

  /**
   * Get account data (shows encrypted bytes)
   */
  async getAccountData(address: string) {
    const accountInfo = await this.connection.getAccountInfo(
      new PublicKey(address)
    );
    return accountInfo?.data;
  }
}

export const heliusClient = new HeliusClient();
```

### Privacy Audit Page

```typescript
// app/pages/privacy-audit.tsx
import { useEffect, useState } from 'react';
import { heliusClient } from '../lib/helius';

export default function PrivacyAuditPage() {
  const [rawData, setRawData] = useState<string>('');
  const [decryptedView, setDecryptedView] = useState<any>(null);

  // Show raw encrypted data vs decrypted view
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h2>Raw On-Chain Data (Encrypted)</h2>
        <pre className="bg-gray-900 text-green-400 p-4 rounded">
          {rawData}
        </pre>
      </div>
      <div>
        <h2>Bagel Decrypted View (Authorized Only)</h2>
        <div className="bg-white p-4 rounded shadow">
          {/* Show human-readable data */}
        </div>
      </div>
    </div>
  );
}
```

---

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /v0/addresses/{address}/transactions` | Fetch program transactions |
| `POST /v0/transactions` | Get enhanced transaction details |
| Standard RPC | Account data, send transactions |

---

## Checklist

- [ ] Sign up for Helius account
- [ ] Get devnet API key
- [ ] Update Anchor.toml with Helius RPC
- [ ] Update app/.env.local
- [ ] Create HeliusClient class
- [ ] Build privacy audit page
- [ ] Test RPC connectivity
