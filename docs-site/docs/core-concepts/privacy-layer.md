---
sidebar_position: 2
title: Privacy Layer
---

# Privacy Layer

Bagel's privacy layer combines four cutting-edge privacy technologies to provide comprehensive financial privacy for payroll operations.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRIVACY LAYER STACK                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ │
│  │   ARCIUM    │   │ SHADOWWIRE  │   │  MAGICBLOCK │   │   KAMINO    │ │
│  │    MPC      │   │ Bulletproofs│   │     TEE     │   │  + Privacy  │ │
│  │             │   │             │   │             │   │    Cash     │ │
│  ├─────────────┤   ├─────────────┤   ├─────────────┤   ├─────────────┤ │
│  │ Encrypted   │   │  Private    │   │ Real-time   │   │   Yield     │ │
│  │ Storage &   │   │ Transfers   │   │ Streaming   │   │   with      │ │
│  │ Computation │   │             │   │             │   │  Privacy    │ │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘ │
│                                                                         │
│  What's Hidden:                                                         │
│  ✓ Salary amounts    ✓ Transfer amounts   ✓ Balance updates   ✓ Yields │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1. Arcium MPC (Multi-Party Computation)

### What It Does

Arcium enables **encrypted computation** - performing calculations on encrypted data without ever decrypting it.

### How Bagel Uses It

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ARCIUM IN BAGEL                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  USE CASE 1: Encrypted Salary Storage                                   │
│  ─────────────────────────────────────                                  │
│                                                                         │
│    Employer sets salary: $100k/year                                     │
│              ↓                                                          │
│    Arcium encrypts: [0x2f, 0x8a, 0x1c, ...]                            │
│              ↓                                                          │
│    Stored on-chain: encrypted_salary_per_second                         │
│              ↓                                                          │
│    Validators see: meaningless bytes                                    │
│                                                                         │
│  USE CASE 2: Accrual Calculation (MPC)                                  │
│  ─────────────────────────────────────                                  │
│                                                                         │
│    encrypted_salary ──┐                                                 │
│                       ├──▶ MPC Network ──▶ encrypted_accrued           │
│    elapsed_time ──────┘    (distributed)                                │
│                                                                         │
│    The multiplication happens WITHOUT decryption!                       │
│    No single party ever sees the plaintext salary.                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technical Details

**Version:** Arcium v0.5.1 (Mainnet Alpha RC)

**Key Features:**
- **C-SPL (Confidential SPL):** Encrypted token balances
- **RescueCipher:** SHA3-256 equivalent security
- **x25519 ECDH:** Key exchange with MXE (Multi-party eXecution Environment)
- **BLS Signatures:** Verification of MPC outputs
- **ArgBuilder API:** Type-safe argument construction

**MPC Circuit Example:**

```arcis
// Location: encrypted-ixs/circuits/payroll.arcis

circuit PayrollCalculation {
    // Confidential input: encrypted salary (only owner knows)
    input confidential encrypted_salary_per_second: u64;

    // Public input: time elapsed (visible to all)
    input public elapsed_seconds: u64;

    // Computation happens in encrypted domain
    let encrypted_accrued = encrypted_salary_per_second * elapsed_seconds;

    // Output: still encrypted, needs decryption
    output confidential encrypted_accrued: u64;
}
```

**Code Location:** [programs/bagel/src/privacy/arcium.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/arcium.rs)

---

## 2. ShadowWire Bulletproofs

### What It Does

ShadowWire enables **zero-knowledge private transfers** - proving a transfer is valid without revealing the amount.

