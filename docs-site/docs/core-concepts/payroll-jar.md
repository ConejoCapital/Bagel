---
sidebar_position: 1
title: PayrollJar
---

# PayrollJar: The Core Account

The PayrollJar is the fundamental data structure in Bagel. It represents an active payroll relationship between an employer and an employee.

## What is a PayrollJar?

A PayrollJar is a **Program Derived Address (PDA)** that stores:
- The encrypted salary rate
- Accrued funds available for withdrawal
- Timestamps for tracking payment flow
- Reference to the yield-generating vault

Think of it as a smart contract-powered "payroll account" that automatically tracks how much an employee has earned.

## Account Structure

```rust
// Location: programs/bagel/src/state/mod.rs

#[account]
pub struct PayrollJar {
    /// The employer who funds this payroll
    pub employer: Pubkey,                      // 32 bytes

    /// The employee receiving payments
    pub employee: Pubkey,                      // 32 bytes

    /// Encrypted salary per second (Arcium C-SPL)
    /// This keeps the salary amount private on-chain
    pub encrypted_salary_per_second: Vec<u8>, // ~36 bytes

    /// Timestamp of last withdrawal
    pub last_withdraw: i64,                    // 8 bytes

    /// Total accrued since last withdraw
    /// This is the liquid buffer, NOT the salary amount
    pub total_accrued: u64,                    // 8 bytes

    /// Associated vault for yield generation
    pub dough_vault: Pubkey,                   // 32 bytes

    /// Bump seed for PDA derivation
    pub bump: u8,                              // 1 byte

    /// Is this payroll currently active?
    pub is_active: bool,                       // 1 byte
}
```

**Total size:** ~222 bytes (including 8-byte discriminator and padding)

## PDA Derivation

The PayrollJar address is deterministically derived from:

```rust
seeds = [
    b"bagel_jar",           // Constant seed
    employer.key().as_ref(), // Employer's public key
    employee.key().as_ref(), // Employee's public key
]
```

This means:
- Each employer-employee pair has exactly ONE PayrollJar
- The address can be computed client-side without querying the chain
- Re-creating a payroll for the same pair will fail (account already exists)

### TypeScript PDA Derivation

```typescript
import { PublicKey } from '@solana/web3.js';

const BAGEL_PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');
const BAGEL_JAR_SEED = Buffer.from('bagel_jar');

function getPayrollJarPDA(
  employee: PublicKey,
  employer: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      BAGEL_JAR_SEED,
      employer.toBuffer(),  // Employer FIRST
      employee.toBuffer(),  // Employee SECOND
    ],
    BAGEL_PROGRAM_ID
  );
}

// Usage
const [payrollJarPDA, bump] = getPayrollJarPDA(employeeKey, employerKey);
console.log('PayrollJar address:', payrollJarPDA.toBase58());
```

## Field Details

### encrypted_salary_per_second

The salary rate is stored **encrypted** using Arcium C-SPL:

```
┌─────────────────────────────────────────────────────────────┐
│           ENCRYPTED SALARY STORAGE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Plaintext: 3,170,000 lamports/second                      │
│              (~$100,000/year at $100/SOL)                   │
│                                                             │
│           ↓ Arcium Encryption ↓                             │
│                                                             │
│   Ciphertext: [0x2f, 0x8a, 0x1c, 0x7d, ...]                │
│               (32 bytes + metadata)                         │
│                                                             │
│   Key: RescueCipher with SHA3-256                           │
│   Exchange: x25519 ECDH with MXE                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Why encrypt?**
- Validators cannot see salary amounts
- On-chain observers cannot see salary amounts
- Only employer and employee can decrypt
- MPC calculations happen without decryption

### last_withdraw

Unix timestamp of the last withdrawal:

```
Usage: Calculate elapsed time for accrual

elapsed_seconds = current_time - last_withdraw
accrued_amount = encrypted_salary * elapsed_seconds  // Via MPC
```

Set to:
- Current time on payroll creation
- Current time after each withdrawal

### total_accrued

The **liquid buffer** for immediate payouts:

```
When employer deposits 100 SOL:
├── 90 SOL → Kamino vault (yield)
└── 10 SOL → total_accrued (liquid)

