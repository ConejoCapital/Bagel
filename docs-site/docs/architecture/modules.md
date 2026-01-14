---
sidebar_position: 2
title: Modules
---

# Module Documentation

This document describes each module in the Bagel program, their responsibilities, and how they interact.

## Module Structure

```
programs/bagel/src/
├── lib.rs                    # Program entry point
├── state/
│   └── mod.rs                # Account structures
├── instructions/
│   ├── mod.rs                # Instruction re-exports
│   ├── bake_payroll.rs       # Create payroll
│   ├── deposit_dough.rs      # Fund payroll
│   ├── get_dough.rs          # Withdraw salary
│   ├── update_salary.rs      # Change salary
│   ├── close_jar.rs          # Terminate payroll
│   └── claim_excess_dough.rs # Claim yield
├── privacy/
│   ├── mod.rs                # Privacy layer interface
│   ├── arcium.rs             # MPC + C-SPL
│   ├── shadowwire.rs         # Bulletproofs
│   ├── magicblock.rs         # Ephemeral Rollups
│   ├── privacycash.rs        # Yield vaults
│   └── kamino.rs             # SOL lending
├── error.rs                  # Error definitions
└── constants.rs              # Configuration
```

## Core Modules

### lib.rs - Program Entry Point

**Location:** [programs/bagel/src/lib.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/lib.rs)

The main entry point that declares the program ID and dispatches instructions:

```rust
declare_id!("8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU");

#[program]
pub mod bagel {
    pub fn bake_payroll(ctx: Context<BakePayroll>, salary_per_second: u64) -> Result<()>
    pub fn deposit_dough(ctx: Context<DepositDough>, amount: u64) -> Result<()>
    pub fn get_dough(ctx: Context<GetDough>) -> Result<()>
    pub fn update_salary(ctx: Context<UpdateSalary>, new_salary_per_second: u64) -> Result<()>
    pub fn close_jar(ctx: Context<CloseJar>) -> Result<()>
    pub fn claim_excess_dough(ctx: Context<ClaimExcessDough>) -> Result<()>
}
```

**Responsibilities:**
- Declare program ID
- Define public instruction entry points
- Re-export all modules

---

### state/mod.rs - Account Structures

**Location:** [programs/bagel/src/state/mod.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/state/mod.rs)

Defines the on-chain account structures and events:

#### PayrollJar

The main payroll account (PDA):

```rust
#[account]
pub struct PayrollJar {
    /// The employer who funds this payroll
    pub employer: Pubkey,

    /// The employee receiving payments
    pub employee: Pubkey,

    /// Encrypted salary per second (Arcium encrypted)
    pub encrypted_salary_per_second: Vec<u8>,

    /// Timestamp of last withdrawal
    pub last_withdraw: i64,

    /// Total accrued since last withdraw
    pub total_accrued: u64,

    /// Associated vault for yield generation
    pub dough_vault: Pubkey,

    /// Bump seed for PDA
    pub bump: u8,

    /// Is this payroll currently active?
    pub is_active: bool,
}
```

#### GlobalState

System-wide admin controls:

```rust
#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub is_paused: bool,
    pub bump: u8,
    pub total_payrolls: u64,
    pub total_volume: u64,
}
```

#### Events

```rust
#[event]
pub struct PayrollBaked { employer, employee, bagel_jar, timestamp }

#[event]
pub struct DoughDelivered { employee, bagel_jar, timestamp }  // No amount!

#[event]
pub struct DoughAdded { employer, amount, timestamp }

#[event]
pub struct YieldClaimed { employer, bagel_jar, yield_amount, timestamp }
```

---

## Instruction Modules

### bake_payroll.rs - Create Payroll

**Location:** [programs/bagel/src/instructions/bake_payroll.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/instructions/bake_payroll.rs)

Creates a new PayrollJar for an employee.

```rust
pub fn handler(ctx: Context<BakePayroll>, salary_per_second: u64) -> Result<()>

#[derive(Accounts)]
pub struct BakePayroll<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    /// CHECK: Employee reference
    pub employee: UncheckedAccount<'info>,

    #[account(
        init,
        payer = employer,
        space = PayrollJar::LEN,
        seeds = [BAGEL_JAR_SEED, employer.key().as_ref(), employee.key().as_ref()],
        bump
    )]
    pub payroll_jar: Account<'info, PayrollJar>,

    pub system_program: Program<'info, System>,
}
```

