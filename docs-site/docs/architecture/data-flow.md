---
sidebar_position: 3
title: Data Flow
---

# Data Flow Documentation

This document provides detailed diagrams and explanations of how data flows through the Bagel system.

## Overview: Complete Payroll Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAYROLL LIFECYCLE                                │
└─────────────────────────────────────────────────────────────────────────┘

Phase 1: SETUP                    Phase 2: STREAMING                Phase 3: PAYOUT
═══════════════                   ══════════════════                ═════════════════

┌──────────┐                      ┌──────────────────┐              ┌──────────────┐
│ Employer │                      │    MagicBlock    │              │   Employee   │
│          │                      │  Ephemeral Rollup│              │              │
│ Creates  │──┐                   │                  │              │  Withdraws   │
│ payroll  │  │                   │  Balance updates │              │  salary      │
└──────────┘  │                   │  every ~100ms    │              └──────┬───────┘
              │                   │                  │                     │
              ▼                   └────────┬─────────┘                     │
┌─────────────────┐                        │                               │
│   PayrollJar    │◀───────────────────────┘                               │
│                 │                                                        │
│ encrypted_salary│─────────────────────────────────────────────────────────
│ total_accrued   │                                                        │
│ last_withdraw   │                                                        │
│ dough_vault ────┼─────────┐                                              │
└─────────────────┘         │                                              │
                            ▼                                              │
                   ┌─────────────────┐      ┌──────────────┐              │
                   │  Kamino Vault   │      │   Arcium     │              │
                   │                 │      │   MPC        │◀─────────────┘
                   │  90% deposited  │      │              │
                   │  earning yield  │      │  Calculates  │
                   │                 │      │  accrued     │
                   └────────┬────────┘      │  (encrypted) │
                            │               └──────┬───────┘
                            │                      │
                   ┌────────▼────────┐            │
                   │  Yield Profits  │            │
                   │                 │            ▼
                   │  Employee: 80%  │     ┌──────────────┐
                   │  Employer: 20%  │     │  ShadowWire  │
                   └─────────────────┘     │              │
                                           │  Private     │
                                           │  transfer    │
                                           │  (Bulletproof)│
                                           └──────────────┘
```

## Flow 1: Create Payroll (bake_payroll)

### Sequence Diagram

```
┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Employer │    │   Client    │    │    Bagel     │    │   Arcium    │
│ Wallet   │    │    SDK      │    │   Program    │    │    MPC      │
└────┬─────┘    └──────┬──────┘    └──────┬───────┘    └──────┬──────┘
     │                 │                  │                   │
     │ Connect wallet  │                  │                   │
     │────────────────▶│                  │                   │
     │                 │                  │                   │
     │ createPayroll(  │                  │                   │
     │   employee,     │                  │                   │
     │   salary/sec    │                  │                   │
     │ )               │                  │                   │
     │────────────────▶│                  │                   │
     │                 │                  │                   │
     │                 │ Derive PDA      │                   │
     │                 │ [bagel_jar,     │                   │
     │                 │  employer,       │                   │
     │                 │  employee]       │                   │
     │                 │─────────────────▶│                   │
     │                 │                  │                   │
     │                 │                  │ encrypt(salary)   │
     │                 │                  │──────────────────▶│
     │                 │                  │                   │
     │                 │                  │◀──────────────────│
     │                 │                  │ ciphertext        │
     │                 │                  │                   │
     │                 │                  │ Initialize:       │
     │                 │                  │ - employer        │
     │                 │                  │ - employee        │
     │                 │                  │ - encrypted_salary│
     │                 │                  │ - last_withdraw   │
     │                 │                  │ - is_active=true  │
     │                 │                  │                   │
     │                 │                  │ emit PayrollBaked │
     │                 │                  │                   │
     │                 │◀─────────────────│                   │
     │                 │ tx signature     │                   │
     │◀────────────────│                  │                   │
     │ Success         │                  │                   │
```

### Data Transformation

```
INPUT                           PROCESSING                      OUTPUT
═════                           ══════════                      ══════

salary_per_second: u64          ┌──────────────────────┐        PayrollJar {
  3_170_000                     │   Arcium Encryption  │          employer: Pubkey
  (~$100k/year)                 │                      │          employee: Pubkey
                                │ RescueCipher x25519  │          encrypted_salary:
employee: Pubkey ──────────────▶│ SHA3-256 security    │────────▶  [0x2f, 0x8a, ...]
                                │                      │          last_withdraw: i64
employer: Pubkey                └──────────────────────┘          total_accrued: 0
  (signer)                                                        is_active: true
                                                                }
