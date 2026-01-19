# Exact sign_pda_account Field Snippet for Diagnosis

## Current Field Definition

```rust
#[queue_computation_accounts("queue_get_dough_mpc", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct QueueGetDoughMpc<'info> {
    // 1. Payer and sign-PDA (must come first)
    /// CHECK: Payer for computation fees
    /// Note: The macro parameter "payer" refers to this field
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Signer PDA account (required by Arcium macro)
    /// Arcium docs require address = derive_sign_pda!() - this is the canonical pattern
    /// NOTE: Comma after derive_sign_pda!() is required for proc-macro pattern matching
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    
    // 2. Arcium-required accounts (in this exact order)
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
```

## Current Status

- ✅ Comma after `derive_sign_pda!()` added
- ✅ No shadowing of SignerAccount or SIGN_PDA_SEED found
- ✅ Field type is `Account<'info, SignerAccount>`
- ✅ All required attributes present
- ✅ Field order is correct (payer → sign_pda → Arcium accounts)
- ⚠️ Macro still panicking with "Invalid field type"

## Imports

```rust
use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
```

## Cargo.toml

```toml
anchor-lang = { version = "0.32.1", features = ["init-if-needed"] }
arcium-anchor = { version = "0.6.1", features = ["idl-build"] }
```

## Error Message

```
error: Invalid field type for field "sign_pda_account"
  --> programs/bagel/src/lib.rs:42:1
   |
42 | #[queue_computation_accounts("queue_get_dough_mpc", payer)]
```
