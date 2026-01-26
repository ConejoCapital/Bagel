# MagicBlock PER Integration Guide

**Prize:** $5,000 (Best Private App: $2.5k, Second: $1.5k, Third: $1k)  
**Difficulty:** MEDIUM  
**Status:** DEVNET READY

---

## Overview

MagicBlock Private Ephemeral Rollups (PER) enable real-time, confidential state updates using Intel TDX Trusted Execution Environments. State is hidden while in the rollup and can be committed back to Solana L1.

**Documentation:** https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/how-to-guide/quickstart

---

## Network Info

| Item | Value |
|------|-------|
| Delegation Program | `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` |
| Permission Program | `ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1` |
| TEE Validator | `FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA` |
| TEE Endpoint | `https://tee.magicblock.app` |
| Network | Devnet |

### Regional Validators

| Region | Validator |
|--------|-----------|
| Asia | `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57` |
| EU | `MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e` |
| US | `MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd` |
| TEE | `FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA` |

---

## Setup Instructions

### 1. Add Cargo Dependency

```toml
# programs/bagel/Cargo.toml
[dependencies]
ephemeral-rollups-sdk = { version = "0.8.0", features = ["anchor"] }
```

### 2. Install Frontend SDK

```bash
cd app
npm install @magicblock-labs/ephemeral-rollups-sdk
```

---

## Backend Integration

### Add Delegation Instruction

```rust
// programs/bagel/src/lib.rs

use ephemeral_rollups_sdk::anchor::{delegate, commit};
use ephemeral_rollups_sdk::cpi::DelegateConfig;

// Constants
pub const DELEGATION_PROGRAM_ID: &str = "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";
pub const TEE_VALIDATOR: &str = "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA";

/// Delegate PayrollJar to MagicBlock PER for real-time streaming
pub fn delegate_payroll_to_per(ctx: Context<DelegatePayroll>) -> Result<()> {
    msg!("Delegating PayrollJar to MagicBlock PER");
    
    let validator = Pubkey::try_from(TEE_VALIDATOR)
        .map_err(|_| error!(BagelError::InvalidState))?;
    
    // Delegate the account to TEE validator
    ctx.accounts.delegate_pda(
        &ctx.accounts.payer,
        &[BAGEL_JAR_SEED, ctx.accounts.employer.key().as_ref(), ctx.accounts.employee.key().as_ref()],
        DelegateConfig {
            validator: Some(validator),
            ..Default::default()
        },
    )?;
    
    msg!("PayrollJar delegated to TEE");
    Ok(())
}

/// Commit PER state back to L1 and undelegate
pub fn commit_and_undelegate(ctx: Context<CommitPayroll>) -> Result<()> {
    msg!("Committing PER state to L1");
    
    use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;
    
    commit_and_undelegate_accounts(
        ctx.accounts.payer.to_account_info(),
        vec![ctx.accounts.payroll_jar.to_account_info()],
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )?;
    
    msg!("State committed and undelegated");
    Ok(())
}

/// Accounts for delegation
#[delegate]
#[derive(Accounts)]
pub struct DelegatePayroll<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Employer reference
    pub employer: UncheckedAccount<'info>,
    
    /// CHECK: Employee reference
    pub employee: UncheckedAccount<'info>,
    
    #[account(
        mut,
        del,
        seeds = [BAGEL_JAR_SEED, employer.key().as_ref(), employee.key().as_ref()],
        bump,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,
    
    /// CHECK: Validator account
    pub validator: Option<AccountInfo<'info>>,
    
    pub system_program: Program<'info, System>,
}

/// Accounts for commit
#[commit]
#[derive(Accounts)]
pub struct CommitPayroll<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut)]
    pub payroll_jar: Account<'info, PayrollJar>,
    
    /// CHECK: MagicBlock context
    pub magic_context: UncheckedAccount<'info>,
    
    /// CHECK: MagicBlock program
    pub magic_program: UncheckedAccount<'info>,
}
```

---

## Frontend Integration

### MagicBlock Client