```

---

## Flow 2: Deposit Funds (deposit_dough)

### Sequence Diagram

```
┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Employer │    │   Client    │    │    Bagel     │    │   Kamino    │
│ Wallet   │    │    SDK      │    │   Program    │    │   Vault     │
└────┬─────┘    └──────┬──────┘    └──────┬───────┘    └──────┬──────┘
     │                 │                  │                   │
     │ depositDough(   │                  │                   │
     │   100 SOL       │                  │                   │
     │ )               │                  │                   │
     │────────────────▶│                  │                   │
     │                 │                  │                   │
     │                 │ deposit_dough    │                   │
     │                 │ instruction      │                   │
     │                 │─────────────────▶│                   │
     │                 │                  │                   │
     │                 │                  │ Split:            │
     │                 │                  │ 90 SOL → yield    │
     │                 │                  │ 10 SOL → liquid   │
     │                 │                  │                   │
     │                 │                  │ deposit(90 SOL)   │
     │                 │                  │──────────────────▶│
     │                 │                  │                   │
     │                 │                  │◀──────────────────│
     │                 │                  │ kSOL position     │
     │                 │                  │                   │
     │                 │                  │ Update:           │
     │                 │                  │ total_accrued += 10│
     │                 │                  │ dough_vault = vault│
     │                 │                  │                   │
     │                 │                  │ emit DoughAdded   │
     │                 │                  │                   │
     │                 │◀─────────────────│                   │
     │◀────────────────│                  │                   │
```

### Yield Strategy Breakdown

```
Deposit: 100 SOL
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    YIELD STRATEGY                           │
│                                                             │
│   90% = 90 SOL                         10% = 10 SOL         │
│   ────────────                         ────────────         │
│        │                                    │               │
│        ▼                                    ▼               │
│   ┌─────────────────┐              ┌─────────────────┐     │
│   │  Kamino Vault   │              │  Liquid Buffer  │     │
│   │                 │              │                 │     │
│   │  Earns ~5% APY  │              │  For immediate  │     │
│   │  via SOL lending│              │  employee       │     │
│   │                 │              │  payouts        │     │
│   │  90 SOL → 94.5  │              │                 │     │
│   │  after 1 year   │              │  total_accrued  │     │
│   └─────────────────┘              └─────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 3: Withdraw Salary (get_dough)

### Sequence Diagram (Complete Privacy Flow)

```
┌──────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────┐  ┌──────────┐
│ Employee │  │ Client │  │ Bagel  │  │ Arcium │  │ ShadowWire │  │ Employee │
│ Wallet   │  │  SDK   │  │Program │  │  MPC   │  │ Bulletproof│  │ Balance  │
└────┬─────┘  └───┬────┘  └───┬────┘  └───┬────┘  └─────┬──────┘  └────┬─────┘
     │            │           │           │             │              │
     │ get_dough()│           │           │             │              │
     │───────────▶│           │           │             │              │
     │            │           │           │             │              │
     │            │ get_dough │           │             │              │
     │            │ instruction           │             │              │
     │            │──────────▶│           │             │              │
     │            │           │           │             │              │
     │            │           │ Calculate │             │              │
     │            │           │ elapsed = │             │              │
     │            │           │ now - last│             │              │
     │            │           │ (e.g. 30  │             │              │
     │            │           │  days)    │             │              │
     │            │           │           │             │              │
     │            │           │ MPC:      │             │              │
     │            │           │ accrued = │             │              │
     │            │           │ enc_salary│             │              │
     │            │           │ * elapsed │             │              │
     │            │           │──────────▶│             │              │
     │            │           │           │             │              │
     │            │           │           │ Compute in  │              │
     │            │           │           │ MPC network │              │
     │            │           │           │ (encrypted!)│              │
     │            │           │           │             │              │
     │            │           │◀──────────│             │              │
     │            │           │ enc_accrued             │              │
     │            │           │ + BLS sig │             │              │
     │            │           │           │             │              │
     │            │           │ Verify BLS│             │              │
     │            │           │ signature │             │              │
     │            │           │           │             │              │
     │            │           │ Decrypt   │             │              │
     │            │           │ amount    │             │              │
     │            │           │ (only for │             │              │
     │            │           │ transfer) │             │              │
     │            │           │           │             │              │
     │            │           │ Private   │             │              │
     │            │           │ transfer  │             │              │
     │            │           │──────────────────────▶│              │
     │            │           │           │             │              │
     │            │           │           │   Create    │              │
     │            │           │           │ commitment  │              │
     │            │           │           │   C = aG +  │              │
     │            │           │           │       rH    │              │
     │            │           │           │             │              │
     │            │           │           │   Create    │              │
     │            │           │           │ range proof │              │
     │            │           │           │ (672 bytes) │              │
     │            │           │           │             │              │
     │            │           │◀──────────────────────│              │
     │            │           │ commitment +            │              │
     │            │           │ proof      │             │              │
     │            │           │           │             │              │
     │            │           │ Execute   │             │              │
     │            │           │ transfer  │             │              │
     │            │           │ (amount   │             │───────────▶│
     │            │           │  HIDDEN!) │             │              │
     │            │           │           │             │              │
     │            │           │ Update:   │             │              │
     │            │           │ total_accrued -= amount │              │
     │            │           │ last_withdraw = now     │              │
     │            │           │           │             │              │
     │            │           │ emit DoughDelivered     │              │
     │            │           │ (NO AMOUNT!)            │              │
     │            │           │           │             │              │
     │◀───────────│◀──────────│           │             │              │
     │ Success    │           │           │             │              │
```

