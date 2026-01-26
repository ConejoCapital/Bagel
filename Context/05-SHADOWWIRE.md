# ShadowWire Integration Guide

**Difficulty:** LOW-MEDIUM  
**Status:** MAINNET READY (verify devnet support)

---

## Overview

ShadowWire enables private transfers on Solana using Bulletproofs zero-knowledge proofs. Transaction amounts are hidden while maintaining on-chain verifiability.

**Documentation:** https://github.com/Radrdotfun/ShadowWire

---

## Network Info

| Item | Value |
|------|-------|
| Mainnet Program | `GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD` |
| NPM Package | `@radr/shadowwire` |
| Version | 1.1.1 |

### Supported Tokens

| Token | Decimals | Fee |
|-------|----------|-----|
| SOL | 9 | 0.5% |
| USDC | 6 | 1% |
| RADR | 9 | 0.3% |
| USD1 | 6 | 1% |

---

## Setup Instructions

### 1. Install SDK

```bash
cd app
npm install @radr/shadowwire
```

### 2. Configure Environment

```bash
# app/.env.local
NEXT_PUBLIC_SHADOWWIRE_PROGRAM_ID=GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD
```

---

## Frontend Integration

### ShadowWire Client

```typescript
// app/lib/shadowwire.ts

import { ShadowWireClient } from '@radr/shadowwire';
import { PublicKey } from '@solana/web3.js';

export interface PrivateTransferParams {
  sender: string;
  recipient: string;
  amount: number;
  token: 'SOL' | 'USDC' | 'USD1';
  type: 'internal' | 'external';
}

export interface TransferResult {
  success: boolean;
  signature?: string;
  error?: string;
}

class BagelShadowWireClient {
  private client: ShadowWireClient;

  constructor() {
    this.client = new ShadowWireClient({
      debug: process.env.NODE_ENV === 'development',
    });
  }

  /**
   * Execute private transfer using ShadowWire
   * Amount is hidden via Bulletproof ZK proofs
   */
  async executePrivateTransfer(
    params: PrivateTransferParams,
    wallet: { signMessage: (message: Uint8Array) => Promise<Uint8Array> }
  ): Promise<TransferResult> {
    try {
      console.log('Executing ShadowWire private transfer...');
      console.log(`   Amount: ${params.amount} ${params.token} (will be HIDDEN)`);
      console.log(`   Type: ${params.type}`);

      const result = await this.client.transfer({
        sender: params.sender,
        recipient: params.recipient,
        amount: params.amount,
        token: params.token,
        type: params.type,
        wallet: { signMessage: wallet.signMessage },
      });

      console.log('Private transfer complete');
      console.log(`   Signature: ${result.signature}`);
      console.log(`   Amount: HIDDEN (Bulletproof)`);

      return {
        success: true,
        signature: result.signature,
      };
    } catch (error) {
      console.error('Private transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get ShadowWire balance for a wallet
   */
  async getBalance(wallet: string, token: string = 'SOL'): Promise<number> {
    try {
      const balance = await this.client.getBalance(wallet, token);
      return balance;
    } catch (error) {
      console.error('Failed to get ShadowWire balance:', error);
      return 0;
    }
  }

  /**
   * Deposit funds to ShadowWire
   */
  async deposit(
    wallet: string,
    amount: number,
    token: string = 'SOL'
  ): Promise<TransferResult> {
    try {
      const result = await this.client.deposit({
        wallet,
        amount: this.toSmallestUnit(amount, token),
      });

      return {
        success: true,
        signature: result.signature,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Withdraw from ShadowWire to regular wallet
   */
  async withdraw(
    wallet: string,
    amount: number,
    token: string = 'SOL'
  ): Promise<TransferResult> {
    try {
      const result = await this.client.withdraw({
        wallet,
        amount: this.toSmallestUnit(amount, token),
      });

      return {
        success: true,
        signature: result.signature,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate fee for a transfer
   */
  getFee(amount: number, token: string): { fee: number; total: number } {
    const feePercent = this.client.getFeePercentage(token);
    const fee = amount * (feePercent / 100);
    return {
      fee,
      total: amount + fee,
    };
  }

  /**
   * Get minimum transfer amount
   */
  getMinimumAmount(token: string): number {
    return this.client.getMinimumAmount(token);
  }

  private toSmallestUnit(amount: number, token: string): number {
    const decimals = this.getDecimals(token);
    return Math.floor(amount * Math.pow(10, decimals));
  }

  private getDecimals(token: string): number {
    const decimalsMap: Record<string, number> = {
      SOL: 9,
      USDC: 6,
      USD1: 6,
      RADR: 9,
    };
    return decimalsMap[token] || 9;
  }
}

// Singleton instance
export const shadowWireClient = new BagelShadowWireClient();

// Export for use in components
export { BagelShadowWireClient };
```

