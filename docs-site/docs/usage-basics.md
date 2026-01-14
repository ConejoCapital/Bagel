---
sidebar_position: 4
title: Usage Basics
---

# Usage Basics

This guide covers the fundamental workflows for using Bagel, from creating payrolls to withdrawing salaries.

## Core Workflows

### Workflow Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   EMPLOYER   │    │    BAGEL     │    │   EMPLOYEE   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │ 1. bake_payroll   │                   │
       │──────────────────▶│                   │
       │                   │                   │
       │ 2. deposit_dough  │                   │
       │──────────────────▶│                   │
       │                   │                   │
       │                   │ Salary streams    │
       │                   │──────────────────▶│
       │                   │                   │
       │                   │  3. get_dough     │
       │                   │◀──────────────────│
       │                   │                   │
       │ 4. claim_yield    │                   │
       │──────────────────▶│                   │
       │                   │                   │
```

## Employer Operations

### 1. Create a Payroll (`bake_payroll`)

Initialize a new payroll for an employee:

```typescript
import { createPayroll } from './app/lib/bagel-client';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const employeeAddress = new PublicKey('EMPLOYEE_PUBKEY');

// Salary: $100k/year ≈ 3,170,000 lamports/second
// Formula: (annual_salary_usd / sol_price / seconds_per_year) * LAMPORTS_PER_SOL
const salaryPerSecond = 3_170_000; // ~$100k/year at $100/SOL

const txId = await createPayroll(
  connection,
  wallet,
  employeeAddress,
  salaryPerSecond
);

console.log('Payroll created:', txId);
```

**What happens:**
1. A PayrollJar PDA is created with seeds `[BAGEL_JAR_SEED, employer, employee]`
2. Salary is stored in encrypted format (Arcium C-SPL)
3. `last_withdraw` timestamp is set to current time
4. `PayrollBaked` event is emitted

### 2. Fund the Payroll (`deposit_dough`)

Add funds to the payroll account:

```typescript
import { depositDough } from './app/lib/bagel-client';

// Deposit 10 SOL
const depositAmount = 10_000_000_000; // 10 SOL in lamports

const txId = await depositDough(
  connection,
  wallet,
  employeeAddress,
  depositAmount
);

console.log('Funds deposited:', txId);
```

**Yield Strategy:**
- 90% of deposited funds go to Kamino vault (earning yield)
- 10% stays liquid for immediate payouts

```
Deposit: 100 SOL
├── To Kamino (90%): 90 SOL → Earning ~5% APY
└── Liquid (10%): 10 SOL → Available for payouts
```

### 3. Update Salary (`update_salary`)

Change an employee's salary rate:

```typescript
// This functionality requires building custom instruction
// See reference/program for details

const newSalaryPerSecond = 4_000_000; // Raise to ~$126k/year