When employee withdraws:
├── Calculated amount deducted from total_accrued
└── If insufficient: withdraw from Kamino vault
```

**Note:** This is NOT the encrypted salary. It's the unencrypted liquid balance.

### dough_vault

Reference to the Kamino/Privacy Cash vault position:

```
dough_vault: Pubkey
├── If default (11111...): No vault position
└── If valid: Points to Kamino vault account
```

Used for:
- Tracking yield-generating deposits
- Claiming yield profits
- Withdrawing principal when closing

### is_active

Boolean flag for payroll status:

```
true:  Payroll is active, can deposit/withdraw
false: Payroll is terminated, no operations allowed
```

## Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                PAYROLLJAR LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

1. CREATION (bake_payroll)
   ─────────────────────────
   employer: [set]
   employee: [set]
   encrypted_salary: [encrypted value]
   last_withdraw: [current time]
   total_accrued: 0
   dough_vault: [default]
   is_active: true

2. FUNDING (deposit_dough)
   ────────────────────────
   total_accrued: [increased by 10% of deposit]
   dough_vault: [updated if first deposit]

3. WITHDRAWAL (get_dough)
   ───────────────────────
   total_accrued: [decreased by withdrawn amount]
   last_withdraw: [updated to current time]

4. SALARY CHANGE (update_salary)
   ─────────────────────────────
   encrypted_salary: [new encrypted value]

5. TERMINATION (close_jar)
   ────────────────────────
   is_active: false
   [Account closed, rent returned to employer]
```

## Calculating Accrued Salary

The accrued salary is calculated using **encrypted computation**:

```
                     ┌────────────────────────────────────┐
                     │        ARCIUM MPC NETWORK          │
                     │                                    │
encrypted_salary ───▶│   accrued = salary * elapsed      │───▶ encrypted_accrued
elapsed_seconds ────▶│                                    │
                     │   (Computed without decryption!)   │
                     └────────────────────────────────────┘
```

### Client-Side Display Calculation

For UI purposes only (not for on-chain operations):

```typescript
function calculateAccruedDisplay(
  lastWithdraw: number,
  salaryPerSecond: number,  // Decrypted client-side
  currentTime: number
): number {
  const elapsed = currentTime - lastWithdraw;
  return Math.max(0, elapsed * salaryPerSecond);
}

// Example: Employee dashboard
const accrued = calculateAccruedDisplay(
  payrollJar.lastWithdraw,
  decryptedSalary,  // User decrypts with their key
  Math.floor(Date.now() / 1000)
);

console.log(`You've earned: ${accrued / 1e9} SOL`);
```

## Access Control

| Field | Read | Write |
|-------|------|-------|
| `employer` | Anyone | Set once at creation |
| `employee` | Anyone | Set once at creation |
| `encrypted_salary_per_second` | Anyone (encrypted) | Employer only |
| `last_withdraw` | Anyone | Employee (on withdraw) |
| `total_accrued` | Anyone | Employer (deposit), Employee (withdraw) |
| `dough_vault` | Anyone | System (on deposit) |
| `is_active` | Anyone | Employer (on close) |

## Common Operations

### Create PayrollJar

```typescript
const tx = await createPayroll(
  connection,
  wallet,
  employeeAddress,
  salaryPerSecond  // Will be encrypted
);
```

### Fetch PayrollJar

```typescript
const payrollJar = await fetchPayrollJar(
  connection,
  employeeAddress,
  employerAddress
);

if (payrollJar) {
  console.log('Active:', payrollJar.isActive);
  console.log('Liquid balance:', payrollJar.totalAccrued / 1e9, 'SOL');
  console.log('Last withdrawal:', new Date(payrollJar.lastWithdraw * 1000));
}
```

### Check if PayrollJar Exists

```typescript
const [pda] = getPayrollJarPDA(employeeAddress, employerAddress);
const accountInfo = await connection.getAccountInfo(pda);

if (accountInfo) {
  console.log('PayrollJar exists');
} else {
  console.log('No payroll for this pair');
}
```

## Best Practices

1. **Always derive PDA client-side** - Don't store addresses, compute them
2. **Handle encrypted data carefully** - Never log decrypted salaries
3. **Check is_active before operations** - Closed payrolls reject all transactions
4. **Use proper error handling** - Account may not exist or be closed

## Related Concepts

- [Privacy Layer](./privacy-layer) - How encryption works
- [Yield Generation](./yield-generation) - How dough_vault earns yield

## Code References

- **Account definition:** [programs/bagel/src/state/mod.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/state/mod.rs)
- **Creation logic:** [programs/bagel/src/instructions/bake_payroll.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/instructions/bake_payroll.rs)
- **TypeScript client:** [app/lib/bagel-client.ts](https://github.com/ConejoCapital/Bagel/blob/main/app/lib/bagel-client.ts)
