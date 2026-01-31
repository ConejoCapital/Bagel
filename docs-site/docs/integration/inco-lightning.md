---
sidebar_position: 1
---

# Inco Lightning Integration

Complete guide to integrating Inco Lightning FHE in Bagel.

## Overview

Inco Lightning provides Fully Homomorphic Encryption (FHE) on Solana:

- **Program ID**: `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`
- **Network**: Devnet (current), Mainnet (planned)
- **Encryption**: TFHE (Torus FHE)

## Dependencies

### Rust (Program)

```toml
[dependencies]
inco-lightning = { version = "0.1.4" }
```

### TypeScript (Client)

```bash
npm install @inco/sdk
```

## Types

### Euint128

Encrypted 128-bit unsigned integer:

```rust
use inco_lightning::types::Euint128;

// 16-byte handle to encrypted value
pub struct Euint128 {
    pub handle: [u8; 16],
}
```

### Ebool

Encrypted boolean:

```rust
use inco_lightning::types::Ebool;

pub struct Ebool {
    pub handle: [u8; 16],
}
```

## CPI Operations

### Create Encrypted Value

```rust
use inco_lightning::cpi::accounts::Operation;
use inco_lightning::cpi::new_euint128;
use inco_lightning::ID as INCO_LIGHTNING_ID;

pub fn create_encrypted_value(
    ctx: &Context<MyInstruction>,
    ciphertext: Vec<u8>,
) -> Result<Euint128> {
    let cpi_accounts = Operation {
        signer: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.inco_lightning_program.to_account_info(),
        cpi_accounts,
    );

    // input_type: 0 = ciphertext, 1 = plaintext
    new_euint128(cpi_ctx, ciphertext, 0)
}
```

### Homomorphic Addition

```rust
use inco_lightning::cpi::e_add;

pub fn add_encrypted(
    ctx: &Context<MyInstruction>,
    a: Euint128,
    b: Euint128,
) -> Result<Euint128> {
    let cpi_accounts = Operation {
        signer: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.inco_lightning_program.to_account_info(),
        cpi_accounts,
    );

    e_add(cpi_ctx, a, b, 0)
}
```

### Homomorphic Subtraction

```rust
use inco_lightning::cpi::e_sub;

pub fn sub_encrypted(
    ctx: &Context<MyInstruction>,
    a: Euint128,  // minuend
    b: Euint128,  // subtrahend
) -> Result<Euint128> {
    let cpi_accounts = Operation {
        signer: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.inco_lightning_program.to_account_info(),
        cpi_accounts,
    );

    e_sub(cpi_ctx, a, b, 0)
}
```

## Client SDK

### Initialize Client

```typescript
import { IncoClient } from '@inco/sdk';

const incoClient = new IncoClient({
  network: 'devnet',
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
});
```

### Encrypt Value

```typescript
// Encrypt a number
const encrypted = await incoClient.encrypt(100_000_000n);

// Encrypt salary (convenience method)
const encryptedSalary = await incoClient.encryptSalary(100_000_000);

// Encrypt pubkey hash
const hash = await incoClient.hashPubkey(publicKey);
const encryptedId = await incoClient.encrypt(hash);
```

### Decrypt Value

```typescript
// Requires authorization
const decrypted = await incoClient.decrypt(encryptedHandle);

// Decrypt salary
const salary = await incoClient.decryptSalary(employee.encryptedSalary);
console.log(`Salary: ${salary / 1_000_000} USDC`);
```

## Account Context

### Required Accounts

```rust
#[derive(Accounts)]
pub struct MyInstruction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Inco Lightning program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
```

### Client-Side

```typescript
await program.methods
  .myInstruction(encrypted)
  .accounts({
    authority: wallet.publicKey,
    incoLightningProgram: new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj'),
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Best Practices

### 1. Always Validate Ciphertext

```rust
require!(!encrypted_amount.is_empty(), BagelError::InvalidCiphertext);
```

### 2. Handle Errors Gracefully

```rust
let result = e_add(cpi_ctx, a, b, 0)
    .map_err(|e| {
        msg!("Inco operation failed: {:?}", e);
        BagelError::Overflow
    })?;
```

### 3. Use Appropriate Input Types

```rust
// 0 = ciphertext (from client encryption)
// 1 = plaintext (for constant values)
new_euint128(cpi_ctx, ciphertext, 0)?;
new_euint128(cpi_ctx, vec![1, 0, 0, ...], 0)?;  // E(1) as ciphertext
```

### 4. Minimize CPI Calls

Batch operations when possible to reduce transaction size.

## Troubleshooting

### "Invalid ciphertext"

- Ensure client-side encryption matches network
- Verify ciphertext is not empty
- Check encryption format

### "Decryption failed"

- Verify authorization (signer must be owner)
- Check network configuration
- Ensure handle is valid

### "CPI error"

- Verify Inco program ID is correct
- Check account info is valid
- Ensure signer has proper permissions

## References

- [Inco Lightning Documentation](https://docs.inco.org/svm/home)
- [Inco SDK Reference](https://docs.inco.org/svm/rust-sdk/overview)
- [FHE Operations](https://docs.inco.org/svm/operations)