const instruction = new web3.TransactionInstruction({
  keys: [
    { pubkey: employer, isSigner: true, isWritable: true },
    { pubkey: employee, isSigner: false, isWritable: false },
    { pubkey: payrollJarPDA, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  programId: BAGEL_PROGRAM_ID,
  data: Buffer.concat([
    // update_salary discriminator
    Buffer.from([/* discriminator bytes */]),
    // new_salary_per_second as u64
    Buffer.from(new BN(newSalaryPerSecond).toArray('le', 8))
  ]),
});
```

### 4. Claim Yield Profits (`claim_excess_dough`)

Withdraw yield earned from Kamino vault:

```typescript
// Claim accumulated yield (employer keeps 20%)
const txId = await claimExcessDough(
  connection,
  wallet,
  employeeAddress
);

// Yield is calculated from:
// current_vault_value - initial_deposit = yield_profit
// employer_share = yield_profit * 20%
```

### 5. Close Payroll (`close_jar`)

Terminate a payroll and return remaining funds:

```typescript
import { closePayroll } from './app/lib/bagel-client';

const txId = await closePayroll(
  connection,
  wallet,
  employeeAddress
);

console.log('Payroll closed:', txId);
// Remaining funds returned to employer
```

## Employee Operations

### 1. View Accrued Balance

Check how much salary has accrued:

```typescript
import { fetchPayrollJar, calculateAccrued } from './app/lib/bagel-client';

const payrollJar = await fetchPayrollJar(
  connection,
  employeeWallet.publicKey,
  employerAddress
);

if (payrollJar) {
  // Decrypt salary (client-side)
  const salaryPerSecond = decryptSalary(payrollJar.encryptedSalary);

  // Calculate accrued
  const currentTime = Math.floor(Date.now() / 1000);
  const accrued = calculateAccrued(
    payrollJar.lastWithdraw,
    salaryPerSecond,
    currentTime
  );

  console.log(`Accrued salary: ${accrued / 1e9} SOL`);
}
```

### 2. Withdraw Salary (`get_dough`)

Claim accrued salary:

```typescript
import { withdrawDough } from './app/lib/bagel-client';

const txId = await withdrawDough(
  connection,
  wallet,
  employerAddress
);

console.log('Salary withdrawn:', txId);
```

**Privacy Flow:**
1. Accrued amount calculated via MPC (encrypted computation)
2. Amount decrypted only for transfer
3. ShadowWire creates Bulletproof (hides amount)
4. Transfer executes with hidden amount
5. Event emitted WITHOUT amount (privacy preserved)

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Encrypted │     │    MPC     │     │ Bulletproof│
│   Salary   │────▶│ Calculate  │────▶│  Transfer  │
│ (Arcium)   │     │  Accrued   │     │(ShadowWire)│
└────────────┘     └────────────┘     └────────────┘
                                            │
                                            ▼
                                    Amount is HIDDEN
                                    on-chain! 🔒
```

## Real-Time Streaming (MagicBlock)

For real-time balance updates using MagicBlock Ephemeral Rollups:

### Subscribe to Balance Updates

```typescript
import { MagicBlockClient } from './app/lib/magicblock';

const magicblock = new MagicBlockClient({
  solanaRpcUrl: 'https://api.devnet.solana.com',
  network: 'devnet',
});

// Initialize streaming session
const session = await magicblock.initializeStreamingSession(
  employerAddress,
  employeeAddress,
  salaryPerSecond
);

// Subscribe to real-time updates
magicblock.subscribeToStream(session.sessionId, (balance) => {
  // This fires every ~100ms!
  console.log(`Current balance: ${balance / 1e9} SOL`);
  updateUI(balance);
});
```

### Claim Streamed Balance

```typescript
// When ready to claim (settles to L1)
const txId = await magicblock.claimStreamedBalance(session.sessionId);
```

## Yield Operations (Privacy Cash / Kamino)

### Check Yield Position

```typescript
import { PrivacyCashClient } from './app/lib/privacycash';

const privacyCash = new PrivacyCashClient({
  solanaRpcUrl: 'https://api.devnet.solana.com',
});

// Get vault position
const position = await privacyCash.getVaultPosition(payrollJarAddress);

console.log(`Principal: ${position.principal / 1e9} SOL`);
console.log(`Accrued Yield: ${position.accruedYield / 1e9} SOL`);
console.log(`APY: ${position.apyBps / 100}%`);
```

### Calculate Employee Bonus

```typescript
// Employee gets 80% of yield
const employeeBonus = privacyCash.calculateEmployeeBonus(
  position,
  employeeSalaryShare,  // Employee's portion
  totalVaultBalance     // Total vault
);

console.log(`Your yield bonus: ${employeeBonus / 1e9} SOL`);
```

## Salary Calculations

### Convert Annual Salary to Per-Second Rate

```typescript
function annualToPerSecond(
  annualUsd: number,
  solPriceUsd: number = 100
): number {
  const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60; // 31557600
  const LAMPORTS_PER_SOL = 1_000_000_000;

  const annualSol = annualUsd / solPriceUsd;
  const perSecondSol = annualSol / SECONDS_PER_YEAR;
  const perSecondLamports = Math.floor(perSecondSol * LAMPORTS_PER_SOL);

  return perSecondLamports;
}

// Examples:
annualToPerSecond(100_000);  // ~3,170,000 lamports/sec
annualToPerSecond(50_000);   // ~1,585,000 lamports/sec
annualToPerSecond(200_000);  // ~6,340,000 lamports/sec
```

### Calculate Accrued Amount

```typescript
function calculateAccrued(
  lastWithdraw: number,    // Unix timestamp
  salaryPerSecond: number, // Lamports per second
  currentTime: number      // Current Unix timestamp
): number {
  const elapsed = currentTime - lastWithdraw;
  return Math.max(0, elapsed * salaryPerSecond);
}

// Example: 1 hour elapsed at $100k/year
const accrued = calculateAccrued(
  lastWithdraw,
  3_170_000,
  lastWithdraw + 3600
);
// Result: 11,412,000,000 lamports (~11.4 SOL)
```

## Visual Workflow: Complete Payroll Cycle

```
Day 1: Setup
═══════════════════════════════════════════════════════════════
Employer                          Bagel                Employee
   │                                │                      │
   │ 1. bake_payroll($100k/yr)      │                      │
   │───────────────────────────────▶│                      │
   │                                │ PayrollJar created   │
   │                                │ Salary encrypted     │
   │                                │                      │
   │ 2. deposit_dough(100 SOL)      │                      │
   │───────────────────────────────▶│                      │
   │                                │ 90 SOL → Kamino      │
   │                                │ 10 SOL → Liquid      │
   │                                │                      │

Day 30: First Withdrawal
═══════════════════════════════════════════════════════════════
                                    │                      │
                                    │ Salary streaming...  │
                                    │ (~8.3 SOL accrued)   │
                                    │                      │
                                    │ 3. get_dough()       │
                                    │◀─────────────────────│
                                    │                      │
                                    │ MPC calculates       │
                                    │ Bulletproof created  │
                                    │ Private transfer!    │
                                    │─────────────────────▶│
                                    │                      │
                                    │ Amount: HIDDEN       │
                                    │                      │

Day 365: Year End
═══════════════════════════════════════════════════════════════
   │                                │                      │
   │ 4. claim_excess_dough()        │                      │
   │───────────────────────────────▶│                      │
   │                                │                      │
   │ Yield: ~4.5 SOL                │                      │
   │ Employer gets: 0.9 SOL (20%)   │                      │
   │◀───────────────────────────────│                      │
   │                                │                      │
   │                                │ Employee gets: 3.6   │
   │                                │ SOL bonus (80%)!     │
   │                                │─────────────────────▶│
   │                                │                      │
```

## Common Patterns

### Pattern: Batch Payroll Creation

```typescript
// Create payrolls for multiple employees
const employees = [
  { address: 'ADDR1', salary: 100_000 },
  { address: 'ADDR2', salary: 75_000 },
  { address: 'ADDR3', salary: 120_000 },
];

for (const emp of employees) {
  const salaryPerSecond = annualToPerSecond(emp.salary);
  await createPayroll(connection, wallet, new PublicKey(emp.address), salaryPerSecond);
}
```

### Pattern: Scheduled Deposits

```typescript
// Top up payroll monthly
async function monthlyDeposit(employeeAddress: PublicKey, monthlyAmount: number) {
  const txId = await depositDough(
    connection,
    wallet,
    employeeAddress,
    monthlyAmount * 1e9  // Convert SOL to lamports
  );

  console.log(`Monthly deposit complete: ${txId}`);
}
```

## Next Steps

- [Architecture Overview](./architecture/overview) - Understand system design
- [Core Concepts](./core-concepts/payroll-jar) - Deep dive into key concepts
- [API Reference](./reference/program) - Complete instruction docs
- [Security](./security) - Security model and best practices
