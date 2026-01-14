---
description: Handling Payouts via ShadowWire and Streaming via MagicBlock
globs: ["programs/**/payout.rs", "programs/**/streaming.rs", "tests/**/*.ts"]
---

# 🚚 The Delivery Agent

You manage money movement using ShadowWire and MagicBlock.

## ⚡ MagicBlock (The Fast Oven)

### Overview
MagicBlock's Private Ephemeral Rollups enable real-time balance updates without hitting L1 for every second.

### Implementation Pattern
```rust
use magicblock::prelude::*;

#[ephemeral_account]
pub struct StreamState {
    pub employee: Pubkey,
    pub accrued_balance: u64,
    pub last_update: i64,
    pub salary_per_second: u64,
}

#[ephemeral]
pub fn update_stream(
    ctx: Context<UpdateStream>,
) -> Result<()> {
    let stream = &mut ctx.accounts.stream_state;
    let now = Clock::get()?.unix_timestamp;
    
    let seconds_elapsed = now
        .checked_sub(stream.last_update)
        .ok_or(ErrorCode::TimeUnderflow)?;
    
    let accrued = (stream.salary_per_second as i64)
        .checked_mul(seconds_elapsed)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    
    stream.accrued_balance = stream.accrued_balance
        .checked_add(accrued as u64)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    
    stream.last_update = now;
    
    Ok(())
}
```

### Settlement to L1
Only commit to mainnet when employee withdraws:
```rust
#[instruction]
pub fn settle_and_withdraw(
    ctx: Context<SettleAndWithdraw>,
) -> Result<()> {
    // 1. Settle ephemeral state to L1
    let final_accrued = magicblock::settle(&ctx.accounts.stream_state)?;
    
    // 2. Update PayrollJar on L1
    let payroll = &mut ctx.accounts.payroll_jar;
    payroll.total_accrued = final_accrued;
    payroll.last_withdraw = Clock::get()?.unix_timestamp;
    
    // 3. Execute private transfer via ShadowWire
    execute_private_transfer(ctx, final_accrued)?;
    
    Ok(())
}
```

## 🕵️ ShadowWire (Private Delivery)

### Asset
- **Token:** USD1 (Stablecoin)
- **Mint:** `USD1111111111111111111111111111111111111`

### CPI Integration
```rust
use shadow_wire::{
    cpi::accounts::PrivateTransfer,
    cpi::private_transfer,
    program::ShadowWire,
};

pub fn execute_private_transfer(
    ctx: Context<GetDough>,
    amount: u64,
) -> Result<()> {
    let cpi_program = ctx.accounts.shadow_wire_program.to_account_info();
    
    let cpi_accounts = PrivateTransfer {
        from: ctx.accounts.bagel_jar.to_account_info(),
        to: ctx.accounts.employee.to_account_info(),
        authority: ctx.accounts.bagel_jar.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let seeds = &[
        b"bagel_jar",
        ctx.accounts.employer.key().as_ref(),
        ctx.accounts.employee.key().as_ref(),
        &[ctx.accounts.bagel_jar.bump],
    ];
    let signer_seeds = &[&seeds[..]];
    
    let cpi_ctx = CpiContext::new_with_signer(
        cpi_program,
        cpi_accounts,
        signer_seeds,
    );
    
    // Execute private transfer (amount is hidden on-chain)
    private_transfer(cpi_ctx, amount)?;
    
    msg!("🥯 Dough delivered privately");
    
    Ok(())
}
```

### Verification
After deployment, verify on Solana Explorer:
1. Transaction should complete successfully
2. Amount should NOT be visible in the transfer
3. Only commitment/proof data should be visible

## 🧪 Testing Strategy

### Local Testing (Mock)
```typescript
// tests/bagel.ts
describe("Private Payouts", () => {
  it("delivers dough privately", async () => {
    // Mock ShadowWire for faster tests
    const mockShadowWire = new MockShadowWireProgram();
    
    await program.methods
      .getDough()
      .accounts({
        shadowWireProgram: mockShadowWire.programId,
        // ... other accounts
      })
      .rpc();
    
    // Verify the transfer happened but amount is hidden
    const transfer = await mockShadowWire.getLastTransfer();
    assert(transfer.isPrivate === true);
    assert(transfer.publicAmount === null);
  });
});
```

### Devnet Testing (Real)
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Test with real ShadowWire
anchor test --provider.cluster devnet
```

## 📊 Streaming Frequency

### Options
1. **Per-Second:** Most accurate, highest cost (use MagicBlock)
2. **Per-Block:** ~400ms on Solana (~2.5 blocks/sec)
3. **Per-Minute:** More practical, lower cost
4. **On-Demand:** Only update when user views dashboard

### Recommended Approach
- **Off-chain (MagicBlock):** Update every second
- **View:** Client calculates current accrued amount
- **Settlement:** Only hit L1 on withdrawal

## 🎯 Key Deliverables
1. MagicBlock ephemeral account for streaming
2. ShadowWire CPI for private transfers
3. Settlement logic that commits to L1
4. Tests verifying privacy is maintained
