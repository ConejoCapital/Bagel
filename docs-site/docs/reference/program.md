---
sidebar_position: 1
title: Program Reference
---

# Bagel Program Reference

Complete reference for all Bagel program instructions, accounts, and error codes.

## Program Information

| Field | Value |
|-------|-------|
| **Program ID** | `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU` |
| **Network** | Devnet (Mainnet coming soon) |
| **Framework** | Anchor 0.29.0 |
| **Language** | Rust 1.92.0 |

## Instructions

### bake_payroll

Creates a new payroll for an employee.

```rust
pub fn bake_payroll(
    ctx: Context<BakePayroll>,
    salary_per_second: u64,
) -> Result<()>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `salary_per_second` | `u64` | Salary rate in lamports per second |

#### Accounts

| Name | Signer | Writable | Description |
|------|--------|----------|-------------|
| `employer` | ✅ | ✅ | The employer creating the payroll |
| `employee` | ❌ | ❌ | The employee receiving payments |
| `payroll_jar` | ❌ | ✅ | PayrollJar PDA (created) |
| `system_program` | ❌ | ❌ | System program |

#### PDA Seeds

```rust
seeds = [b"bagel_jar", employer.key().as_ref(), employee.key().as_ref()]
```

#### Events Emitted

- `PayrollBaked { employer, employee, bagel_jar, timestamp }`

#### Errors

| Code | Name | Description |
|------|------|-------------|
| `6000` | `SalaryTooHigh` | Salary exceeds MAX_SALARY_PER_SECOND (50M) |

#### Example

```typescript
import { createPayroll } from './lib/bagel-client';

const txId = await createPayroll(
  connection,
  wallet,
  employeePublicKey,
  3_170_000  // ~$100k/year at $100/SOL
);
```

---

### deposit_dough

Deposits funds into the payroll account.

```rust
pub fn deposit_dough(
    ctx: Context<DepositDough>,
    amount: u64,
) -> Result<()>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `amount` | `u64` | Amount in lamports to deposit |

#### Accounts

| Name | Signer | Writable | Description |
|------|--------|----------|-------------|
| `employer` | ✅ | ✅ | The employer funding the payroll |
| `employee` | ❌ | ❌ | Employee reference for PDA |
| `payroll_jar` | ❌ | ✅ | PayrollJar PDA |
| `system_program` | ❌ | ❌ | System program |

#### Yield Strategy

```
Deposit Split:
├── 90% → Kamino SOL Vault (yield)
└── 10% → total_accrued (liquid)
```

#### Events Emitted

- `DoughAdded { employer, amount, timestamp }`

#### Errors

| Code | Name | Description |
|------|------|-------------|
| `6011` | `InvalidAmount` | Amount must be greater than zero |
| `6001` | `ArithmeticOverflow` | Addition overflow |

#### Example

```typescript
import { depositDough } from './lib/bagel-client';

const txId = await depositDough(
  connection,
  wallet,
  employeePublicKey,
  10_000_000_000  // 10 SOL
);
```

---

### get_dough

Withdraws accrued salary for an employee.

```rust
pub fn get_dough(ctx: Context<GetDough>) -> Result<()>
```

#### Parameters

None - calculates amount automatically based on time elapsed.

#### Accounts

| Name | Signer | Writable | Description |
|------|--------|----------|-------------|
| `employee` | ✅ | ✅ | The employee withdrawing |
| `employer` | ❌ | ❌ | Employer reference for PDA |
| `payroll_jar` | ❌ | ✅ | PayrollJar PDA |
| `system_program` | ❌ | ❌ | System program |

#### Privacy Flow

1. Calculate elapsed time since `last_withdraw`
2. Compute accrued via Arcium MPC (encrypted)
3. Decrypt only for transfer
4. Execute via ShadowWire (amount hidden)
5. Update `last_withdraw` timestamp

#### Events Emitted

- `DoughDelivered { employee, bagel_jar, timestamp }` (NO AMOUNT!)

#### Errors

| Code | Name | Description |
|------|------|-------------|
| `6002` | `WithdrawTooSoon` | Must wait MIN_WITHDRAW_INTERVAL (60s) |
| `6004` | `NoAccruedDough` | Nothing has accrued yet |
| `6003` | `InsufficientFunds` | Not enough in PayrollJar |
| `6010` | `InvalidTimestamp` | Time calculation error |

#### Example

```typescript
import { withdrawDough } from './lib/bagel-client';

const txId = await withdrawDough(
  connection,
  wallet,
  employerPublicKey
);
```

---

### update_salary

Updates an employee's salary rate.

```rust
pub fn update_salary(
    ctx: Context<UpdateSalary>,
    new_salary_per_second: u64,
) -> Result<()>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `new_salary_per_second` | `u64` | New salary rate in lamports/second |

#### Accounts

| Name | Signer | Writable | Description |
|------|--------|----------|-------------|
| `employer` | ✅ | ✅ | Employer (must own payroll) |
| `employee` | ❌ | ❌ | Employee reference |
| `payroll_jar` | ❌ | ✅ | PayrollJar PDA |
| `system_program` | ❌ | ❌ | System program |

#### Errors

| Code | Name | Description |
|------|------|-------------|
| `6000` | `SalaryTooHigh` | New salary exceeds maximum |
| `6005` | `UnauthorizedEmployer` | Caller is not the employer |

---

### close_jar

Terminates a payroll and returns remaining funds.

```rust
pub fn close_jar(ctx: Context<CloseJar>) -> Result<()>
```

#### Accounts

| Name | Signer | Writable | Description |
|------|--------|----------|-------------|
| `employer` | ✅ | ✅ | Employer closing the payroll |
| `employee` | ❌ | ❌ | Employee reference |
| `payroll_jar` | ❌ | ✅ | PayrollJar PDA (closed) |
| `system_program` | ❌ | ❌ | System program |

#### Behavior

1. Validates caller is employer
2. Withdraws from Kamino vault (if any)
3. Transfers remaining funds to employer
4. Closes PayrollJar account
5. Returns rent to employer

#### Example

```typescript
import { closePayroll } from './lib/bagel-client';

