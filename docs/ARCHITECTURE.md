# Bagel Architecture

Technical architecture overview of the Bagel privacy-first payroll platform.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  • Wallet Adapter • Real-time UI • Helius RPC               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Privacy SDK Layer (Client-Side)                 │
│  • Inco Lightning (FHE)  • ShadowWire ZK                   │
│  • MagicBlock PERs       • Range Compliance                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          Bagel Program (Solana Smart Contract)              │
│  • Encrypted State   • Confidential Token Transfers        │
│  • Stream Management • Index-Based PDAs                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Solana Blockchain                         │
│  • Devnet (current)  • Mainnet (planned)                    │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Solana Program (`programs/bagel/`)
- **Language**: Rust (Anchor Framework)
- **Program ID**: `J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE` (Devnet)
- **Instructions**:
  - `initialize_vault` - Create master vault (one-time)
  - `register_business` - Register employer business
  - `deposit` - Deposit funds (confidential tokens)
  - `add_employee` - Add employee with encrypted salary
  - `request_withdrawal` - Employee withdrawal (confidential tokens)
  - `configure_confidential_mint` - Enable confidential tokens
  - `migrate_vault` - Upgrade vault schema
  - `close_vault` - Close vault (testing)
  - `delegate_to_tee` - Delegate to MagicBlock TEE
  - `commit_from_tee` - Commit TEE state to L1

### 2. Privacy Layer (`programs/bagel/src/privacy/`)

#### Inco Lightning (FHE)
- **Purpose**: Encrypted salary storage and computation
- **File**: `privacy/inco.rs`
- **Type**: Fully Homomorphic Encryption
- **Status**: Production (devnet)
- **Features**: Encrypted IDs, balances, salaries, counts

#### Inco Confidential Tokens
- **Purpose**: Encrypted token transfers
- **Program ID**: `HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22`
- **Status**: Production (devnet)
- **Features**: Transfer amounts encrypted on-chain

#### ShadowWire
- **Purpose**: Zero-knowledge private transfers
- **File**: `privacy/shadowwire.rs`
- **Type**: Bulletproofs ZK
- **Status**: Mainnet ready
- **Features**: Hide withdrawal amounts

#### MagicBlock
- **Purpose**: Real-time streaming payments
- **File**: `privacy/magicblock.rs`
- **Type**: Private Ephemeral Rollups
- **Status**: Devnet
- **Features**: TEE-based real-time balance updates

### 3. Frontend (`app/`)
- **Framework**: Next.js 15 + TypeScript
- **Wallet**: Solana Wallet Adapter
- **RPC**: Helius (high-performance)
- **Styling**: Tailwind CSS v4

## Data Flow

### Creating a Payroll

```
Employer (Frontend)
  │
  ├─> Range compliance check
  ├─> Register business
  │
  ▼
Bagel Program (register_business)
  │
  ├─> Create BusinessEntry PDA (index-based)
  ├─> Encrypt employer ID via Inco Lightning
  │
  ▼
Add Employee
  │
  ├─> Create EmployeeEntry PDA (index-based)
  ├─> Encrypt employee ID and salary via Inco Lightning
  │
  ▼
Solana Blockchain
  │
  └─> BusinessEntry and EmployeeEntry created ✓
```

### Depositing Funds

```
Employer (Frontend)
  │
  ├─> Encrypt deposit amount
  │
  ▼
Bagel Program (deposit)
  │
  ├─> Transfer confidential tokens (encrypted amount)
  ├─> Update encrypted business balance (homomorphic add)
  │
  ▼
Solana Blockchain
  │
  └─> Transfer amount encrypted ✓
      Balance encrypted ✓
```

### Streaming Payments (Optional)

```
MagicBlock PER (Off-chain TEE)
  │
  ├─> Update balance every ~10ms
  ├─> Track accrued amount in TEE
  │
  ▼
Employee Requests Withdrawal
  │
  ├─> Commit TEE state to L1
  ├─> Calculate accrued (encrypted computation)
  │
  ▼
Confidential Token Transfer
  │
  ├─> Transfer with encrypted amount
  │
  ▼
Employee Wallet
  │
  └─> Funds received (amount hidden) ✓
```

## State Management

### MasterVault Account

```rust
pub struct MasterVault {
    pub authority: Pubkey,
    pub total_balance: u64,                    // Public (unavoidable)
    pub encrypted_business_count: Euint128,    // Encrypted
    pub encrypted_employee_count: Euint128,    // Encrypted
    pub next_business_index: u64,
    pub is_active: bool,
    pub bump: u8,
    pub confidential_mint: Pubkey,             // USDBagel mint
    pub use_confidential_tokens: bool,         // Feature flag
}
```

### BusinessEntry Account

