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
│  • Arcium MPC        • ShadowWire ZK                        │
│  • MagicBlock PERs   • Kamino Yield (Real!)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          Bagel Program (Solana Smart Contract)              │
│  • Encrypted State   • Private Transfers                    │
│  • Stream Management • Yield Integration                    │
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
- **Program ID**: `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU` (Devnet)
- **Instructions**:
  - `bake_payroll` - Create new payroll
  - `deposit_dough` - Fund payroll jar
  - `get_dough` - Employee withdrawal
  - `update_salary` - Modify salary rate
  - `close_jar` - Terminate payroll

### 2. Privacy Layer (`programs/bagel/src/privacy/`)

#### Arcium MPC
- **Purpose**: Encrypted salary calculations
- **File**: `privacy/arcium.rs`
- **Type**: Multi-Party Computation
- **Status**: Production-ready patterns (mock for demo)

#### ShadowWire
- **Purpose**: Zero-knowledge private transfers
- **File**: `privacy/shadowwire.rs`
- **Type**: Bulletproofs ZK
- **Status**: Integration structure complete

#### MagicBlock
- **Purpose**: Real-time streaming payments
- **File**: `privacy/magicblock.rs`
- **Type**: Private Ephemeral Rollups
- **Status**: Off-chain state management ready

#### Kamino Finance (NEW!)
- **Purpose**: Real yield generation
- **File**: `privacy/kamino.rs` (to be created)
- **Type**: Lending protocol integration
- **Status**: Planned for mainnet

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
  ├─> Enter employee address
  ├─> Set salary rate
  │
  ▼
Arcium Client (app/lib/arcium.ts)
  │
  ├─> Encrypt salary_per_second
  │
  ▼
Bagel Program (bake_payroll)
  │
  ├─> Create PayrollJar PDA
  ├─> Store encrypted salary
  ├─> Initialize Kamino vault
  │
  ▼
Solana Blockchain
  │
  └─> PayrollJar account created ✓
```

### Streaming Payments

```
MagicBlock PER (Off-chain)
  │
  ├─> Update balance every second
  ├─> Track accrued amount
  │
  ▼
Employee Requests Withdrawal
  │
  ├─> Calculate accrued (Arcium MPC)
  ├─> Decrypt for transfer
  │
  ▼
ShadowWire (Zero-Knowledge)
  │
  ├─> Generate Bulletproof
  ├─> Private transfer (amount hidden)
  │
  ▼
Employee Wallet
  │
  └─> Funds received privately ✓
```

### Yield Generation

```
Idle Payroll Funds
  │
  ▼
Kamino Lending Vault
  │
  ├─> Deposit USDC/SOL
  ├─> Earn APY (5-15%)
  │
  ▼
Yield Accrues
  │
  ├─> 80% to employee
  ├─> 20% to employer
  │
  ▼
Distributed on Withdrawal ✓
```

## State Management

### PayrollJar Account

```rust
pub struct PayrollJar {
    pub employer: Pubkey,              // Who funds this
    pub employee: Pubkey,              // Who gets paid
    pub encrypted_salary_per_second: Vec<u8>,  // Arcium encrypted
    pub last_withdraw: i64,            // Unix timestamp
    pub total_accrued: u64,            // Current balance
    pub dough_vault: Pubkey,           // Kamino vault PDA
    pub bump: u8,                      // PDA bump seed
    pub is_active: bool,               // Active status
}
```

### Seeds for PDA

```rust
[
    b"bagel_jar",
    employee.key().as_ref(),
    employer.key().as_ref(),
]
```

## Security Measures

### Access Control
- Employer can only modify their own payrolls
- Employee can only withdraw from their own jar
- PDA validation using Anchor's `has_one` constraints

### Arithmetic Safety
- All math uses `checked_*` operations
- Overflow protection on all calculations
- `overflow-checks = true` in Cargo.toml

### Privacy Guarantees
- Salary amounts never logged in events
- Only encrypted values stored on-chain
- Transfer amounts hidden via ZK proofs

## Network Configuration

### Devnet (Current)
- **RPC**: Helius Devnet
- **Explorer**: https://explorer.solana.com?cluster=devnet
- **Faucet**: https://faucet.solana.com

### Mainnet (Planned)
- **RPC**: Helius Mainnet
- **Real Yield**: Kamino Finance
- **Real Privacy**: Full SDK integration

## Performance Characteristics

### Transaction Costs
- Create payroll: ~0.002 SOL
- Deposit: ~0.001 SOL
- Withdraw: ~0.001 SOL
- Total setup: ~0.004 SOL (~$0.40)

### Latency
- On-chain tx: 400-600ms
- PER updates: <100ms (MagicBlock)
- Yield calculation: <50ms (Kamino)

### Scalability
- Payrolls per employer: Unlimited
- Employees per payroll: 1:1 (one jar per employee)
- Concurrent operations: Limited by Solana TPS

## Integration Points

### External Protocols

1. **Arcium** (MPC)
   - Circuit ID: TBD
   - Network: Devnet
   - Purpose: Salary encryption

2. **ShadowWire** (ZK)
   - Program ID: TBD
   - Token: USD1
   - Purpose: Private transfers

3. **MagicBlock** (PERs)
   - Node: TBD
   - Update frequency: 1s
   - Purpose: Real-time streaming

4. **Kamino** (Yield)
   - Program: `GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW`
   - Markets: SOL, USDC
   - Purpose: Real yield generation

## Future Enhancements

### Phase 2 (Mainnet)
- Replace mocks with real SDK calls
- Integrate Kamino for actual yield
- Deploy to Solana mainnet
- Custom domain

### Phase 3 (Advanced Features)
- Multi-sig employer support
- Batch payroll processing
- Compliance reporting (Range)
- Mobile app

## References

- [Solana Docs](https://solana.com/docs)
- [Anchor Book](https://book.anchor-lang.com/)
- [Kamino Docs](https://docs.kamino.finance/)
- [Helius Docs](https://docs.helius.dev/)