### Privacy Data Flow

```
                              PRIVACY BOUNDARY
                                    │
     PUBLIC                         │           PRIVATE
     ══════                         │           ═══════
                                    │
┌─────────────────┐                 │    ┌─────────────────┐
│ PayrollJar      │                 │    │ Actual Values   │
│                 │                 │    │                 │
│ encrypted_salary│◀────────────────┼────│ salary: $100k/yr│
│ [0x2f, 0x8a...] │                 │    │ = 3.17M lamp/sec│
│                 │                 │    │                 │
│ last_withdraw:  │                 │    │ accrued: 8.3 SOL│
│ 1704067200      │                 │    │ (30 days work)  │
│                 │                 │    │                 │
└─────────────────┘                 │    └─────────────────┘
                                    │
┌─────────────────┐                 │
│ DoughDelivered  │                 │
│ Event           │                 │
│                 │                 │
│ employee: Pubkey│                 │
│ bagel_jar: PDA  │                 │
│ timestamp: i64  │                 │
│                 │                 │
│ amount: ???     │◀────────────────┼──── NOT INCLUDED!
│ (hidden!)       │                 │     Only sender/receiver
│                 │                 │     know the amount
└─────────────────┘                 │
                                    │
┌─────────────────┐                 │
│ Bulletproof     │                 │
│ Proof           │                 │
│                 │                 │
│ commitment:     │                 │
│ [32 bytes]      │                 │
│                 │                 │
│ range_proof:    │                 │
│ [672 bytes]     │                 │
│                 │                 │
│ Proves:         │                 │
│ 0 ≤ amt < 2^64  │                 │
│ WITHOUT         │                 │
│ revealing amt   │                 │
└─────────────────┘                 │
```

---

## Flow 4: Real-Time Streaming (MagicBlock)

### Ephemeral Rollup Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MAGICBLOCK STREAMING FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

SETUP PHASE:
════════════
┌──────────┐           ┌──────────────┐          ┌──────────────────────┐
│ Employer │ delegate  │   Solana     │ transfer │  MagicBlock          │
│          │──────────▶│   L1         │─────────▶│  Ephemeral Rollup    │
│          │           │              │          │                      │
└──────────┘           │ PayrollJar   │          │  PayrollJar (copy)   │
                       │ owner →      │          │  owner → ER          │
                       │ Delegation   │          │                      │
                       │ Program      │          │  Intel TDX TEE       │
                       └──────────────┘          └──────────────────────┘


STREAMING PHASE (continuous):
═════════════════════════════
                                            ┌──────────────────────────┐
                                            │  MagicBlock ER           │
                                            │                          │
                                            │  t=0:   balance = 0      │
     ┌──────────────────────────────────────│  t=1:   balance = 0.001  │
     │                                      │  t=2:   balance = 0.002  │
     │  WebSocket                           │  t=3:   balance = 0.003  │
     │  subscription                        │  ...                     │
     │                                      │  t=3600: balance = 3.6   │
     │                                      │                          │
     ▼                                      │  Updates every ~100ms    │
