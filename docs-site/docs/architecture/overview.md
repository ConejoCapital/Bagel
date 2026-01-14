---
sidebar_position: 1
title: Architecture Overview
---

# Architecture Overview

This document provides a comprehensive overview of Bagel's system architecture, explaining how the privacy-first payroll system is designed and how its components interact.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Employer App   │  │  Employee App   │  │  SDK Clients    │         │
│  │  (employer.tsx) │  │  (employee.tsx) │  │  (lib/*.ts)     │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
└───────────┼────────────────────┼────────────────────┼───────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      SOLANA RPC         │
                    │   (Helius / Devnet)     │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                                    │
│                                │                                        │
│  ┌─────────────────────────────▼─────────────────────────────────┐     │
│  │                    BAGEL PROGRAM                               │     │
│  │          8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU          │     │
│  │                                                                │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │     │
│  │  │ Instructions │  │    State     │  │   Privacy    │         │     │
│  │  │              │  │              │  │    Layer     │         │     │
│  │  │ bake_payroll │  │ PayrollJar   │  │              │         │     │
│  │  │ deposit_dough│  │ GlobalState  │  │ ┌──────────┐ │         │     │
│  │  │ get_dough    │  │              │  │ │ Arcium   │ │         │     │
│  │  │ update_salary│  │ Events:      │  │ │ShadowWire│ │         │     │
│  │  │ close_jar    │  │ PayrollBaked │  │ │MagicBlock│ │         │     │
│  │  │ claim_excess │  │ DoughAdded   │  │ │ Kamino   │ │         │     │
│  │  │              │  │ DoughDelivered│ │ └──────────┘ │         │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                 │                                       │
│                    ┌────────────┼────────────┐                          │
│                    │            │            │                          │
│  ┌─────────────────▼──┐  ┌─────▼──────┐  ┌──▼───────────────┐          │
│  │   ARCIUM NETWORK   │  │SHADOWWIRE  │  │   MAGICBLOCK     │          │
│  │   (MPC Nodes)      │  │ (ZK Proofs)│  │   (Ephemeral     │          │
│  │                    │  │            │  │    Rollups)      │          │
│  │   Encrypted        │  │ Bulletproof│  │                  │          │
│  │   Computation      │  │ Transfers  │  │   Real-time      │          │
│  └────────────────────┘  └────────────┘  │   Streaming      │          │
│                                          └──────────────────┘          │
│                                                   │                    │
│                                    ┌──────────────▼──────────────┐     │
│                                    │    KAMINO / PRIVACY CASH    │     │
│                                    │       (Yield Vaults)        │     │
│                                    │                             │     │
│                                    │   SOL Lending → 5-10% APY   │     │
│                                    └─────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Client Layer

The client layer provides user interfaces for employers and employees:

| Component | File | Purpose |
|-----------|------|---------|
| **Employer App** | [employer.tsx](https://github.com/ConejoCapital/Bagel/blob/main/app/pages/employer.tsx) | Create payrolls, deposit funds, claim yield |
| **Employee App** | [employee.tsx](https://github.com/ConejoCapital/Bagel/blob/main/app/pages/employee.tsx) | View balance, withdraw salary |
| **Bagel Client** | [bagel-client.ts](https://github.com/ConejoCapital/Bagel/blob/main/app/lib/bagel-client.ts) | Core program interaction |
| **Arcium Client** | [arcium.ts](https://github.com/ConejoCapital/Bagel/blob/main/app/lib/arcium.ts) | Encryption/decryption |
| **ShadowWire Client** | [shadowwire.ts](https://github.com/ConejoCapital/Bagel/blob/main/app/lib/shadowwire.ts) | Private transfers |
| **MagicBlock Client** | [magicblock.ts](https://github.com/ConejoCapital/Bagel/blob/main/app/lib/magicblock.ts) | Real-time streaming |
| **Privacy Cash Client** | [privacycash.ts](https://github.com/ConejoCapital/Bagel/blob/main/app/lib/privacycash.ts) | Yield operations |

### 2. Bagel Program

The core Solana program handling payroll logic:

```
programs/bagel/src/
├── lib.rs                    # Entry point, instruction dispatch
├── state/mod.rs              # Account structures (PayrollJar, GlobalState)
├── instructions/             # Instruction handlers
│   ├── bake_payroll.rs       # Create payroll
│   ├── deposit_dough.rs      # Fund payroll
│   ├── get_dough.rs          # Withdraw salary
│   ├── update_salary.rs      # Change salary
│   ├── close_jar.rs          # Terminate payroll
│   └── claim_excess_dough.rs # Claim yield
├── privacy/                  # Privacy integrations
│   ├── mod.rs                # Re-exports
│   ├── arcium.rs             # MPC + C-SPL
│   ├── shadowwire.rs         # Bulletproofs
│   ├── magicblock.rs         # Ephemeral Rollups
│   ├── privacycash.rs        # Yield vaults
│   └── kamino.rs             # SOL lending
├── error.rs                  # Error codes
└── constants.rs              # Configuration constants
```

### 3. Privacy Layer

The privacy layer integrates four major privacy technologies:

```
                    ┌─────────────────────────────────────┐
                    │         PRIVACY LAYER               │
                    │                                     │
    ┌───────────────┼───────────────┬───────────────┐     │
    │               │               │               │     │
┌───▼───┐      ┌────▼───┐     ┌────▼────┐    ┌────▼────┐ │
│ARCIUM │      │SHADOW  │     │MAGIC    │    │KAMINO/  │ │
│       │      │WIRE    │     │BLOCK    │    │PRIVACY  │ │
│       │      │        │     │         │    │CASH     │ │
│ MPC   │      │ ZK     │     │ TEE     │    │ Yield   │ │
│ C-SPL │      │ Proofs │     │ Rollups │    │ Vaults  │ │
└───────┘      └────────┘     └─────────┘    └─────────┘ │
                    │                                     │
                    └─────────────────────────────────────┘
```

## Data Flow

### Create Payroll Flow

```
Employer                Bagel Program              Arcium MPC
   │                         │                         │
   │ bake_payroll            │                         │
   │ (employee, salary)      │                         │
   │────────────────────────▶│                         │
   │                         │                         │
   │                         │ encrypt(salary)         │
   │                         │────────────────────────▶│
   │                         │                         │
   │                         │◀────────────────────────│
   │                         │ encrypted_salary        │
   │                         │                         │
   │                         │ Create PayrollJar PDA   │
   │                         │ Store encrypted salary  │
   │                         │ Set last_withdraw = now │
   │                         │ Emit PayrollBaked       │
   │                         │                         │
   │◀────────────────────────│                         │
   │ Transaction signature   │                         │
```

### Withdraw Salary Flow

```
Employee          Bagel Program       Arcium MPC      ShadowWire
   │                   │                  │               │
   │ get_dough()       │                  │               │
   │──────────────────▶│                  │               │
   │                   │                  │               │
   │                   │ Calculate time   │               │
   │                   │ elapsed since    │               │
   │                   │ last_withdraw    │               │
   │                   │                  │               │
   │                   │ MPC compute:     │               │
   │                   │ salary * time    │               │
   │                   │─────────────────▶│               │
   │                   │                  │               │
   │                   │◀─────────────────│               │
   │                   │ encrypted_accrued│               │
   │                   │                  │               │
   │                   │ Decrypt for      │               │
   │                   │ transfer only    │               │
   │                   │                  │               │
   │                   │ Create private   │               │
   │                   │ transfer         │               │
   │                   │─────────────────────────────────▶│
   │                   │                  │               │
   │                   │                  │    Bulletproof│
   │                   │◀─────────────────────────────────│
   │                   │                  │               │
   │                   │ Update state     │               │
   │                   │ Emit DoughDelivered (no amount!) │
   │                   │                  │               │
   │◀──────────────────│                  │               │
   │ Private transfer  │                  │               │
   │ (amount hidden)   │                  │               │
```

### Yield Generation Flow

```
Employer           Bagel Program        Kamino Vault
   │                    │                    │
   │ deposit_dough(100) │                    │
   │───────────────────▶│                    │
   │                    │                    │
   │                    │ Split 90/10:       │
   │                    │ 90 SOL to vault    │
   │                    │ 10 SOL liquid      │
   │                    │                    │
   │                    │ deposit(90 SOL)    │
   │                    │───────────────────▶│
   │                    │                    │
   │                    │◀───────────────────│
   │                    │ kSOL position      │
   │                    │                    │
   │                    │ Store vault ref    │
   │                    │                    │
                        │                    │
        ... time passes, yield accrues ...   │
                        │                    │
   │ claim_excess_dough │                    │
   │───────────────────▶│                    │
   │                    │                    │
   │                    │ query_position()   │
   │                    │───────────────────▶│
   │                    │                    │
   │                    │◀───────────────────│
   │                    │ current_value      │
   │                    │                    │
   │                    │ yield = current -  │
   │                    │         principal  │
   │                    │                    │
   │                    │ withdraw_yield()   │
   │                    │───────────────────▶│
   │                    │                    │
   │◀───────────────────│                    │
   │ yield (20%)        │                    │
   │                    │                    │
   │ Employee gets 80%  │                    │
   │ on next withdrawal │                    │
```

## Account Structure

### PayrollJar PDA

The main account storing payroll data:

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
// Total: ~222 bytes including discriminator and padding
```

**PDA Derivation:**
```
seeds = ["bagel_jar", employer.key(), employee.key()]
```

### GlobalState PDA

System-wide configuration (admin only):

```rust
#[account]
pub struct GlobalState {
    pub admin: Pubkey,         // 32 bytes
    pub is_paused: bool,       // 1 byte
    pub bump: u8,              // 1 byte
    pub total_payrolls: u64,   // 8 bytes
    pub total_volume: u64,     // 8 bytes
}
```

## Security Architecture

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **Salary disclosure** | Arcium MPC encryption - no single party sees plaintext |
| **Transfer amount leak** | ShadowWire Bulletproofs - ZK proofs hide amounts |
| **Balance observation** | MagicBlock TEE - hardware-enforced privacy |
| **Timing attacks** | Minimum withdrawal interval (60 seconds) |
| **Replay attacks** | PDA derivation includes both employer and employee |

### Access Control Matrix

| Operation | Employer | Employee | Anyone |
|-----------|----------|----------|--------|
| `bake_payroll` | ✅ (signer) | ❌ | ❌ |
| `deposit_dough` | ✅ (signer) | ❌ | ❌ |
| `get_dough` | ❌ | ✅ (signer) | ❌ |
| `update_salary` | ✅ (signer) | ❌ | ❌ |
| `close_jar` | ✅ (signer) | ❌ | ❌ |
| `claim_excess_dough` | ✅ (signer) | ❌ | ❌ |
| Read PayrollJar | ✅ | ✅ | ✅ (but encrypted) |

## Network Architecture

### Devnet Deployment

```
┌─────────────────────────────────────────┐
│            DEVNET CLUSTER               │
│                                         │
│  Bagel Program                          │
│  8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU │
│                                         │
│  RPC Endpoints:                         │
│  - https://api.devnet.solana.com        │
│  - https://devnet.helius-rpc.com        │
│                                         │
│  Test Tokens:                           │
│  - SOL (from faucet)                    │
│  - USD1 (mock stablecoin)               │
└─────────────────────────────────────────┘
```

### Privacy Network Dependencies

| Network | Purpose | Endpoint |
|---------|---------|----------|
| **Arcium MPC** | Encrypted computation | Arcium Devnet cluster |
| **ShadowWire** | Private transfers | ShadowWire program |
| **MagicBlock** | Streaming | devnet.magicblock.app |
| **Kamino** | Yield | Kamino Finance devnet |

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| **Transaction time** | ~400ms | Solana block time |
| **Account creation** | ~0.002 SOL | Rent-exempt minimum |
| **PayrollJar size** | ~222 bytes | With discriminator |
| **Max salary/second** | 50,000,000 lamports | ~$50/second at $100/SOL |
| **Min withdrawal interval** | 60 seconds | Anti-spam protection |
| **Yield APY** | 5-10% | Varies by market |

## Next Steps

- [Modules](./modules) - Detailed module documentation
- [Data Flow](./data-flow) - Complete data flow diagrams
- [Core Concepts](../core-concepts/payroll-jar) - Key concepts explained