**Logic Flow:**
1. Validate salary is within bounds (`<= MAX_SALARY_PER_SECOND`)
2. Encrypt salary using Arcium (TODO: currently plaintext)
3. Initialize PayrollJar fields
4. Emit `PayrollBaked` event

---

### deposit_dough.rs - Fund Payroll

**Location:** [programs/bagel/src/instructions/deposit_dough.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/instructions/deposit_dough.rs)

Deposits funds into the payroll account with yield strategy.

```rust
pub fn handler(ctx: Context<DepositDough>, amount: u64) -> Result<()>

#[derive(Accounts)]
pub struct DepositDough<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,
    pub employee: UncheckedAccount<'info>,
    #[account(mut, has_one = employer)]
    pub payroll_jar: Account<'info, PayrollJar>,
    pub system_program: Program<'info, System>,
}
```

**Yield Strategy:**
```
Total Deposit
├── 90% → Kamino SOL Vault (earning yield)
└── 10% → Liquid (immediate payouts)
```

**Logic Flow:**
1. Validate amount > 0
2. Calculate yield/liquid split (90/10)
3. Deposit 90% to Kamino vault
4. Add 10% to `total_accrued`
5. Emit `DoughAdded` event

---

### get_dough.rs - Withdraw Salary

**Location:** [programs/bagel/src/instructions/get_dough.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/instructions/get_dough.rs)

Allows employees to withdraw accrued salary with privacy.

```rust
pub fn handler(ctx: Context<GetDough>) -> Result<()>

#[derive(Accounts)]
pub struct GetDough<'info> {
    #[account(mut)]
    pub employee: Signer<'info>,
    pub employer: UncheckedAccount<'info>,
    #[account(mut, has_one = employee, has_one = employer)]
    pub payroll_jar: Account<'info, PayrollJar>,
    pub system_program: Program<'info, System>,
}
```

**Logic Flow:**
1. Calculate elapsed time since `last_withdraw`
2. Validate elapsed >= `MIN_WITHDRAW_INTERVAL` (60 seconds)
3. Calculate accrued via MPC: `encrypted_salary * elapsed_time`
4. Decrypt amount for transfer
5. Execute private transfer via ShadowWire
6. Update `total_accrued` and `last_withdraw`
7. Emit `DoughDelivered` (NO AMOUNT for privacy!)

---

### update_salary.rs - Change Salary

**Location:** [programs/bagel/src/instructions/update_salary.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/instructions/update_salary.rs)

Allows employer to change an employee's salary rate.

```rust
pub fn handler(ctx: Context<UpdateSalary>, new_salary_per_second: u64) -> Result<()>
```

**Logic Flow:**
1. Validate caller is employer
2. Validate new salary within bounds
3. Re-encrypt new salary
4. Update `encrypted_salary_per_second`

---

### close_jar.rs - Terminate Payroll

**Location:** [programs/bagel/src/instructions/close_jar.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/instructions/close_jar.rs)

Closes a payroll and returns remaining funds to employer.

```rust
pub fn handler(ctx: Context<CloseJar>) -> Result<()>
```

**Logic Flow:**
1. Validate caller is employer
2. Withdraw any remaining funds from Kamino
3. Return funds to employer
4. Close the PayrollJar account
5. Rent returned to employer

---

### claim_excess_dough.rs - Claim Yield

**Location:** [programs/bagel/src/instructions/claim_excess_dough.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/instructions/claim_excess_dough.rs)

Allows employer to claim yield profits while keeping principal intact.

```rust
pub fn handler(ctx: Context<ClaimExcessDough>) -> Result<()>

#[derive(Accounts)]
pub struct ClaimExcessDough<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,
    pub employee: UncheckedAccount<'info>,
    #[account(mut, has_one = employer)]
    pub payroll_jar: Account<'info, PayrollJar>,
    pub kamino_vault_position: UncheckedAccount<'info>,
    pub confidential_token_account: UncheckedAccount<'info>,
    pub arcium_mpc_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
```

**Logic Flow:**
1. Get current kSOL value from Kamino
2. Calculate yield via MPC: `current_value - initial_deposit`
3. Verify BLS signature on MPC result
4. Withdraw only yield (principal stays)
5. Transfer yield to employer
6. Emit `YieldClaimed` event

---