### How Bagel Uses It

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   SHADOWWIRE IN BAGEL                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WITHDRAWAL FLOW:                                                       │
│  ────────────────                                                       │
│                                                                         │
│  1. Employee's accrued salary: 8.3 SOL (calculated via MPC)            │
│                                                                         │
│  2. ShadowWire creates:                                                 │
│     ┌────────────────────────────────────────────────────────────┐     │
│     │  Pedersen Commitment: C = aG + rH                           │     │
│     │    where a = amount (8.3 SOL)                               │     │
│     │          r = random blinding factor                         │     │
│     │          G, H = curve generator points                      │     │
│     │                                                             │     │
│     │  This commitment HIDES the amount while BINDING to it       │     │
│     └────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  3. ShadowWire generates:                                               │
│     ┌────────────────────────────────────────────────────────────┐     │
│     │  Bulletproof Range Proof (~672 bytes)                       │     │
│     │                                                             │     │
│     │  Proves: 0 ≤ amount < 2^64                                  │     │
│     │  WITHOUT revealing the actual amount                        │     │
│     │                                                             │     │
│     │  Network can verify:                                        │     │
│     │  ✓ Amount is positive                                       │     │
│     │  ✓ Amount doesn't overflow                                  │     │
│     │  ✓ Commitment is valid                                      │     │
│     │  ✗ Actual amount value (hidden!)                            │     │
│     └────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  4. Transfer executes:                                                  │
│     - Network validates proof ✓                                         │
│     - Amount transferred: 8.3 SOL                                       │
│     - On-chain record: commitment + proof (no amount!)                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technical Details

**No Trusted Setup:** Bulletproofs don't require a trusted setup ceremony (unlike SNARKs)

**Proof Size:** ~672 bytes (logarithmic in range size)

**Verification:** Constant time, efficient on-chain

**Code Location:** [programs/bagel/src/privacy/shadowwire.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/shadowwire.rs)

