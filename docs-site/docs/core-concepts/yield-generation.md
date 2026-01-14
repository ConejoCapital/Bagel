---
sidebar_position: 3
title: Yield Generation
---

# Yield Generation

Bagel automatically generates yield on idle payroll funds, creating "free money" for both employers and employees.

## The Problem with Traditional Payroll

```
Traditional Crypto Payroll:
═══════════════════════════

Employer deposits 100 SOL for payroll
        │
        ▼
┌─────────────────┐
│   Sitting Idle  │  ← Earning 0% APY
│   in Contract   │  ← Wasted capital!
└─────────────────┘
        │
        ▼
Employee withdraws over time

Result: 100 SOL deposited → 100 SOL withdrawn
        No yield generated
        Opportunity cost: ~5 SOL/year at 5% APY
```

## The Bagel Solution

```
Bagel Smart Yield Strategy:
═══════════════════════════

Employer deposits 100 SOL
        │
        ▼
┌─────────────────────────────────────────────────┐
│              YIELD STRATEGY                      │
│                                                  │
│   90% → Kamino SOL Vault                         │
│         (Earning 5-10% APY)                      │
│                                                  │
│   10% → Liquid Buffer                            │
│         (For immediate payouts)                  │
│                                                  │
└─────────────────────────────────────────────────┘
        │
        ▼
After 1 year: ~95 SOL deposited, ~4.5 SOL yield

Result:
  Employee gets: Base salary + 3.6 SOL bonus (80%)
  Employer keeps: 0.9 SOL profit (20%)
  WIN-WIN-WIN! 🎉
```

## How It Works

### Step 1: Smart Deposit Splitting

When an employer deposits funds:

```rust
// Location: programs/bagel/src/instructions/deposit_dough.rs

let yield_amount = (amount as u128 * 90 / 100) as u64; // 90% to yield
let liquid_amount = amount - yield_amount;             // 10% liquid

// Deposit 90% to Kamino vault
kamino::deposit_to_kamino_vault(yield_amount, kamino_vault)?;

// Keep 10% liquid for immediate payouts
jar.total_accrued += liquid_amount;
```

### Step 2: Yield Accumulation

The 90% in Kamino earns yield through SOL lending:

```
┌─────────────────────────────────────────────────────────────┐
│                  KAMINO SOL VAULT                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Bagel deposits 90 SOL                                     │
│              │                                              │
│              ▼                                              │
│   Kamino lends to borrowers                                 │
│   (DeFi protocols, traders, etc.)                           │
│              │                                              │
│              ▼                                              │
│   Interest accrues (~5-10% APY)                             │
│              │                                              │
│              ▼                                              │
│   90 SOL → 94.5 SOL (after 1 year at 5%)                   │
│                                                             │
│   Yield = 4.5 SOL 📈                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Yield Distribution

When yield is claimed:

```rust
// Location: programs/bagel/src/privacy/privacycash.rs

pub struct YieldDistribution {
    pub employee_share_bps: u16,  // 8000 = 80%
    pub employer_share_bps: u16,  // 2000 = 20%
}

impl YieldDistribution {
    pub fn split_yield(&self, total_yield: u64) -> (u64, u64) {
        let employee = total_yield * 80 / 100;  // 80% to employee
        let employer = total_yield * 20 / 100;  // 20% to employer
        (employee, employer)
    }
}
```

## Yield Calculation Formula

```
Yield = Principal × APY × (Time / Year)

Where:
  Principal = 90% of deposits (in vault)
  APY = Current Kamino rate (~5-10%)
  Time = Seconds since deposit
  Year = 31,536,000 seconds
```

### Example Calculation

```typescript
function calculateYield(
  principal: number,      // Lamports in vault
  apyBps: number,         // APY in basis points (500 = 5%)
  elapsedSeconds: number  // Time since deposit
): number {
  const SECONDS_PER_YEAR = 31_536_000;

  // yield = principal * (apy/10000) * (elapsed/year)
  const yield = (principal * apyBps * elapsedSeconds) /
                (10000 * SECONDS_PER_YEAR);

  return Math.floor(yield);
}

