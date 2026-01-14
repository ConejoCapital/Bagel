# Kam

ino Finance Integration Plan

**Replace Privacy Cash mock with REAL YIELD using Kamino Finance!**

Based on [Kamino's official documentation](https://docs.kamino.finance/build-on-kamino/sdk-and-smart-contracts).

## Overview

Kamino Finance is a battle-tested lending protocol on Solana with:
- **$500M+ TVL** - Production-ready and secure
- **5-15% APY** - Real yield on SOL and USDC
- **Audited** - Multiple security audits completed
- **Easy Integration** - Official SDKs available

### Why Kamino for Bagel?

1. **Real Yield**: Payroll funds earn actual interest
2. **User Benefit**: Employees get 80% of yield as bonus
3. **Employer Benefit**: 20% of yield covers operational costs
4. **Trustless**: No custody, protocol-based
5. **Liquid**: Withdraw anytime

## Architecture

```
Bagel PayrollJar
      │
      ├─> Idle Funds Detected
      │
      ▼
Kamino Lending Market
      │
      ├─> Deposit USDC/SOL
      ├─> Earn yield (5-15% APY)
      │
      ▼
Yield Accrues Automatically
      │
      ├─> Query yield amount
      │
      ▼
Employee Withdraws
      │
      ├─> Principal + 80% of yield
      └─> Employer gets 20% of yield
```

## Kamino Program Information

From [Kamino SDK docs](https://docs.kamino.finance/build-on-kamino/sdk-and-smart-contracts):

### Program IDs
```
Lending Program:   GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW
Liquidity Program: E35i5qn7872eEmBt15e5VGhziUBzCTm43XCSWvDoQNNv
Vaults Program:    Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE
```

### Markets We'll Use
- **SOL Main Market**: Reserve `d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q`
- **USDC Main Market**: Reserve `D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59`

## Implementation

### Step 1: Backend Integration (Rust)

#### Add Dependency
```toml
# programs/bagel/Cargo.toml
[dependencies]
kamino-lending = "0.x.x"  # Check latest version
```

#### Create Kamino Module
File: `programs/bagel/src/privacy/kamino.rs`

```rust
//! Kamino Finance Yield Integration
//! 
//! Integrates with Kamino Lending to generate real yield on idle payroll funds.
//! 
//! **Markets:**
//! - SOL Main Market: For SOL-denominated payrolls
//! - USDC Main Market: For USDC-denominated payrolls (recommended)
//! 
//! **Yield Split:**
//! - 80% to employee (bonus on withdrawal)
//! - 20% to employer (operational funding)

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// Kamino Lending Program ID
pub const KAMINO_LENDING_PROGRAM: Pubkey = pubkey!("GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW");

// USDC Main Market (recommended for payroll)
pub const USDC_MAIN_MARKET: Pubkey = pubkey!("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF");
pub const USDC_RESERVE: Pubkey = pubkey!("D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59");

// SOL Main Market (alternative)
pub const SOL_RESERVE: Pubkey = pubkey!("d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q");

/// Deposit idle payroll funds into Kamino lending vault
/// 
/// This deposits USDC/SOL into Kamino's lending market where it earns yield.
/// The funds remain accessible and can be withdrawn at any time.
pub fn deposit_to_kamino<'info>(
    kamino_program: &AccountInfo<'info>,
    lending_market: &AccountInfo<'info>,
    reserve: &AccountInfo<'info>,
    reserve_liquidity_supply: &AccountInfo<'info>,
    reserve_collateral_mint: &AccountInfo<'info>,
    lending_market_authority: &AccountInfo<'info>,
    user_source_liquidity: &AccountInfo<'info>,
    user_destination_collateral: &AccountInfo<'info>,
    user_transfer_authority: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    msg!("💰 Depositing {} to Kamino for yield generation", amount);
    
    // Build Kamino deposit instruction
    // This is a CPI (Cross-Program Invocation) to Kamino
    let deposit_ix = kamino_lending::instruction::deposit_reserve_liquidity(
        *kamino_program.key,
        amount,
        *user_source_liquidity.key,
        *user_destination_collateral.key,
        *reserve.key,
        *reserve_liquidity_supply.key,
        *reserve_collateral_mint.key,
        *lending_market.key,
        *lending_market_authority.key,
        *user_transfer_authority.key,
    );
    
    // Invoke Kamino program
    anchor_lang::solana_program::program::invoke(
        &deposit_ix,
        &[
            kamino_program.clone(),
            user_source_liquidity.clone(),
            user_destination_collateral.clone(),
            reserve.clone(),
            reserve_liquidity_supply.clone(),
            reserve_collateral_mint.clone(),
            lending_market.clone(),
            lending_market_authority.clone(),
            user_transfer_authority.clone(),
            token_program.clone(),
        ],
    )?;
    
    msg!("✅ Deposit successful! Funds now earning yield via Kamino");
    Ok(())
}

/// Withdraw funds from Kamino including accrued yield
/// 
/// Withdraws the principal plus any yield earned while funds were deposited.
pub fn withdraw_from_kamino<'info>(
    kamino_program: &AccountInfo<'info>,
    lending_market: &AccountInfo<'info>,
    reserve: &AccountInfo<'info>,
    reserve_liquidity_supply: &AccountInfo<'info>,
    reserve_collateral_mint: &AccountInfo<'info>,
    lending_market_authority: &AccountInfo<'info>,
    user_source_collateral: &AccountInfo<'info>,
    user_destination_liquidity: &AccountInfo<'info>,
    user_transfer_authority: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    collateral_amount: u64,
) -> Result<u64> {
    msg!("💸 Withdrawing from Kamino (collateral amount: {})", collateral_amount);
    
    // Build Kamino withdraw instruction
    let withdraw_ix = kamino_lending::instruction::redeem_reserve_collateral(
        *kamino_program.key,
        collateral_amount,
        *user_source_collateral.key,
        *user_destination_liquidity.key,
        *reserve.key,
        *reserve_collateral_mint.key,
        *reserve_liquidity_supply.key,
        *lending_market.key,
        *lending_market_authority.key,
        *user_transfer_authority.key,
    );
    
    // Get liquidity amount before withdrawal
    let liquidity_before = {
        let account = TokenAccount::try_deserialize(
            &mut &user_destination_liquidity.data.borrow()[..]
        )?;
        account.amount
    };
    
    // Invoke Kamino program
    anchor_lang::solana_program::program::invoke(
        &withdraw_ix,
        &[
            kamino_program.clone(),
            user_source_collateral.clone(),
            user_destination_liquidity.clone(),
            reserve.clone(),
            reserve_collateral_mint.clone(),
            reserve_liquidity_supply.clone(),
            lending_market.clone(),
            lending_market_authority.clone(),
            user_transfer_authority.clone(),
            token_program.clone(),
        ],
    )?;
    
    // Get liquidity amount after withdrawal
    let liquidity_after = {
        let account = TokenAccount::try_deserialize(
            &mut &user_destination_liquidity.data.borrow()[..]
        )?;
        account.amount
    };
    
    let withdrawn_amount = liquidity_after
        .checked_sub(liquidity_before)
        .ok_or(error!(ErrorCode::ArithmeticOverflow))?;
    
    msg!("✅ Withdrew {} from Kamino (includes principal + yield)", withdrawn_amount);
    Ok(withdrawn_amount)
}

/// Calculate yield earned on deposited funds
/// 
/// Queries Kamino to determine how much yield has accrued.
/// This is the difference between collateral value and original deposit.
pub fn calculate_yield_earned(
    reserve: &AccountInfo,
    collateral_amount: u64,
    original_deposit: u64,
) -> Result<u64> {
    // Get current exchange rate from reserve
    // collateral_amount * exchange_rate = current_liquidity_value
    // yield = current_liquidity_value - original_deposit
    
    // TODO: Parse Kamino reserve data to get exchange rate
    // For now, return mock calculation
    
    msg!("📊 Calculating yield earned");
    
    // Mock: Assume 10% APY over time deposited
    // Real implementation would query Kamino reserve state
    let estimated_liquidity_value = collateral_amount; // Placeholder
    
    let yield_earned = estimated_liquidity_value
        .checked_sub(original_deposit)
        .ok_or(error!(ErrorCode::ArithmeticUnderflow))?;
    
    msg!("💰 Yield earned: {} (80% goes to employee, 20% to employer)", yield_earned);
    
    Ok(yield_earned)
}

/// Split yield between employee and employer
/// 
/// **Split:**
/// - 80% to employee (as withdrawal bonus)
/// - 20% to employer (to cover operational costs)
pub fn split_yield(total_yield: u64) -> Result<(u64, u64)> {
    let employee_share = total_yield
        .checked_mul(80)
        .ok_or(error!(ErrorCode::ArithmeticOverflow))?
        .checked_div(100)
        .ok_or(error!(ErrorCode::ArithmeticOverflow))?;
    
    let employer_share = total_yield
        .checked_sub(employee_share)
        .ok_or(error!(ErrorCode::ArithmeticUnderflow))?;
    
    msg!("Split yield: Employee {} (80%), Employer {} (20%)", 
        employee_share, employer_share);
    
    Ok((employee_share, employer_share))
}

#[error_code]
pub enum ErrorCode {
    #[msg("Kamino program not found")]
    KaminoProgramNotFound,
    
    #[msg("Invalid lending market")]
    InvalidLendingMarket,
    
    #[msg("Invalid reserve")]
    InvalidReserve,
    
    #[msg("Arithmetic overflow in yield calculation")]
    ArithmeticOverflow,
    
    #[msg("Arithmetic underflow in yield calculation")]
    ArithmeticUnderflow,
    
    #[msg("Deposit to Kamino failed")]
    DepositFailed,
    
    #[msg("Withdrawal from Kamino failed")]
    WithdrawalFailed,
}
```

#### Update Instructions

**deposit_dough.rs**:
```rust
// After transferring funds to jar, deposit to Kamino
kamino::deposit_to_kamino(
    &ctx.accounts.kamino_program,
    &ctx.accounts.kamino_market,
    &ctx.accounts.kamino_reserve,
    &ctx.accounts.kamino_reserve_liquidity,
    &ctx.accounts.kamino_collateral_mint,
    &ctx.accounts.kamino_market_authority,
    &ctx.accounts.jar_token_account,
    &ctx.accounts.jar_kamino_collateral,
    &ctx.accounts.payroll_jar.to_account_info(),
    &ctx.accounts.token_program,
    amount,
)?;
```

**get_dough.rs**:
```rust
// Withdraw from Kamino with yield
let withdrawn = kamino::withdraw_from_kamino(
    &ctx.accounts.kamino_program,
    &ctx.accounts.kamino_market,
    &ctx.accounts.kamino_reserve,
    &ctx.accounts.kamino_reserve_liquidity,
    &ctx.accounts.kamino_collateral_mint,
    &ctx.accounts.kamino_market_authority,
    &ctx.accounts.jar_kamino_collateral,
    &ctx.accounts.jar_token_account,
    &ctx.accounts.payroll_jar.to_account_info(),
    &ctx.accounts.token_program,
    collateral_amount,
)?;

// Calculate yield
let yield_earned = withdrawn.checked_sub(accrued).unwrap_or(0);

// Split yield
let (employee_bonus, employer_fee) = kamino::split_yield(yield_earned)?;

msg!("🎁 Employee bonus from yield: {}", employee_bonus);
msg!("💼 Employer fee from yield: {}", employer_fee);

// Transfer to employee (accrued + bonus)
let total_payout = accrued.checked_add(employee_bonus)?;
```

### Step 2: Frontend Integration (TypeScript)

#### Install SDK
```bash
cd app
npm install @kamino-finance/klend-sdk
```

#### Create Kamino Client
File: `app/lib/kamino.ts`

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { KaminoMarket, KaminoReserve } from '@kamino-finance/klend-sdk';

// Program IDs from Kamino docs
export const KAMINO_LENDING_PROGRAM = new PublicKey(
  'GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW'
);

export const USDC_MAIN_MARKET = new PublicKey(
  '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF'
);

export const USDC_RESERVE = new PublicKey(
  'D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59'
);

export class KaminoYieldClient {
  private connection: Connection;
  private market: KaminoMarket | null = null;
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Initialize Kamino market
   */
  async initialize() {
    this.market = await KaminoMarket.load(
      this.connection,
      USDC_MAIN_MARKET,
      KAMINO_LENDING_PROGRAM
    );
  }
  
  /**
   * Get current APY for USDC reserve
   */
  async getCurrentAPY(): Promise<number> {
    if (!this.market) await this.initialize();
    
    const reserve = this.market!.getReserve(USDC_RESERVE);
    if (!reserve) throw new Error('Reserve not found');
    
    // Get supply APY
    const supplyAPY = reserve.stats.supplyInterestAPY;
    
    return supplyAPY * 100; // Convert to percentage
  }
  
  /**
   * Calculate estimated yield for a given amount and time
   */
  calculateEstimatedYield(
    principal: number,
    apy: number,
    days: number
  ): number {
    const dailyRate = apy / 365 / 100;
    const yield = principal * dailyRate * days;
    return yield;
  }
  
  /**
   * Get yield earned on a deposit
   */
  async getYieldEarned(
    collateralAmount: number,
    originalDeposit: number
  ): Promise<{ total: number; employeeShare: number; employerShare: number }> {
    if (!this.market) await this.initialize();
    
    const reserve = this.market!.getReserve(USDC_RESERVE);
    if (!reserve) throw new Error('Reserve not found');
    
    // Get exchange rate
    const exchangeRate = reserve.getExchangeRate();
    
    // Calculate current value
    const currentValue = collateralAmount * exchangeRate;
    
    // Calculate yield
    const totalYield = currentValue - originalDeposit;
    
    // Split 80/20
    const employeeShare = totalYield * 0.8;
    const employerShare = totalYield * 0.2;
    
    return {
      total: totalYield,
      employeeShare,
      employerShare,
    };
  }
}
```

#### Update UI Components

**Employer Dashboard - Show APY**:
```tsx
const [currentAPY, setCurrentAPY] = useState(0);
const kaminoClient = new KaminoYieldClient(connection);

useEffect(() => {
  kaminoClient.getCurrentAPY().then(setCurrentAPY);
}, []);

return (
  <div className="card">
    <h4>📈 Current Yield Rate</h4>
    <p className="text-3xl font-bold text-green-600">
      {currentAPY.toFixed(2)}% APY
    </p>
    <p className="text-sm text-gray-600">
      Via Kamino Finance • USDC Main Market
    </p>
    <p className="text-xs mt-2">
      Your idle payroll funds earn this rate automatically!
    </p>
  </div>
);
```

**Employee Dashboard - Show Yield Bonus**:
```tsx
const [yieldBonus, setYieldBonus] = useState(0);

// Calculate yield on withdrawal
const calculateYield = async () => {
  const yield = await kaminoClient.getYieldEarned(
    collateralBalance,
    originalDeposit
  );
  setYieldBonus(yield.employeeShare);
};

return (
  <div className="card bg-green-50">
    <h4>🎁 Yield Bonus</h4>
    <p className="text-2xl font-bold text-green-600">
      +{yieldBonus.toFixed(6)} USDC
    </p>
    <p className="text-sm">
      From Kamino yield (you get 80%!)
    </p>
  </div>
);
```

### Step 3: Testing Plan

#### Devnet Testing
1. **Deploy to Devnet**
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   ```

2. **Get Devnet USDC**
   - Use Solana faucet
   - Swap for devnet USDC if needed

3. **Create Test Payroll**
   - Deposit 10 USDC
   - Verify Kamino deposit
   - Check collateral token balance

4. **Wait for Yield**
   - Check APY in Kamino UI
   - Monitor for 24-48 hours
   - Verify yield accrual

5. **Withdraw with Yield**
   - Trigger withdrawal
   - Verify bonus calculation
   - Confirm 80/20 split

#### Mainnet Testing (Small Amounts!)
1. Start with $10-20
2. Monitor for 1 week
3. Verify yield matches expectations
4. Gradually increase limits

## Timeline

### Week 1: Development
- Day 1-2: Backend Kamino integration
- Day 3-4: Frontend Kamino integration
- Day 5: Devnet testing

### Week 2: Testing & Refinement
- Day 1-3: Extended devnet testing
- Day 4-5: Bug fixes and optimization

### Week 3: Mainnet Preparation
- Day 1-2: Security review
- Day 3: Soft launch (small amounts)
- Day 4-5: Monitor and fix issues

### Week 4: Full Launch
- Public announcement
- Marketing push
- Scale up gradually

## Expected Results

### Financial Impact
- **Employer**: Save 20% of yield as operational funding
- **Employee**: Get 80% of yield as bonus (extra income!)
- **Example**: 
  - $10,000 payroll fund
  - 10% APY via Kamino
  - $1,000/year yield
  - Employee gets $800 bonus
  - Employer gets $200 operational funding

### User Experience
- Seamless integration (happens automatically)
- No extra steps required
- Clear yield display in UI
- Transparent calculations

## Success Metrics

- [ ] Kamino deposits working 100%
- [ ] Yield calculation accurate
- [ ] 80/20 split correct
- [ ] UI shows real APY
- [ ] Users earn actual yield
- [ ] No transaction failures

## Resources

- **Kamino Docs**: https://docs.kamino.finance/
- **Lending SDK**: https://github.com/Kamino-Finance/klend-sdk
- **Discord**: Kamino Finance community
- **Support**: Reach out to Kamino team for integration help

---

**Ready to integrate REAL YIELD into Bagel!** 🥯💰

Next step: Start implementing `programs/bagel/src/privacy/kamino.rs`
