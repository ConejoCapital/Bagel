---
sidebar_position: 1
---

# Architecture Overview

Complete technical architecture of the Bagel Protocol.

## System Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js)"]
        WA[Wallet Adapter]
        IS[Inco SDK]
        UI[Dashboard UI]
    end

    subgraph Privacy["Privacy Layer"]
        IL[Inco Lightning<br/>FHE Engine]
        IT[Inco Tokens<br/>Confidential Transfers]
        MB[MagicBlock<br/>TEE Streaming]
    end

    subgraph Program["Bagel Program"]
        MV[MasterVault]
        BE[BusinessEntry]
        EE[EmployeeEntry]
    end

    subgraph Chain["Solana"]
        DEV[Devnet]
        MAIN[Mainnet]
    end

    WA --> |Sign| Program
    IS --> |Encrypt| IL
    UI --> |Display| WA

    IL --> |CPI| MV
    IT --> |Transfer| MV
    MB --> |Delegate| EE

    MV --> DEV
    BE --> DEV
    EE --> DEV
```

## Component Architecture

### 1. Frontend Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 15 | SSR + React |
| Styling | Tailwind CSS v4 | Design system |
| Wallet | Solana Wallet Adapter | Multi-wallet support |
| State | React Query | Server state |
| Encryption | Inco SDK | Client-side FHE |

### 2. Privacy Layer

| Component | Program ID | Purpose |
|-----------|------------|---------|
| Inco Lightning | `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj` | FHE operations |
| Inco Token Program | `4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N` | Encrypted transfers |
| MagicBlock | `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` | TEE delegation |

### 3. Program Layer

| Account | Purpose | Privacy |
|---------|---------|---------|
| MasterVault | Global fund pool | Encrypted counts |
| BusinessEntry | Employer account | Encrypted balance/ID |
| EmployeeEntry | Employee account | Encrypted salary/accrued |
| UserTokenAccount | Token account registry | PDA-based |

## Data Flow

### Business Registration

```mermaid
sequenceDiagram
    participant E as Employer
    participant SDK as Inco SDK
    participant B as Bagel Program
    participant IL as Inco Lightning
    participant S as Solana

    E->>SDK: hashPubkey(employer)
    SDK-->>E: hash
    E->>SDK: encrypt(hash)
    SDK-->>E: ciphertext

    E->>B: register_business(ciphertext)
    B->>IL: new_euint128(ciphertext)
    IL-->>B: Euint128 handle
    B->>S: Create BusinessEntry PDA
    S-->>B: Success
    B-->>E: BusinessRegistered
```

### Deposit Flow

```mermaid
sequenceDiagram
    participant E as Employer
    participant SDK as Inco SDK
    participant B as Bagel Program
    participant IT as Inco Tokens
    participant IL as Inco Lightning

    E->>SDK: encrypt(amount)
    SDK-->>E: encrypted_amount

    E->>B: deposit(encrypted_amount)
    B->>IT: transfer(encrypted_amount)
    IT->>IL: Process encrypted
    IL-->>IT: Success
    IT-->>B: Transfer complete

    B->>IL: e_add(balance, amount)
    IL-->>B: Updated balance
    B-->>E: FundsDeposited
```

### Withdrawal Flow

```mermaid
sequenceDiagram
    participant EE as Employee
    participant SDK as Inco SDK
    participant B as Bagel Program
    participant IT as Inco Tokens
    participant IL as Inco Lightning

    EE->>SDK: encrypt(amount)
    SDK-->>EE: encrypted_amount

    EE->>B: request_withdrawal(encrypted_amount)
    B->>B: Verify is_active
    B->>B: Check rate limit

    B->>IT: transfer(encrypted_amount)
    IT->>IL: Process encrypted
    IL-->>IT: Success
    IT-->>B: Transfer complete

    B->>IL: e_sub(accrued, amount)
    IL-->>B: Updated accrued
    B-->>EE: WithdrawalProcessed
```

## Security Architecture

### Access Control

```mermaid
graph TD
    A[Authority] -->|Controls| MV[MasterVault]
    E[Employer] -->|Owns| BE[BusinessEntry]
    EE[Employee] -->|Accesses| EEA[EmployeeEntry]

    MV -->|References| BE
    BE -->|References| EEA
```

### PDA Derivation

```
MasterVault
├── Seeds: ["master_vault"]
├── Bump: Computed
└── Owner: Bagel Program

BusinessEntry
├── Seeds: ["entry", master_vault, index]
├── Index: Sequential counter
└── Owner: Bagel Program

EmployeeEntry
├── Seeds: ["employee", business_entry, index]
├── Index: Sequential counter
└── Owner: Bagel Program
```

## Network Configuration

### Devnet

```toml
[programs.devnet]
bagel = "AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj"

[provider]
cluster = "devnet"
```

### Mainnet (Planned)

```toml
[programs.mainnet]
bagel = "TBD"

[provider]
cluster = "mainnet-beta"
```

## Infrastructure

### RPC Provider

- **Provider**: Helius
- **Devnet**: `https://devnet.helius-rpc.com`
- **Features**: DAS API, Websockets, Enhanced transactions

### TEE Infrastructure

- **Provider**: MagicBlock
- **Validator**: `FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA`
- **Update frequency**: ~10ms

## Scalability

| Metric | Limit |
|--------|-------|
| Businesses per vault | Unlimited |
| Employees per business | Unlimited |
| Concurrent operations | ~1000 TPS |
| Account size | 10 MB |
| CPI depth | 4 levels |

## Next Steps

- [Account Structures](./accounts) - Detailed account layouts
- [Instructions](./instructions) - All program instructions
- [Data Flow](./data-flow) - Complete data flow diagrams
- [Mathematics](./mathematics) - Cryptographic formulas