const txId = await closePayroll(
  connection,
  wallet,
  employeePublicKey
);
```

---

### claim_excess_dough

Claims yield profits from the Kamino vault.

```rust
pub fn claim_excess_dough(ctx: Context<ClaimExcessDough>) -> Result<()>
```

#### Accounts

| Name | Signer | Writable | Description |
|------|--------|----------|-------------|
| `employer` | ✅ | ✅ | Employer claiming yield |
| `employee` | ❌ | ❌ | Employee reference |
| `payroll_jar` | ❌ | ✅ | PayrollJar PDA |
| `kamino_vault_position` | ❌ | ❌ | Kamino position account |
| `confidential_token_account` | ❌ | ❌ | C-SPL encrypted account |
| `arcium_mpc_program` | ❌ | ❌ | Arcium MPC program |
| `system_program` | ❌ | ❌ | System program |

#### Yield Calculation (MPC)

```
yield = current_vault_value - initial_deposit
```

Computed via Arcium MPC without revealing individual values.

#### Events Emitted

- `YieldClaimed { employer, bagel_jar, yield_amount, timestamp }`

---

## Account Structures

### PayrollJar

```rust
#[account]
pub struct PayrollJar {
    pub employer: Pubkey,                      // 32 bytes
    pub employee: Pubkey,                      // 32 bytes
    pub encrypted_salary_per_second: Vec<u8>, // ~36 bytes
    pub last_withdraw: i64,                    // 8 bytes
    pub total_accrued: u64,                    // 8 bytes
    pub dough_vault: Pubkey,                   // 32 bytes
    pub bump: u8,                              // 1 byte
    pub is_active: bool,                       // 1 byte
}
```

**Space:** 222 bytes (including discriminator and padding)

### GlobalState

```rust
#[account]
pub struct GlobalState {
    pub admin: Pubkey,        // 32 bytes
    pub is_paused: bool,      // 1 byte
    pub bump: u8,             // 1 byte
    pub total_payrolls: u64,  // 8 bytes
    pub total_volume: u64,    // 8 bytes
}
```

---

## Events

### PayrollBaked

```rust
#[event]
pub struct PayrollBaked {
    pub employer: Pubkey,
    pub employee: Pubkey,
    pub bagel_jar: Pubkey,
    pub timestamp: i64,
}
```

### DoughDelivered

```rust
#[event]
pub struct DoughDelivered {
    pub employee: Pubkey,
    pub bagel_jar: Pubkey,
    pub timestamp: i64,
    // NOTE: Amount intentionally excluded for privacy!
}
```

### DoughAdded

```rust
#[event]
pub struct DoughAdded {
    pub employer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
```

### YieldClaimed

```rust
#[event]
pub struct YieldClaimed {
    pub employer: Pubkey,
    pub bagel_jar: Pubkey,
    pub yield_amount: u64,
    pub timestamp: i64,
}
```

---

## Error Codes

| Code | Name | Message |
|------|------|---------|
| 6000 | `SalaryTooHigh` | The salary per second exceeds the maximum allowed amount |
| 6001 | `ArithmeticOverflow` | Arithmetic overflow occurred during calculation |
| 6002 | `WithdrawTooSoon` | You must wait longer between withdrawals |
| 6003 | `InsufficientFunds` | Insufficient funds in the BagelJar |
| 6004 | `NoAccruedDough` | The payroll has not accrued any dough yet |
| 6005 | `UnauthorizedEmployer` | Only the employer can perform this action |
| 6006 | `UnauthorizedEmployee` | Only the employee can perform this action |
| 6007 | `SystemPaused` | The BagelJar is paused for maintenance |
| 6008 | `EncryptionFailed` | Encryption operation failed |
| 6009 | `DecryptionFailed` | Decryption operation failed |
| 6010 | `InvalidTimestamp` | Invalid timestamp detected |
| 6011 | `InvalidAmount` | Amount must be greater than zero |
| 6012 | `ArithmeticUnderflow` | Arithmetic underflow occurred during calculation |

---

## Constants

```rust
// PDA Seeds
pub const BAGEL_JAR_SEED: &[u8] = b"bagel_jar";
pub const GLOBAL_STATE_SEED: &[u8] = b"global_state";
pub const DOUGH_VAULT_SEED: &[u8] = b"dough_vault";

// Limits
pub const MAX_SALARY_PER_SECOND: u64 = 50_000_000;  // ~$50/sec
pub const MIN_WITHDRAW_INTERVAL: i64 = 60;          // 1 minute
```

---

## Instruction Discriminators

For manual instruction building:

| Instruction | Discriminator (hex) |
|-------------|---------------------|
| `bake_payroll` | `0x175f686159cfa592` |
| `deposit_dough` | `0x430f358819db275f` |
| `get_dough` | `0x5305fcc4e20c0b24` |
| `close_jar` | `0x5cbd7224ba7b00a3` |

**Calculation:** First 8 bytes of `sha256("global:<instruction_name>")`

---

## Related Documentation

- [TypeScript Client](./typescript-client) - Client library reference
- [Usage Basics](../usage-basics) - Common workflows
- [Architecture](../architecture/overview) - System design