### Withdrawal Flow

```typescript
// In app/pages/employee.tsx

import { shadowWireClient } from '../lib/shadowwire';
import { magicBlockClient } from '../lib/magicblock';

const handleWithdraw = async () => {
  if (!wallet.publicKey || !wallet.signMessage) return;

  setLoading(true);
  setError(null);

  try {
    // Step 1: Commit MagicBlock state back to L1
    console.log('Committing PER state to L1...');
    await magicBlockClient.commitAndUndelegate(payrollJarAddress);

    // Step 2: Execute private transfer via ShadowWire
    console.log('Executing private withdrawal...');
    const result = await shadowWireClient.executePrivateTransfer(
      {
        sender: vaultAddress.toBase58(),
        recipient: wallet.publicKey.toBase58(),
        amount: accruedBalance,
        token: 'SOL',
        type: 'internal', // Fully private
      },
      { signMessage: wallet.signMessage }
    );

    if (result.success) {
      setSuccess(`Withdrawal complete! Signature: ${result.signature}`);
      // Amount is HIDDEN on-chain!
    } else {
      setError(result.error || 'Withdrawal failed');
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
};
```

### Private Transfer Component

```typescript
// app/components/PrivateWithdrawButton.tsx

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { shadowWireClient } from '../lib/shadowwire';

interface Props {
  amount: number;
  token: 'SOL' | 'USDC' | 'USD1';
  vaultAddress: string;
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
}

export function PrivateWithdrawButton({
  amount,
  token,
  vaultAddress,
  onSuccess,
  onError,
}: Props) {
  const { publicKey, signMessage } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!publicKey || !signMessage) {
      onError?.('Wallet not connected');
      return;
    }

    setLoading(true);

    const result = await shadowWireClient.executePrivateTransfer(
      {
        sender: vaultAddress,
        recipient: publicKey.toBase58(),
        amount,
        token,
        type: 'internal',
      },
      { signMessage }
    );

    setLoading(false);

    if (result.success) {
      onSuccess?.(result.signature!);
    } else {
      onError?.(result.error || 'Transfer failed');
    }
  };

  const { fee, total } = shadowWireClient.getFee(amount, token);

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-500">
        <p>Amount: {amount} {token}</p>
        <p>Fee: {fee.toFixed(4)} {token} ({shadowWireClient.getFeePercentage(token)}%)</p>
        <p>You receive: {(amount - fee).toFixed(4)} {token}</p>
      </div>
      
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-2 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Withdraw Privately'}
      </button>
      
      <p className="text-xs text-gray-400">
        Amount will be hidden on-chain via Bulletproof ZK proofs
      </p>
    </div>
  );
}
```

---

## Transfer Types

### Internal Transfer (Recommended)
- Both sender and recipient are ShadowWire users
- Amount is **completely hidden** via ZK proofs
- Maximum privacy

### External Transfer
- Recipient can be any Solana wallet
- Sender remains anonymous
- Amount is **visible** on-chain

---

## WASM Setup (Optional)

For client-side proof generation (maximum privacy):

```typescript
import { initWASM, generateRangeProof, isWASMSupported } from '@radr/shadowwire';

if (isWASMSupported()) {
  await initWASM('/wasm/settler_wasm_bg.wasm');
  
  const proof = await generateRangeProof(100000000, 64);
  
  await client.transferWithClientProofs({
    // ... params
    customProof: proof,
  });
}
```

---

## Checklist

- [ ] Install @radr/shadowwire package
- [ ] Create BagelShadowWireClient class
- [ ] Implement executePrivateTransfer method
- [ ] Add deposit/withdraw methods
- [ ] Create PrivateWithdrawButton component
- [ ] Wire up withdrawal flow with MagicBlock commit
- [ ] Test internal transfer on mainnet
- [ ] Verify devnet support (contact team if needed)
