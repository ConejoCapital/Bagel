# Solana Program Development (Skill)

Based on: https://solana.com/docs/programs and https://solana.com/docs/programs/rust

## 🏗️ Program Structure (Anchor)

Reference: https://solana.com/docs/programs/rust/program-structure

### Standard Anchor Layout
```
programs/your-program/
├── Cargo.toml
├── Xargo.toml
└── src/
    ├── lib.rs              # Entrypoint + declare_id!
    ├── constants.rs        # Seeds, limits, magic numbers
    ├── error.rs            # Custom error codes
    ├── state/
    │   └── mod.rs          # Account structs
    └── instructions/
        ├── mod.rs          # Re-exports
        ├── initialize.rs   # One file per instruction
        ├── deposit.rs
        └── withdraw.rs
```

### lib.rs Template
```rust
use anchor_lang::prelude::*;

mod constants;
mod error;
mod instructions;
mod state;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("YourProgramIDHere111111111111111111111111");

#[program]
pub mod your_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, param: u64) -> Result<()> {
        instructions::initialize::handler(ctx, param)
    }
}
```

## 📝 Instruction Pattern

### Best Practice Structure
```rust
// instructions/your_instruction.rs
use anchor_lang::prelude::*;
use crate::{constants::*, error::*, state::*};

/// Business logic handler (testable, pure function)
pub fn handler(
    ctx: Context<YourInstruction>,
    param: u64,
) -> Result<()> {
    // 1. Validate inputs
    require!(param > 0, YourError::InvalidParam);
    
    // 2. Perform business logic with checked arithmetic
    let result = param
        .checked_mul(2)
        .ok_or(YourError::Overflow)?;
    
    // 3. Update state
    let account = &mut ctx.accounts.your_account;
    account.value = result;
    
    // 4. Emit event (for indexers/webhooks)
    emit!(YourEvent {
        value: result,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

/// Account validation (Anchor derives this)
#[derive(Accounts)]
pub struct YourInstruction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"your_seed", authority.key().as_ref()],
        bump,
        has_one = authority,  // Validate ownership
    )]
    pub your_account: Account<'info, YourAccount>,
    
    pub system_program: Program<'info, System>,
}
```

## 🔐 Security Best Practices

Reference: https://solana.com/docs/programs/rust

### 1. PDA Validation
```rust
// ✅ GOOD - Anchor validates seeds automatically
#[account(
    seeds = [b"bagel_jar", employer.key().as_ref()],
    bump,
)]
pub payroll_jar: Account<'info, PayrollJar>,

// ❌ BAD - Manual derivation (error-prone)
let (pda, bump) = Pubkey::find_program_address(
    &[b"bagel_jar", employer.key().as_ref()],
    ctx.program_id,
);
require_keys_eq!(pda, payroll_jar.key(), ErrorCode::InvalidPDA);
```

### 2. Checked Arithmetic
```rust
// ✅ GOOD - Safe arithmetic
let total = amount
    .checked_mul(price)
    .ok_or(ErrorCode::Overflow)?;

// ❌ BAD - Can overflow
let total = amount * price;  // UNSAFE!

// Also in Cargo.toml:
[profile.release]
overflow-checks = true
```

### 3. Access Control
```rust
// ✅ GOOD - Anchor constraints
#[account(
    mut,
    has_one = authority,  // Verify ownership
)]
pub vault: Account<'info, Vault>,
#[account(mut)]
pub authority: Signer<'info>,  // Must sign

// ❌ BAD - Missing validation
pub vault: Account<'info, Vault>,
pub authority: AccountInfo<'info>,  // Anyone can pass this!
```

### 4. Signer Verification
```rust
// ✅ GOOD - Use Signer<'info>
#[account(mut)]
pub authority: Signer<'info>,

// ❌ BAD - AccountInfo doesn't verify signature
pub authority: AccountInfo<'info>,
```

## 🧪 Testing

Reference: https://solana.com/docs/programs/testing/mollusk