┌──────────────┐                            │  (no gas fees!)          │
│  Employee    │                            │                          │
│  Dashboard   │                            │  Privacy via Intel TDX   │
│              │                            │  (hardware enclave)      │
│  Balance:    │                            │                          │
│  3.6 SOL     │                            └──────────────────────────┘
│  (updating   │
│   live!)     │
└──────────────┘


CLAIM PHASE:
════════════
┌──────────────┐          ┌──────────────┐          ┌──────────────────┐
│  Employee    │  claim   │  MagicBlock  │  commit  │    Solana L1     │
│              │─────────▶│      ER      │─────────▶│                  │
│              │          │              │          │  PayrollJar      │
└──────────────┘          │  Finalize    │          │  updated with    │
                          │  balance     │          │  final balance   │
                          │              │          │                  │
                          │  Undelegate  │          │  owner → Program │
                          └──────────────┘          └──────────────────┘
```

---

## Flow 5: Yield Generation (Kamino/Privacy Cash)

### Yield Accumulation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        YIELD GENERATION FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

Day 1: Deposit
══════════════
                                    ┌──────────────────┐
Employer deposits ─────────────────▶│   Bagel Program  │
100 SOL                             │                  │
                                    │   Split 90/10    │
                                    └────────┬─────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      │                                             │
                      ▼                                             ▼
             ┌─────────────────┐                          ┌─────────────────┐
             │  Kamino Vault   │                          │  PayrollJar     │
             │                 │                          │                 │
             │  Deposited:     │                          │  total_accrued: │
             │  90 SOL         │                          │  10 SOL         │
             │                 │                          │  (liquid)       │
             │  Earning:       │                          │                 │
             │  5% APY         │                          └─────────────────┘
             └─────────────────┘


Day 365: Yield Distribution
═══════════════════════════
             ┌─────────────────┐
             │  Kamino Vault   │
             │                 │
             │  Principal:     │
             │  90 SOL         │
             │                 │
             │  Yield:         │
             │  4.5 SOL        │──────────┐
             │  (5% of 90)     │          │
             │                 │          │
             └─────────────────┘          │
                                          ▼
                              ┌─────────────────────────┐
                              │   YIELD DISTRIBUTION    │
                              │                         │
                              │   Total: 4.5 SOL        │
                              │                         │
                              │   ┌─────────────────┐   │
                              │   │ Employee: 80%   │   │
                              │   │ 3.6 SOL         │   │
                              │   │ (bonus!)        │   │
                              │   └─────────────────┘   │
                              │                         │
                              │   ┌─────────────────┐   │
                              │   │ Employer: 20%   │   │
                              │   │ 0.9 SOL         │   │
                              │   │ (profit!)       │   │
                              │   └─────────────────┘   │
                              │                         │
                              └─────────────────────────┘
```

---

## Complete Data Model

### State Transitions

```
                        ┌─────────────────────────────────────┐
                        │           STATE MACHINE             │
                        └─────────────────────────────────────┘

     ┌───────────┐
     │           │
     │  INITIAL  │
     │           │
     └─────┬─────┘
           │
           │ bake_payroll()
           │
           ▼
     ┌───────────┐      deposit_dough()      ┌───────────┐
     │           │◀─────────────────────────▶│           │
     │  ACTIVE   │                           │  FUNDED   │
     │  (empty)  │                           │           │
     └─────┬─────┘                           └─────┬─────┘
           │                                       │
           │ close_jar()                           │ get_dough() /
           │                                       │ claim_excess_dough()
           ▼                                       │
     ┌───────────┐                                 │
     │           │                                 │
     │  CLOSED   │◀────────────────────────────────┘
     │           │         close_jar()
     └───────────┘
```

### Account Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ACCOUNT RELATIONSHIPS                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│    Employer     │
│    (Wallet)     │
└────────┬────────┘
         │ 1
         │
         │ owns/funds
         │
         │ *
┌────────▼────────┐        1         ┌─────────────────┐
│   PayrollJar    │─────────────────▶│    Employee     │
│     (PDA)       │     pays         │    (Wallet)     │
└────────┬────────┘                  └─────────────────┘
         │
         │ references
         │
         │ 1
┌────────▼────────┐
│  Kamino Vault   │
│   Position      │
│                 │
│  Earning yield  │
└─────────────────┘
```

## Next Steps

- [Core Concepts](../core-concepts/payroll-jar) - Deep dive into key concepts
- [API Reference](../reference/program) - Complete instruction documentation
- [Security](../security) - Security model and best practices
