---
sidebar_position: 2
---

# Confidential Tokens Integration

Guide to integrating Inco Confidential Tokens for encrypted transfers.

## Overview

Inco Confidential Tokens enable transfers where amounts are encrypted:

- **Program ID**: `4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N`
- **Token Mint**: `GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt` (USDBagel)

## Dependencies

### Rust (Program)

```toml
[dependencies]
inco-token = { version = "0.1.0" }
```

### TypeScript (Client)

```bash
npm install @inco/sdk
```

## Transfer CPI

### Basic Transfer

```rust
use inco_token::cpi::accounts::IncoTransfer;
use inco_token::cpi::transfer;

pub fn confidential_transfer(
    ctx: &Context<MyInstruction>,
    encrypted_amount: Vec<u8>,
) -> Result<()> {
    let cpi_accounts = IncoTransfer {
        source: ctx.accounts.source_token.to_account_info(),
        destination: ctx.accounts.dest_token.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
        inco_lightning_program: ctx.accounts.inco_lightning.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.inco_token_program.to_account_info(),
        cpi_accounts,
    );

    // input_type: 0 = ciphertext
    transfer(cpi_ctx, encrypted_amount, 0)
}
```

### Transfer with PDA Signer

```rust
pub fn transfer_from_vault(
    ctx: &Context<VaultTransfer>,
    encrypted_amount: Vec<u8>,
) -> Result<()> {
    let vault = &ctx.accounts.master_vault;
    let bump = vault.bump;

    // PDA signer seeds
    let seeds: &[&[&[u8]]] = &[&[MASTER_VAULT_SEED, &[bump]]];

    let cpi_accounts = IncoTransfer {
        source: ctx.accounts.vault_token.to_account_info(),
        destination: ctx.accounts.user_token.to_account_info(),
        authority: vault.to_account_info(),
        inco_lightning_program: ctx.accounts.inco_lightning.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.inco_token_program.to_account_info(),
        cpi_accounts,
        seeds,
    );

    transfer(cpi_ctx, encrypted_amount, 0)
}
```

## Account Setup

### Required Accounts

```rust
#[derive(Accounts)]
pub struct TransferInstruction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Source token account
    #[account(mut)]
    pub source_token: AccountInfo<'info>,

    /// Destination token account
    #[account(mut)]
    pub dest_token: AccountInfo<'info>,

    /// Inco Token program
    #[account(address = INCO_TOKEN_ID)]
    pub inco_token_program: AccountInfo<'info>,

    /// Inco Lightning program (required for encrypted operations)
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
```

## Client Usage

### Encrypt Transfer Amount

```typescript
import { IncoClient } from '@inco/sdk';

const incoClient = new IncoClient({ network: 'devnet' });

// Encrypt the amount
const amount = 100_000_000n; // 100 USDC (6 decimals)
const encryptedAmount = await incoClient.encrypt(amount);

// Submit transfer
await program.methods
  .deposit(Buffer.from(encryptedAmount))
  .accounts({
    depositor: wallet.publicKey,
    sourceToken: userTokenPda,
    destToken: vaultTokenPda,
    incoTokenProgram: INCO_TOKEN_ID,
    incoLightningProgram: INCO_LIGHTNING_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Check Encrypted Balance

```typescript
// Fetch token account
const tokenAccount = await incoClient.getTokenAccount(tokenPda);

// Decrypt balance (requires authorization)
const balance = await incoClient.decryptBalance(tokenAccount.balance);
console.log(`Balance: ${balance / 1_000_000} USDC`);
```

## Token Account Management

### Initialize Token Account

```typescript
// Derive PDA
const [userTokenPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('user_token'),
    userWallet.toBuffer(),
    mintPubkey.toBuffer(),
  ],
  BAGEL_PROGRAM_ID
);

// Initialize
await program.methods
  .initializeUserTokenAccount()
  .accounts({
    owner: userWallet,
    mint: mintPubkey,
    userTokenAccount: userTokenPda,
    incoLightningProgram: INCO_LIGHTNING_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Link Inco Token Account

```typescript
// After Inco token account is created
await program.methods
  .setIncoTokenAccount(incoTokenPubkey)
  .accounts({
    authority: userWallet,
    owner: userWallet,
    mint: mintPubkey,
    userTokenAccount: userTokenPda,
  })
  .rpc();
```

## Privacy Guarantees

| Aspect | Visibility |
|--------|------------|
| Transfer amount | Encrypted |
| Source balance | Encrypted |
| Dest balance | Encrypted |
| Transfer exists | Public |
| Sender address | Public |
| Receiver address | Public |

## Error Handling

### Common Errors

```rust
// Insufficient balance (checked via proof)
// InvalidCiphertext
// AuthorizationFailed
```

### Graceful Handling

```rust
transfer(cpi_ctx, encrypted_amount, 0)
    .map_err(|e| {
        msg!("Confidential transfer failed: {:?}", e);
        match e {
            // Handle specific errors
            _ => BagelError::InvalidState
        }
    })?;
```

## Best Practices

1. **Always encrypt amounts client-side**
2. **Validate ciphertext before CPI**
3. **Use PDA signers for vault operations**
4. **Handle transfer failures gracefully**
5. **Monitor token account state**

## References

- [Inco Confidential Tokens](https://docs.inco.org/svm/tokens)
- [Transfer Guide](https://docs.inco.org/svm/confidential-transfers)