## Privacy Modules

### privacy/mod.rs - Privacy Interface

**Location:** [programs/bagel/src/privacy/mod.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/mod.rs)

Unified interface for all privacy operations:

```rust
// Re-exports
pub use arcium::{ConfidentialBalance as EncryptedU64, encrypt_salary, decrypt_for_transfer};
pub use shadowwire::{execute_private_payout, ShadowWireTransfer};
pub use magicblock::{delegate_payroll_jar, commit_and_undelegate, ERConfig};
pub use privacycash::{deposit_to_vault, YieldVaultPosition, YieldDistribution};
pub use kamino::{deposit_to_kamino_vault, KaminoVaultPosition};

// Main calculation function
pub fn calculate_accrued(
    encrypted_salary: &EncryptedU64,
    elapsed_seconds: u64,
) -> Result<EncryptedU64>
```

---

### privacy/arcium.rs - MPC + C-SPL

**Location:** [programs/bagel/src/privacy/arcium.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/arcium.rs)

Handles encrypted salary storage and MPC computations.

#### Key Types

```rust
/// Encrypted balance (C-SPL)
pub struct ConfidentialBalance {
    pub ciphertext: Vec<u8>,
    pub encryption_pubkey: Option<[u8; 32]>,
}

/// MPC Circuit reference (v0.5.1)
pub struct MPCCircuit {
    pub circuit_id: String,
    pub version: u8,
    pub priority_fee_micro: u64,
}
```

#### Key Functions

```rust
/// Encrypt a salary amount
pub fn encrypt_salary(amount: u64) -> ConfidentialBalance

/// Calculate accrued via MPC (no decryption!)
pub fn calculate_accrued_mpc(
    encrypted_salary: &ConfidentialBalance,
    elapsed_seconds: u64,
) -> Result<ConfidentialBalance>

/// Decrypt for transfer
pub fn decrypt_for_transfer(encrypted: &ConfidentialBalance) -> Result<u64>
```

**v0.5.1 Features:**
- ArgBuilder API for type-safe MPC arguments
- BLS signature verification on outputs
- Priority fee support (compute units)
- SHA3-256 equivalent security (RescueCipher)

---

### privacy/shadowwire.rs - Bulletproofs

**Location:** [programs/bagel/src/privacy/shadowwire.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/shadowwire.rs)

Handles zero-knowledge private transfers.

#### Key Types

```rust
pub struct ShadowWireTransfer {
    pub amount: u64,
    pub recipient_address: [u8; 32],
    pub mint: Pubkey,
    pub commitment: Vec<u8>,      // Pedersen commitment
    pub range_proof: Vec<u8>,     // Bulletproof (~672 bytes)
}
```

#### Key Functions

```rust
/// Execute a private payout
pub fn execute_private_payout(
    amount: u64,
    recipient: Pubkey,
    mint: Pubkey,
) -> Result<()>

/// Initialize encrypted balance account
pub fn initialize_encrypted_balance(
    owner: Pubkey,
    mint: Pubkey,
) -> Result<()>
```

**Privacy Guarantees:**
- Transfer amount: HIDDEN (Bulletproof commitment)
- Sender/receiver balances: HIDDEN
- Only proof validity is public

---

### privacy/magicblock.rs - Ephemeral Rollups

**Location:** [programs/bagel/src/privacy/magicblock.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/magicblock.rs)

Handles real-time streaming via MagicBlock.

#### Key Types

```rust
pub struct ERConfig {
    pub validator: Pubkey,
    pub lifetime: u64,           // Seconds (default: 1 year)
    pub sync_frequency: u64,     // Commit interval (default: 1 hour)
}
```

#### Key Functions

```rust
/// Delegate PayrollJar to Ephemeral Rollup
pub fn delegate_payroll_jar(
    ctx: &Context<DelegatePayrollJar>,
    er_config: ERConfig,
) -> Result<()>

/// Commit state and undelegate
pub fn commit_and_undelegate(
    ctx: &Context<CommitAndUndelegate>,
) -> Result<()>

/// Query ER for current balance
pub fn get_er_balance(
    payroll_jar: &Account<PayrollJar>,
) -> Result<u64>
```

**Features:**
- Sub-100ms state updates
- Intel TDX TEE privacy
- Zero gas fees on ER
- Instant L1 settlement on claim

---

### privacy/privacycash.rs - Yield Vaults