// Example: 90 SOL for 1 year at 5%
const yield = calculateYield(
  90_000_000_000,  // 90 SOL in lamports
  500,             // 5% APY
  31_536_000       // 1 year in seconds
);
// Result: 4,500,000,000 lamports (4.5 SOL)
```

## Employee Yield Bonus

Employees automatically receive yield bonuses on withdrawal:

```
┌─────────────────────────────────────────────────────────────┐
│              EMPLOYEE YIELD BONUS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Employee's share of vault:                                 │
│    Their accrued salary / Total vault balance               │
│                                                             │
│  Example:                                                   │
│    Employee has earned: 8.3 SOL                             │
│    Total vault balance: 100 SOL                             │
│    Employee share: 8.3%                                     │
│                                                             │
│  Yield calculation:                                         │
│    Total yield: 4.5 SOL                                     │
│    Employee's portion: 4.5 × 8.3% = 0.37 SOL               │
│    Employee's bonus: 0.37 × 80% = 0.30 SOL                 │
│                                                             │
│  Final payout:                                              │
│    Base salary: 8.3 SOL                                     │
│    Yield bonus: 0.30 SOL 🎁                                 │
│    Total: 8.6 SOL                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```rust
// Location: programs/bagel/src/privacy/privacycash.rs

pub fn calculate_employee_yield_bonus(
    vault_position: &mut YieldVaultPosition,
    employee_salary_share: u64,
    total_vault_balance: u64,
) -> Result<u64> {
    // Update vault yield
    vault_position.update_yield()?;

    // Calculate employee's share of yield
    let total_yield = vault_position.accrued_yield;
    let employee_share = (employee_salary_share as u128)
        * (total_yield as u128)
        / (total_vault_balance as u128);

    // Apply 80% employee distribution
    let distribution = YieldDistribution::default();
    let (employee_bonus, _) = distribution.split_yield(employee_share as u64)?;

    Ok(employee_bonus)
}
```

## Employer Yield Claims

Employers can claim their 20% share of accumulated yield:

```typescript
// Claim accumulated yield (employer's 20%)
const txId = await claimExcessDough(
  connection,
  wallet,
  employeeAddress
);
```

### What Happens:

1. **Query Kamino vault** for current position value
2. **Calculate yield** using MPC (privacy-preserving)
3. **Withdraw only yield** (principal stays for payroll)
4. **Transfer 20%** to employer
5. **Reserve 80%** for employee bonuses

## Yield Vault Position

```rust
// Location: programs/bagel/src/privacy/privacycash.rs

pub struct YieldVaultPosition {
    /// Vault account (Kamino)
    pub vault_account: Pubkey,

    /// Principal amount deposited
    pub principal: u64,

    /// Accrued yield (separate from principal)
    pub accrued_yield: u64,

    /// Last yield calculation time
    pub last_yield_update: i64,

    /// APY (basis points, e.g., 500 = 5%)
    pub apy_bps: u16,

    /// Is position active?
    pub is_active: bool,
}
```

## Privacy Considerations

Yield operations maintain privacy through:

1. **Encrypted vault balances:** Individual positions hidden via Privacy Cash
2. **MPC yield calculation:** No decryption of individual values
3. **Private bonus distribution:** ShadowWire hides bonus amounts

```
What's Hidden:
✓ Individual deposit amounts
✓ Individual yield earnings
✓ Employee bonus amounts

What's Public:
✓ Total Value Locked (TVL)
✓ Current APY rate
✓ That yield exists (not amounts)
```

## APY Rates

| Source | Expected APY | Risk Level |
|--------|-------------|------------|
| **Kamino SOL Vault** | 5-8% | Low-Medium |
| **Kamino USDC Vault** | 3-6% | Low |
| **Privacy Cash (Native)** | 4-7% | Low |

APY varies based on:
- Market demand for borrowing
- Utilization rates
- DeFi market conditions

## Best Practices

### For Employers

1. **Deposit in larger chunks** - Reduces gas costs per dollar
2. **Monitor APY rates** - Kamino rates fluctuate
3. **Claim yield periodically** - Don't let it accumulate too long
4. **Maintain liquid buffer** - 10% ensures employee payouts work

### For Employees

1. **Yield is automatic** - No action needed
2. **Bonus on withdrawal** - Included in every payout
3. **Check accumulated bonus** - View in dashboard

## Code References

- **Yield strategy:** [programs/bagel/src/instructions/deposit_dough.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/instructions/deposit_dough.rs)
- **Yield vault:** [programs/bagel/src/privacy/privacycash.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/privacycash.rs)
- **Kamino integration:** [programs/bagel/src/privacy/kamino.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/kamino.rs)
- **Claim logic:** [programs/bagel/src/instructions/claim_excess_dough.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/instructions/claim_excess_dough.rs)

## Related Documentation

- [PayrollJar](./payroll-jar) - Where vault reference is stored
- [Privacy Layer](./privacy-layer) - How yield privacy works
- [Usage Basics](../usage-basics) - How to use yield features