### Unit Tests with Mollusk
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use mollusk_svm::Mollusk;
    
    #[test]
    fn test_initialize() {
        let program_id = Pubkey::new_unique();
        let mollusk = Mollusk::new(&program_id, "target/deploy/program");
        
        // Setup accounts
        let authority = Pubkey::new_unique();
        let (pda, bump) = Pubkey::find_program_address(
            &[b"seed", authority.as_ref()],
            &program_id,
        );
        
        // Build instruction
        let instruction = Instruction {
            program_id,
            accounts: vec![/* ... */],
            data: vec![/* ... */],
        };
        
        // Execute and verify
        let result = mollusk.process_instruction(&instruction, &accounts);
        assert!(result.is_ok());
    }
}
```

### Integration Tests with Anchor
```typescript
// tests/program.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { YourProgram } from "../target/types/your_program";

describe("your-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.YourProgram as Program<YourProgram>;
  
  it("Initializes account", async () => {
    const tx = await program.methods
      .initialize(new anchor.BN(100))
      .accounts({
        authority: provider.wallet.publicKey,
        // ... other accounts
      })
      .rpc();
    
    console.log("Transaction signature:", tx);
  });
});
```

## 📦 Account Structure

### Account Definition
```rust
#[account]
pub struct YourAccount {
    pub authority: Pubkey,      // 32 bytes
    pub value: u64,             // 8 bytes
    pub bump: u8,               // 1 byte
    pub is_initialized: bool,   // 1 byte
}

impl YourAccount {
    pub const LEN: usize = 8    // discriminator
        + 32                    // authority
        + 8                     // value
        + 1                     // bump
        + 1                     // is_initialized
        + 64;                   // padding for future fields
}
```

### Account Initialization
```rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        init,
        payer = payer,
        space = YourAccount::LEN,
        seeds = [b"your_seed", payer.key().as_ref()],
        bump,
    )]
    pub your_account: Account<'info, YourAccount>,
    
    pub system_program: Program<'info, System>,
}
```

## 🚀 Deployment

Reference: https://solana.com/docs/programs/deploying

### Deploy to Devnet
```bash
# Build
anchor build

# Get program ID
solana-keygen pubkey target/deploy/program-keypair.json

# Update declare_id! in lib.rs with the above address

# Deploy
anchor deploy --provider.cluster devnet

# Verify
solana program show YOUR_PROGRAM_ID --url devnet
```

### Deploy to Mainnet
```bash
# Set to mainnet (with Helius)
solana config set --url https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Check balance (need ~1-2 SOL for deployment)
solana balance

# Deploy
anchor deploy --provider.cluster mainnet

# Verify on explorer
# https://explorer.solana.com/address/YOUR_PROGRAM_ID
```

## 🎯 Common Patterns

### CPI (Cross-Program Invocation)
```rust
use anchor_spl::token::{self, Transfer};

// Call SPL Token program
let cpi_accounts = Transfer {
    from: ctx.accounts.from.to_account_info(),
    to: ctx.accounts.to.to_account_info(),
    authority: ctx.accounts.authority.to_account_info(),
};

let cpi_program = ctx.accounts.token_program.to_account_info();

// With PDA signer
let seeds = &[
    b"signer_seed",
    authority.key().as_ref(),
    &[bump],
];
let signer_seeds = &[&seeds[..]];

let cpi_ctx = CpiContext::new_with_signer(
    cpi_program,
    cpi_accounts,
    signer_seeds,
);

token::transfer(cpi_ctx, amount)?;
```

### Events
```rust
#[event]
pub struct YourEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// In instruction:
emit!(YourEvent {
    user: ctx.accounts.user.key(),
    amount: 1000,
    timestamp: Clock::get()?.unix_timestamp,
});
```

### Error Codes
```rust
#[error_code]
pub enum YourError {
    #[msg("The amount must be greater than zero")]
    InvalidAmount,
    
    #[msg("Arithmetic overflow occurred")]
    Overflow,
    
    #[msg("Unauthorized access")]
    Unauthorized,
}
```

## 🔗 Essential Resources

- **Program Docs:** https://solana.com/docs/programs/rust
- **Anchor Book:** https://book.anchor-lang.com/
- **Security:** https://solana.com/docs/core/security
- **Examples:** https://github.com/coral-xyz/anchor/tree/master/tests
- **Cookbook:** https://solana.com/developers/cookbook