**Location:** [programs/bagel/src/privacy/privacycash.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/privacycash.rs)

Handles yield generation via Privacy Cash.

#### Key Types

```rust
pub struct YieldVaultPosition {
    pub vault_account: Pubkey,
    pub principal: u64,
    pub accrued_yield: u64,
    pub last_yield_update: i64,
    pub apy_bps: u16,            // 500 = 5%
    pub is_active: bool,
}

pub struct YieldDistribution {
    pub employee_share_bps: u16, // Default: 8000 (80%)
    pub employer_share_bps: u16, // Default: 2000 (20%)
}
```

#### Key Functions

```rust
/// Deposit to vault
pub fn deposit_to_vault(
    amount: u64,
    vault_account: Pubkey,
    apy_bps: u16,
) -> Result<YieldVaultPosition>

/// Calculate employee yield bonus
pub fn calculate_employee_yield_bonus(
    vault_position: &mut YieldVaultPosition,
    employee_salary_share: u64,
    total_vault_balance: u64,
) -> Result<u64>
```

**Yield Formula:**
```
yield = principal * (APY / 100) * (elapsed_seconds / 31536000)
```

---

### privacy/kamino.rs - SOL Lending

**Location:** [programs/bagel/src/privacy/kamino.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/kamino.rs)

Handles SOL lending via Kamino Finance.

#### Key Functions

```rust
/// Deposit SOL to Kamino vault
pub fn deposit_to_kamino_vault(
    amount: u64,
    vault_account: Pubkey,
) -> Result<KaminoVaultPosition>
```

---

## Error Module

### error.rs

**Location:** [programs/bagel/src/error.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/error.rs)

```rust
#[error_code]
pub enum BagelError {
    SalaryTooHigh,           // Salary exceeds maximum
    ArithmeticOverflow,      // Calculation overflow
    WithdrawTooSoon,         // < 60 seconds since last withdrawal
    InsufficientFunds,       // Not enough in PayrollJar
    NoAccruedDough,          // Nothing to withdraw
    UnauthorizedEmployer,    // Not the employer
    UnauthorizedEmployee,    // Not the employee
    SystemPaused,            // System is paused
    EncryptionFailed,        // Arcium encryption error
    DecryptionFailed,        // Arcium decryption error
    InvalidTimestamp,        // Bad timestamp
    InvalidAmount,           // Amount must be > 0
    ArithmeticUnderflow,     // Calculation underflow
}
```

---

## Constants Module

### constants.rs

**Location:** [programs/bagel/src/constants.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/constants.rs)

```rust
// PDA Seeds
pub const BAGEL_JAR_SEED: &[u8] = b"bagel_jar";
pub const GLOBAL_STATE_SEED: &[u8] = b"global_state";
pub const DOUGH_VAULT_SEED: &[u8] = b"dough_vault";

// Limits
pub const MAX_SALARY_PER_SECOND: u64 = 50_000_000; // ~$50/sec
pub const MIN_WITHDRAW_INTERVAL: i64 = 60;         // 1 minute

// Program IDs (placeholders)
pub mod program_ids {
    pub const SHADOWWIRE_PROGRAM_ID: &str = "111...";
    pub const USD1_MINT: &str = "111...";
}
```

## Module Dependency Graph

```
lib.rs
  │
  ├── state/mod.rs
  │     └── PayrollJar, GlobalState, Events
  │
  ├── instructions/
  │     ├── bake_payroll.rs ──────┐
  │     ├── deposit_dough.rs ─────┤
  │     ├── get_dough.rs ─────────┤── Uses privacy/*
  │     ├── update_salary.rs ─────┤
  │     ├── close_jar.rs ─────────┤
  │     └── claim_excess_dough.rs ┘
  │
  ├── privacy/
  │     ├── mod.rs (re-exports)
  │     ├── arcium.rs ──────── MPC, C-SPL
  │     ├── shadowwire.rs ──── Bulletproofs
  │     ├── magicblock.rs ──── Streaming
  │     ├── privacycash.rs ─── Yield
  │     └── kamino.rs ──────── SOL lending
  │
  ├── error.rs
  │
  └── constants.rs
```

## Next Steps

- [Data Flow](./data-flow) - Detailed data flow documentation
- [API Reference](../reference/program) - Complete instruction reference
- [Security](../security) - Security model documentation
