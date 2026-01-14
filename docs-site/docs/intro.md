---
sidebar_position: 1
slug: /
title: Introduction
---

# Bagel: Privacy-First Payroll for Solana

**Real-time streaming payments • Zero-knowledge transfers • Automated yield generation**

## What is Bagel?

Bagel is a privacy-preserving payroll platform built on Solana that solves the "Glass Office" problem in crypto payroll. Traditional blockchain payments expose sensitive financial data to anyone who can read the chain—competitors can analyze burn rates, employees can see colleagues' salaries, and privacy is non-existent.

Bagel changes this by combining **four major privacy technologies** into a unified payroll solution:

| Technology | Purpose | Privacy Guarantee |
|------------|---------|-------------------|
| **Arcium MPC** | Encrypted salary storage | Amounts never decrypted on-chain |
| **ShadowWire** | Private transfers | Zero-knowledge proofs hide amounts |
| **MagicBlock** | Real-time streaming | Intel TDX TEE protects state updates |
| **Privacy Cash/Kamino** | Yield generation | Vault balances remain encrypted |

## The Problem We Solve

Traditional crypto payroll suffers from critical privacy failures:

```
┌─────────────────────────────────────────────────────────────┐
│              TRADITIONAL CRYPTO PAYROLL                     │
├─────────────────────────────────────────────────────────────┤
│  ❌ Competitors see your burn rate                          │
│  ❌ Colleagues see each other's salaries                    │
│  ❌ Zero financial privacy (addresses linked to identities) │
│  ❌ Idle funds earn nothing (wasted capital)                │
│  ❌ Weekly/monthly payments (waiting for payday)            │
└─────────────────────────────────────────────────────────────┘
```

This "Glass Office" prevents institutional adoption of crypto payroll.

## The Bagel Solution

```
┌─────────────────────────────────────────────────────────────┐
│                   BAGEL PAYROLL                             │
├─────────────────────────────────────────────────────────────┤
│  ✅ Salaries encrypted on-chain (Arcium C-SPL)              │
│  ✅ Transfer amounts hidden (Bulletproof ZK proofs)         │
│  ✅ Balance updates private (MagicBlock TEE)                │
│  ✅ Idle funds earn 5-10% APY (Privacy Cash/Kamino)         │
│  ✅ Real-time streaming payments (every second!)            │
└─────────────────────────────────────────────────────────────┘
```

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BAGEL PAYROLL                            │
│                  (Solana Program)                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PayrollJar  │  │   Privacy    │  │   Streaming  │      │
│  │   (State)    │──│    Layer     │──│    Engine    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼──────┐
│   ARCIUM MPC   │  │  SHADOWWIRE │  │  MAGIC BLOCK  │
│  Encrypted     │  │  ZK Proofs  │  │   Streaming   │
│  Calculations  │  │  Bulletproof│  │   Intel TDX   │
└────────────────┘  └─────────────┘  └───────────────┘
                            │
                    ┌───────▼────────┐
                    │  KAMINO/       │
                    │  PRIVACY CASH  │
                    │  Yield Vaults  │
                    │   5-10% APY    │
                    └────────────────┘
```

## Who Should Use This Documentation?

| Audience | Start Here |
|----------|------------|
| **New Developers** | [Getting Started](./getting-started) |
| **Integration Engineers** | [Architecture Overview](./architecture/overview) |
| **Security Auditors** | [Security Model](./security) |
| **Frontend Developers** | [TypeScript Client Reference](./reference/typescript-client) |
| **Smart Contract Developers** | [Program Reference](./reference/program) |

## Key Features

### 1. Encrypted Salary Storage (Arcium C-SPL)

Salaries are stored as encrypted values on-chain. Even validators cannot see the actual amounts:

```rust
pub struct PayrollJar {
    pub encrypted_salary_per_second: Vec<u8>,  // Arcium MPC encrypted
    pub total_accrued: u64,                     // Only employer/employee know
    // ...
}
```

### 2. Zero-Knowledge Private Transfers (ShadowWire)

When employees withdraw, the transfer amount is hidden using Bulletproof zero-knowledge proofs:

```typescript
const transfer = await shadowwire.executePrivateTransfer({
  amount: accruedSalary,  // Hidden via Bulletproof!
  recipient: employeeWallet,
});
```

### 3. Real-Time Streaming (MagicBlock)

Balance updates happen every second using MagicBlock's Private Ephemeral Rollups:

```typescript
// Watch salary grow in real-time!
magicblock.subscribeToStream(streamId, (balance) => {
  console.log(`Current balance: ${balance} SOL`);
});
```

### 4. Automated Yield Generation (Kamino/Privacy Cash)

Idle payroll funds automatically earn 5-10% APY, split 80/20 between employees and employers:

```
Employer deposits 100 SOL
├── 90% → Kamino vault (earning yield)
└── 10% → Liquid (immediate payouts)

Yield: ~5% APY = 4.5 SOL/year
├── Employee bonus: 3.6 SOL (80%)
└── Employer profit: 0.9 SOL (20%)
```

## Program Deployment

| Network | Program ID |
|---------|------------|
| **Devnet** | `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU` |
| **Mainnet** | Coming soon |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Solana |
| **Smart Contracts** | Anchor 0.29.0 / Rust 1.92.0 |
| **Frontend** | Next.js 15.1.4 / TypeScript 5.7.2 |
| **Privacy** | Arcium v0.5.1, ShadowWire, MagicBlock, Kamino |
| **RPC** | Helius |

## Next Steps

- [Get Started](./getting-started) - Set up your development environment
- [Architecture Overview](./architecture/overview) - Understand how Bagel works
- [Core Concepts](./core-concepts/payroll-jar) - Learn the fundamental concepts
- [API Reference](./reference/program) - Explore the program instructions
