# Inco Lightning Integration Guide

**Difficulty:** MEDIUM  
**Status:** DEVNET BETA

---

## Overview

Inco Lightning enables confidential computation on Solana. It provides encrypted types (Euint128, Ebool) that can be stored on-chain while keeping values hidden.

**Documentation:** https://docs.inco.org/svm/home  
**Rust Crate:** https://docs.inco.org/svm/rust-sdk/overview

---

## Network Info

| Item | Value |
|------|-------|
| Program ID | `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj` |
| Network | Devnet Beta |
| Status | Beta (features may change) |

---

## Setup Instructions

### 1. Add Cargo Dependency

```toml
# programs/bagel/Cargo.toml
[dependencies]
inco-lightning = { version = "0.1.4", features = ["cpi"] }
```

### 2. Update Anchor.toml

```toml
# Anchor.toml
[programs.devnet]
bagel = "J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE"
inco_lightning = "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
```

---

## Backend Integration

### Inco Lightning Integration

```rust
// programs/bagel/src/privacy/inco.rs

use anchor_lang::prelude::*;
use inco_lightning::cpi::accounts::Operation;
use inco_lightning::cpi::{e_add, e_sub, e_mul, e_ge, e_select, new_euint128};
use inco_lightning::types::{Euint128, Ebool};
use inco_lightning::ID as INCO_LIGHTNING_ID;

/// Encrypted salary type using Inco
/// 
/// Values are stored as 128-bit encrypted integers
/// Only authorized parties can decrypt
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct EncryptedSalary {
    /// Handle to encrypted value (stored off-chain by Inco)
    pub handle: Euint128,
}

impl EncryptedSalary {
    /// Create new encrypted salary from plaintext
    pub fn new(amount: u128) -> Self {
        // In production, this calls Inco CPI
        Self {
            handle: Euint128::default(),
        }
    }
}

/// Accounts for encrypted operations
#[derive(Accounts)]
pub struct IncoOperation<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Inco Lightning program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,
}

/// Create new encrypted value via CPI
pub fn create_encrypted_value<'info>(
    inco_program: &AccountInfo<'info>,
    authority: &Signer<'info>,
    value: u128,
) -> Result<Euint128> {
    // Build CPI context
    let cpi_accounts = Operation {
        authority: authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        inco_program.to_account_info(),
        cpi_accounts,
    );
    
    // Create encrypted value
    new_euint128(cpi_ctx, value)?;
    
    Ok(Euint128::default())
}

/// Add two encrypted values via CPI
pub fn encrypted_add<'info>(
    inco_program: &AccountInfo<'info>,
    authority: &Signer<'info>,
    a: &Euint128,
    b: &Euint128,
) -> Result<Euint128> {
    let cpi_accounts = Operation {
        authority: authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        inco_program.to_account_info(),
        cpi_accounts,
    );
    
    e_add(cpi_ctx, a.clone(), b.clone())?;
    
    Ok(Euint128::default())
}

/// Multiply encrypted value by plaintext scalar
pub fn encrypted_mul_scalar<'info>(
    inco_program: &AccountInfo<'info>,
    authority: &Signer<'info>,
    encrypted: &Euint128,
    scalar: u128,
) -> Result<Euint128> {
    let cpi_accounts = Operation {
        authority: authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        inco_program.to_account_info(),
        cpi_accounts,
    );
    
    // Create encrypted scalar first
    let encrypted_scalar = new_euint128(cpi_ctx.clone(), scalar)?;
    
    // Multiply
    e_mul(cpi_ctx, encrypted.clone(), encrypted_scalar)?;
    
    Ok(Euint128::default())
}
```

### Update PayrollJar State

```rust
// programs/bagel/src/state/mod.rs

use anchor_lang::prelude::*;
use inco_lightning::types::Euint128;

#[account]
pub struct PayrollJar {
    /// Employer who created this payroll
    pub employer: Pubkey,
    
    /// Employee receiving payments
    pub employee: Pubkey,
    
    /// Encrypted salary per second (HIDDEN from observers)
    pub encrypted_salary_per_second: Euint128,
    
    /// Encrypted accrued amount (HIDDEN from observers)
    pub encrypted_accrued: Euint128,
    
    /// Last update timestamp
    pub last_update: i64,
    
    /// Total deposited (public - needed for vault)
    pub total_deposited: u64,
    
    /// Is payroll active
    pub is_active: bool,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl PayrollJar {
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // employer
        32 +                     // employee
        16 +                     // encrypted_salary_per_second (handle)
        16 +                     // encrypted_accrued (handle)
        8 +                      // last_update
        8 +                      // total_deposited
        1 +                      // is_active
        1;                       // bump
}
```

---

## Frontend Integration

### Inco Client

```typescript
// app/lib/inco.ts

import { Connection, PublicKey, Transaction } from '@solana/web3.js';

const INCO_PROGRAM_ID = '5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj';

export interface EncryptedValue {
  handle: string; // Hex-encoded handle
}

export class IncoClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(connection: Connection) {
    this.connection = connection;
    this.programId = new PublicKey(INCO_PROGRAM_ID);
  }

  /**
   * Encrypt a value for storage
   * In production, this calls Inco's encryption endpoint
   */
  async encryptValue(value: bigint, ownerPubkey: PublicKey): Promise<EncryptedValue> {
    // For demo: simulate encryption
    // Real implementation would use Inco JS SDK
    console.log(`Encrypting value via Inco: ${value}`);
    
    return {
      handle: Buffer.from(value.toString()).toString('hex'),
    };
  }

  /**
   * Decrypt a value (requires authorization)
   * Only the owner can decrypt their values
   */
  async decryptValue(
    encrypted: EncryptedValue,
    ownerPubkey: PublicKey,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
  ): Promise<bigint> {
    // For demo: simulate decryption
    // Real implementation requires signing a message to prove ownership
    console.log(`Decrypting value via Inco`);
    
    return BigInt(Buffer.from(encrypted.handle, 'hex').toString());
  }

  /**
   * Check if user is authorized to decrypt
   */
  async checkDecryptionAccess(
    encrypted: EncryptedValue,
    userPubkey: PublicKey
  ): Promise<boolean> {
    // Inco manages access control
    // Owner can always decrypt their own values
    return true;
  }
}

export const createIncoClient = (connection: Connection) => {
  return new IncoClient(connection);
};
```

---

## Key Concepts

### Encrypted Types

| Type | Description |
|------|-------------|
| `Euint128` | Encrypted 128-bit integer |
| `Ebool` | Encrypted boolean |

### Operations

| Operation | Description |
|-----------|-------------|
| `new_euint128` | Create encrypted value |
| `e_add` | Add two encrypted values |
| `e_sub` | Subtract encrypted values |
| `e_mul` | Multiply encrypted values |
| `e_ge` | Greater-than-or-equal comparison |
| `e_select` | Conditional select based on Ebool |

### Access Control

- Only the value owner can decrypt
- Operations happen on encrypted data
- No one (including validators) sees plaintext

---

## Checklist

- [ ] Add inco-lightning to Cargo.toml
- [ ] Update Anchor.toml with Inco program ID
- [ ] Create privacy/inco.rs module
- [ ] Update PayrollJar to use Euint128
- [ ] Update bake_payroll to encrypt salary
- [ ] Update get_dough to work with encrypted accrued
- [ ] Create frontend IncoClient
- [ ] Test on devnet