**TypeScript Client:** [app/lib/shadowwire.ts](https://github.com/ConejoCapital/Bagel/blob/main/app/lib/shadowwire.ts)

---

## 3. MagicBlock Ephemeral Rollups

### What It Does

MagicBlock provides **real-time state updates** in a private execution environment using Intel TDX (Trusted Domain Extensions).

### How Bagel Uses It

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   MAGICBLOCK IN BAGEL                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STREAMING PAYMENTS:                                                    │
│  ──────────────────                                                     │
│                                                                         │
│  Traditional L1:                                                        │
│    └── 400ms block time                                                 │
│    └── ~$0.00025 per transaction                                        │
│    └── Balance updates: every transaction                               │
│                                                                         │
│  With MagicBlock ER:                                                    │
│    └── ~100ms update time                                               │
│    └── $0.00 per update (off-chain)                                     │
│    └── Balance updates: continuous                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   INTEL TDX ENCLAVE                              │   │
│  │                                                                  │   │
│  │   PayrollJar (delegated copy)                                    │   │
│  │                                                                  │   │
│  │   t=0:    balance = 0.000 SOL                                    │   │
│  │   t=100:  balance = 0.001 SOL                                    │   │
│  │   t=200:  balance = 0.002 SOL                                    │   │
│  │   ...                                                            │   │
│  │   t=3600: balance = 3.600 SOL                                    │   │
│  │                                                                  │   │
│  │   Hardware-enforced privacy:                                     │   │
│  │   - Memory encrypted by CPU                                      │   │
│  │   - State invisible to validator operators                       │   │
│  │   - Only employee can see their balance                          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  CLAIM FLOW:                                                            │
│    1. Employee triggers claim                                           │
│    2. ER commits final state to L1                                      │
│    3. PayrollJar undelegated (returns to program)                       │
│    4. Withdrawal executes on L1 (with ShadowWire privacy)               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technical Details

**Intel TDX:** Hardware-based Trusted Execution Environment
- CPU-level memory encryption
- Attestation of execution integrity
- Protection against OS/hypervisor attacks

**Delegation Program:** Account ownership temporarily transfers to MagicBlock

**Code Location:** [programs/bagel/src/privacy/magicblock.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/magicblock.rs)

**TypeScript Client:** [app/lib/magicblock.ts](https://github.com/ConejoCapital/Bagel/blob/main/app/lib/magicblock.ts)

---

## 4. Kamino / Privacy Cash Yield

### What It Does

Enables **private yield generation** on idle payroll funds through encrypted vault positions.

### How Bagel Uses It

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    YIELD PRIVACY                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PRIVATE VAULT POSITION:                                                │
│  ──────────────────────                                                 │
│                                                                         │
│  What's Hidden:                                                         │
│  ✓ Individual deposit amounts                                           │
│  ✓ Individual yield earnings                                            │
│  ✓ Withdrawal amounts                                                   │
│                                                                         │
│  What's Public:                                                         │
│  ✓ Total Value Locked (TVL) in vault                                    │
│  ✓ Current APY rate                                                     │
│  ✓ Number of positions (but not values)                                 │
│                                                                         │
│  YIELD CALCULATION (Privacy-Preserving):                                │
│  ───────────────────────────────────────                                │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Arcium MPC Circuit: YieldProfitCalculation                       │  │
│  │                                                                   │  │
│  │  input confidential current_vault_value: u64;                     │  │
│  │  input confidential initial_deposit: u64;                         │  │
│  │                                                                   │  │
│  │  let yield_profit = current_vault_value - initial_deposit;        │  │
│  │                                                                   │  │
│  │  output confidential yield_profit: u64;                           │  │
│  │                                                                   │  │
│  │  // Computed without decryption!                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technical Details

**Kamino Integration:** Uses Kamino Finance SOL lending vaults
- Real yield from actual lending activity
- kSOL receipt tokens represent position

**Privacy Cash Integration:** Encrypted vault wrapper
- Hides individual positions
- Enables private yield tracking

**Code Location:**
- [programs/bagel/src/privacy/kamino.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/kamino.rs)
- [programs/bagel/src/privacy/privacycash.rs](https://github.com/ConejoCapital/Bagel/blob/main/programs/bagel/src/privacy/privacycash.rs)

---

## Privacy Guarantees Summary

| Data | Storage Privacy | Transfer Privacy | Computation Privacy |
|------|-----------------|------------------|---------------------|
| **Salary amount** | ✅ Arcium C-SPL | N/A | ✅ Arcium MPC |
| **Transfer amount** | N/A | ✅ ShadowWire | N/A |
| **Balance updates** | ✅ MagicBlock TEE | N/A | ✅ MagicBlock TEE |
| **Yield earnings** | ✅ Privacy Cash | ✅ ShadowWire | ✅ Arcium MPC |

## What Observers Can See

### On-Chain Observers See:
```
✓ That a payroll exists (PayrollJar account)
✓ Employer and employee public keys
✓ Timestamps of withdrawals
✓ Encrypted salary bytes (meaningless)
✓ Bulletproof proofs (proves validity, not amounts)
✓ Events (no amounts included)
```

### On-Chain Observers CANNOT See:
```
✗ Salary amounts (encrypted)
✗ Withdrawal amounts (zero-knowledge)
✗ Real-time balance (in TEE)
✗ Yield earnings (encrypted)
✗ Total compensation (sum of above)
```

## Implementation Status

| Technology | Integration Status | Lines of Code |
|------------|-------------------|---------------|
| **Arcium v0.5.1** | ✅ Complete (mock) | 371 lines Rust, 483 lines TS |
| **ShadowWire** | ✅ Complete (mock) | 315 lines Rust, 378 lines TS |
| **MagicBlock** | ✅ Complete (mock) | 194 lines Rust, 451 lines TS |
| **Kamino/Privacy Cash** | ✅ Complete (mock) | 700+ lines combined |

**Note:** Current implementation uses mock encryption for testing. Production deployment will integrate actual SDK calls.

## Security Considerations

1. **Key Management:** x25519 keys derived from wallet signatures
2. **Decryption Points:** Minimize where plaintext is visible
3. **Timing Attacks:** Minimum withdrawal intervals prevent analysis
4. **Side Channels:** TEE protects against memory inspection

## Related Documentation

- [PayrollJar](./payroll-jar) - Account structure
- [Yield Generation](./yield-generation) - Yield mechanics
- [Security](../security) - Full security model