```rust
pub struct BusinessEntry {
    pub master_vault: Pubkey,
    pub entry_index: u64,                      // Used in PDA (not employer pubkey!)
    pub encrypted_employer_id: Euint128,       // Encrypted
    pub encrypted_balance: Euint128,          // Encrypted
    pub encrypted_employee_count: Euint128,   // Encrypted
    pub next_employee_index: u64,
    pub is_active: bool,
    pub bump: u8,
}
```

### EmployeeEntry Account

```rust
pub struct EmployeeEntry {
    pub business_entry: Pubkey,
    pub employee_index: u64,                   // Used in PDA (not employee pubkey!)
    pub encrypted_employee_id: Euint128,      // Encrypted
    pub encrypted_salary: Euint128,           // Encrypted
    pub encrypted_accrued: Euint128,          // Encrypted
    pub last_action: i64,
    pub is_active: bool,
    pub bump: u8,
}
```

### Seeds for PDAs (Privacy-Preserving)

```rust
// MasterVault: No identity linkage
[b"master_vault"]

// BusinessEntry: Index-based (not employer pubkey!)
[b"entry", master_vault, entry_index]

// EmployeeEntry: Index-based (not employee pubkey!)
[b"employee", business_entry, employee_index]
```

## Security Measures

### Access Control
- Authority can only modify their own vault
- Employee can only withdraw from their own entry
- PDA validation using Anchor's seed constraints

### Arithmetic Safety
- All math uses `checked_*` operations
- Overflow protection on all calculations
- `overflow-checks = true` in Cargo.toml

### Privacy Guarantees
- Transfer amounts encrypted (confidential tokens)
- Salary amounts encrypted (Inco Lightning)
- Account balances encrypted (Inco Lightning)
- Identities encrypted (Inco Lightning)
- No pubkeys in PDA seeds (index-based)

## Network Configuration

### Devnet (Current)
- **RPC**: Helius Devnet
- **Explorer**: https://explorer.solana.com?cluster=devnet
- **Faucet**: https://faucet.solana.com
- **Confidential Tokens**: Enabled
- **USDBagel Mint**: `A3G2NBGL7xH9T6BYwVkwRGsSYxtFPdg4HSThfTmV94ht`

### Mainnet (Planned)
- **RPC**: Helius Mainnet
- **Confidential Tokens**: Full deployment
- **ShadowWire**: Real ZK proofs

## Performance Characteristics

### Transaction Costs
- Initialize vault: ~0.002 SOL
- Register business: ~0.002 SOL
- Deposit: ~0.001 SOL
- Add employee: ~0.002 SOL
- Withdraw: ~0.001 SOL

### Latency
- On-chain tx: 400-600ms
- PER updates: <100ms (MagicBlock)
- Encryption operations: <50ms (Inco)

### Scalability
- Businesses per vault: Unlimited
- Employees per business: Unlimited
- Concurrent operations: Limited by Solana TPS

## Integration Points

### External Protocols

1. **Inco Lightning** (FHE)
   - Program ID: `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`
   - Network: Devnet
   - Purpose: Encrypted storage and computation

2. **Inco Confidential Tokens** (Encrypted Transfers)
   - Program ID: `HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22`
   - Network: Devnet
   - Purpose: Encrypted token transfers

3. **ShadowWire** (ZK)
   - Program ID: `GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD`
   - Network: Mainnet
   - Purpose: Private transfers

4. **MagicBlock** (PERs)
   - Program ID: `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`
   - Network: Devnet
   - Purpose: Real-time streaming

5. **Range** (Compliance)
   - API: https://api.range.xyz
   - Purpose: Wallet pre-screening

6. **Helius** (Infrastructure)
   - RPC: High-performance endpoints
   - DAS API: Transaction fetching

## Privacy Architecture

### What's Encrypted
- ✅ Transfer amounts (confidential tokens)
- ✅ Token account balances (confidential tokens)
- ✅ Salary rates (Inco Lightning)
- ✅ Accrued balances (Inco Lightning)
- ✅ Employer identities (Inco Lightning)
- ✅ Employee identities (Inco Lightning)
- ✅ Business counts (Inco Lightning)
- ✅ Employee counts (Inco Lightning)

### What's Public (Unavoidable)
- 👁️ Transaction signatures
- 👁️ Account addresses
- 👁️ Program IDs
- 👁️ Master vault total balance (aggregate)
- 👁️ Transaction timestamps

## References

- [Solana Docs](https://solana.com/docs)
- [Anchor Book](https://book.anchor-lang.com/)
- [Inco Lightning Docs](https://docs.inco.org/svm/home)
- [Helius Docs](https://docs.helius.dev/)
- [MagicBlock Docs](https://docs.magicblock.gg)
- [ShadowWire Docs](https://www.radr.fun/docs/shadowpay)