```typescript
// app/lib/magicblock.ts

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  getAuthToken,
  verifyTeeRpcIntegrity,
} from '@magicblock-labs/ephemeral-rollups-sdk';

const TEE_RPC_URL = 'https://tee.magicblock.app';
const DELEGATION_PROGRAM = 'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh';

export interface MagicBlockConfig {
  devnetRpc: string;
}

export class MagicBlockClient {
  private config: MagicBlockConfig;
  private teeConnection: Connection | null = null;
  private authToken: string | null = null;

  constructor(config: MagicBlockConfig) {
    this.config = config;
  }

  /**
   * Verify TEE RPC integrity before connecting
   */
  async verifyTee(): Promise<boolean> {
    try {
      const isVerified = await verifyTeeRpcIntegrity(TEE_RPC_URL);
      console.log(`TEE verification: ${isVerified ? 'PASSED' : 'FAILED'}`);
      return isVerified;
    } catch (error) {
      console.error('TEE verification failed:', error);
      return false;
    }
  }

  /**
   * Get auth token for TEE access
   */
  async authenticate(
    walletPubkey: PublicKey,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
  ): Promise<string> {
    console.log('Authenticating with MagicBlock TEE...');

    const token = await getAuthToken(
      TEE_RPC_URL,
      walletPubkey,
      signMessage
    );

    this.authToken = token;
    console.log('TEE authentication successful');
    
    return token;
  }

  /**
   * Connect to TEE RPC with auth token
   */
  getTeeConnection(): Connection {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    if (!this.teeConnection) {
      this.teeConnection = new Connection(
        `${TEE_RPC_URL}?token=${this.authToken}`,
        'confirmed'
      );
    }

    return this.teeConnection;
  }

  /**
   * Subscribe to real-time balance updates from TEE
   */
  subscribeToBalance(
    payrollJarAddress: PublicKey,
    callback: (balance: bigint) => void
  ): number {
    const connection = this.getTeeConnection();
    
    return connection.onAccountChange(
      payrollJarAddress,
      (accountInfo) => {
        // Parse the PayrollJar data
        // Extract accrued balance
        const data = accountInfo.data;
        // ... parse data based on your account structure
        
        callback(BigInt(0)); // Replace with actual parsed balance
      },
      'confirmed'
    );
  }

  /**
   * Unsubscribe from balance updates
   */
  unsubscribe(subscriptionId: number): void {
    const connection = this.getTeeConnection();
    connection.removeAccountChangeListener(subscriptionId);
  }

  /**
   * Get current balance from TEE (real-time)
   */
  async getRealtimeBalance(payrollJarAddress: PublicKey): Promise<bigint> {
    const connection = this.getTeeConnection();
    const accountInfo = await connection.getAccountInfo(payrollJarAddress);
    
    if (!accountInfo) {
      throw new Error('PayrollJar not found in TEE');
    }

    // Parse and return the accrued balance
    // ... parse data based on your account structure
    
    return BigInt(0); // Replace with actual parsed balance
  }
}

export const createMagicBlockClient = (devnetRpc: string) => {
  return new MagicBlockClient({ devnetRpc });
};
```

### Real-Time Balance Hook

```typescript
// app/hooks/useRealtimeBalance.ts

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { createMagicBlockClient, MagicBlockClient } from '../lib/magicblock';

export function useRealtimeBalance(payrollJarAddress: PublicKey | null) {
  const { publicKey, signMessage } = useWallet();
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStreaming = useCallback(async () => {
    if (!publicKey || !signMessage || !payrollJarAddress) return;

    try {
      const client = createMagicBlockClient(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL!
      );

      // Verify and authenticate
      const isVerified = await client.verifyTee();
      if (!isVerified) {
        throw new Error('TEE verification failed');
      }

      await client.authenticate(publicKey, signMessage);

      // Subscribe to updates
      const subscriptionId = client.subscribeToBalance(
        payrollJarAddress,
        (newBalance) => {
          setBalance(newBalance);
        }
      );

      setIsStreaming(true);

      // Cleanup on unmount
      return () => {
        client.unsubscribe(subscriptionId);
        setIsStreaming(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start streaming');
    }
  }, [publicKey, signMessage, payrollJarAddress]);

  return {
    balance,
    isStreaming,
    error,
    startStreaming,
  };
}
```

---

## Flow Diagram

```
1. Employer creates payroll
   +-- PayrollJar created on Solana L1

2. Delegate to PER
   +-- PayrollJar delegated to TEE validator
   +-- State now private in TEE

3. Real-time streaming
   +-- Employee authenticates with TEE
   +-- Balance updates every ~10ms in TEE
   +-- Employee sees balance "ticking" in UI

4. Withdrawal
   +-- Employee requests withdrawal
   +-- State committed back to L1
   +-- PayrollJar undelegated
   +-- ShadowWire payout executed
```

---

## Checklist

- [ ] Add ephemeral-rollups-sdk to Cargo.toml
- [ ] Install @magicblock-labs/ephemeral-rollups-sdk in frontend
- [ ] Add delegate_payroll_to_per instruction
- [ ] Add commit_and_undelegate instruction
- [ ] Create MagicBlockClient class
- [ ] Implement TEE authentication flow
- [ ] Add real-time balance subscription
- [ ] Create useRealtimeBalance hook
- [ ] Test delegation on devnet
- [ ] Test commit flow on devnet
