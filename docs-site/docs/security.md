---
sidebar_position: 10
title: Security
---

# Security Model

This document describes Bagel's security architecture, threat model, and best practices for secure operation.

## Threat Model

### Adversary Capabilities

We assume adversaries may have:

| Capability | Mitigation |
|------------|------------|
| **Full chain visibility** | Encryption (Arcium C-SPL) |
| **Transaction monitoring** | Zero-knowledge proofs (ShadowWire) |
| **Memory inspection** | Hardware TEE (MagicBlock Intel TDX) |
| **Network traffic analysis** | Encrypted communication |
| **Timing analysis** | Minimum withdrawal intervals |

### Assets Being Protected

| Asset | Protection Method |
|-------|-------------------|
| **Salary amounts** | Arcium MPC encryption |
| **Transfer amounts** | ShadowWire Bulletproofs |
| **Balance history** | MagicBlock TEE + event redaction |
| **Yield earnings** | Privacy Cash encrypted vaults |
| **Employer-employee relationships** | Visible (PDA derivation is public) |

## Privacy Guarantees

### What's Hidden

```
✅ HIDDEN (Cryptographically Protected)
═══════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Salary Amount                                              │
│  ─────────────                                              │
│  Stored as: encrypted_salary_per_second: Vec<u8>            │
│  Protection: Arcium RescueCipher + x25519 ECDH              │
│  Visibility: Only employer and employee can decrypt         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Transfer Amount                                            │
│  ───────────────                                            │
│  Hidden via: ShadowWire Bulletproof commitment              │
│  On-chain: Pedersen commitment C = aG + rH                  │
│  Proves: 0 ≤ amount < 2^64 (nothing else!)                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Real-time Balance                                          │
│  ─────────────────                                          │
│  Protected by: Intel TDX hardware enclave                   │
│  State: Only visible to account owner                       │
│  Validator operators: Cannot inspect TEE memory             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Yield Earnings                                             │
│  ──────────────                                             │
│  Individual positions: Hidden in Privacy Cash               │
│  Yield calculation: Via Arcium MPC (encrypted)              │
│  Only visible to: Position owner                            │
└─────────────────────────────────────────────────────────────┘
```

### What's Visible

```
⚠️ VISIBLE (By Design or Necessity)
═══════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Payroll Existence                                          │
│  ─────────────────                                          │
│  Anyone can see: PayrollJar account exists                  │
│  Reason: PDA is deterministic from public keys              │
│  Mitigation: None needed (doesn't reveal amounts)           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Employer & Employee Public Keys                            │
│  ───────────────────────────────                            │
│  Anyone can see: Who is paying whom                         │
│  Reason: Required for PDA derivation and access control     │
│  Mitigation: Use separate wallets for payroll               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Timing Information                                         │
│  ──────────────────                                         │
│  Visible: last_withdraw timestamp, transaction times        │
│  Reason: Required for salary accrual calculation            │
│  Mitigation: MIN_WITHDRAW_INTERVAL reduces granularity      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Transfer Validity (not amount)                             │
│  ─────────────────────────────                              │
│  Visible: Bulletproof verification result                   │
│  Proves: Transfer is valid                                  │
│  Hidden: Actual amount transferred                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Vault TVL (Total Value Locked)                             │
│  ──────────────────────────────                             │
│  Visible: Total value in Kamino/Privacy Cash vaults         │
│  Hidden: Individual position values                         │
│  Reason: Protocol transparency requirement                  │
└─────────────────────────────────────────────────────────────┘
```

## Access Control

### Permission Matrix

| Operation | Employer | Employee | Anyone |
|-----------|----------|----------|--------|
| `bake_payroll` | ✅ Signer | ❌ | ❌ |
| `deposit_dough` | ✅ Signer | ❌ | ❌ |
| `get_dough` | ❌ | ✅ Signer | ❌ |
| `update_salary` | ✅ Signer | ❌ | ❌ |
| `close_jar` | ✅ Signer | ❌ | ❌ |
| `claim_excess_dough` | ✅ Signer | ❌ | ❌ |
| Read account | ✅ | ✅ | ✅ (encrypted) |
| Decrypt salary | ✅ | ✅ | ❌ |

### Anchor Constraints

```rust
// Employer-only operations
#[account(
    mut,
    has_one = employer,
    seeds = [BAGEL_JAR_SEED, employer.key().as_ref(), employee.key().as_ref()],
    bump
)]
pub payroll_jar: Account<'info, PayrollJar>,

// Employee-only operations
#[account(
    mut,
    has_one = employee,
    has_one = employer,
    seeds = [BAGEL_JAR_SEED, employer.key().as_ref(), employee.key().as_ref()],
    bump
)]
pub payroll_jar: Account<'info, PayrollJar>,
```

## Cryptographic Security

### Encryption (Arcium C-SPL)

| Property | Implementation |
|----------|----------------|
| **Cipher** | RescueCipher (SHA3-256 equivalent) |
| **Key Exchange** | x25519 ECDH |
| **Key Derivation** | SHA3-256 |
| **MPC Verification** | BLS signatures |

### Zero-Knowledge Proofs (ShadowWire)

| Property | Implementation |
|----------|----------------|
| **Proof System** | Bulletproofs |
| **Commitment** | Pedersen (curve25519) |
| **Range** | [0, 2^64) |
| **Proof Size** | ~672 bytes |
| **Trusted Setup** | None required |

### TEE Security (MagicBlock)

| Property | Implementation |
|----------|----------------|
| **Hardware** | Intel TDX |
| **Attestation** | Remote attestation |
| **Memory Protection** | CPU-level encryption |
| **Isolation** | Hardware enforced |

## Known Limitations

### 1. Metadata Leakage

```
LIMITATION: Employer-employee relationship is visible

Reason: PDA seeds include both public keys
Impact: Observer can see WHO is paying WHO
       (but not HOW MUCH)

Mitigation:
- Use dedicated payroll wallets
- Don't reuse wallets for other activities
```

### 2. Timing Analysis

```
LIMITATION: Withdrawal timing is visible

Reason: Timestamps required for accrual calculation
Impact: Observer can see WHEN withdrawals occur
        and infer rough payment frequency

Mitigation:
- MIN_WITHDRAW_INTERVAL (60 seconds)
- Randomize withdrawal times
- Batch withdrawals
```

### 3. First/Last Transaction Correlation

```
LIMITATION: First deposit and final close are visible

Reason: Account creation and closure are on-chain
Impact: Can correlate start/end of employment

Mitigation:
- Keep payrolls open even after employment ends
- Use multi-employee pooling (future feature)
```

## Design Assumptions

### Trust Assumptions

| Entity | Trust Level | Justification |
|--------|-------------|---------------|
| **Arcium MPC Network** | Threshold trust | Requires majority honest nodes |
| **Intel TDX** | Hardware trust | Assumes no CPU vulnerabilities |
| **ShadowWire Bulletproofs** | Cryptographic | Based on discrete log hardness |
| **Kamino Protocol** | Smart contract trust | Audited DeFi protocol |

### Security Dependencies

```
Bagel Security Depends On:
├── Solana validator consensus
├── Arcium MPC liveness
├── Intel TDX integrity
├── ShadowWire program correctness
└── Kamino vault security
```

## Hardening Recommendations

### For Employers

1. **Use dedicated payroll wallet**
   ```
   DO: Create separate wallet for Bagel
   DON'T: Use main treasury wallet
   ```

2. **Verify employee addresses**
   ```
   DO: Confirm addresses out-of-band
   DON'T: Trust unverified addresses
   ```

3. **Monitor for anomalies**
   ```
   DO: Set up Helius webhooks for events
   DON'T: Ignore PayrollBaked events from unknown sources
   ```

### For Employees

1. **Secure encryption keys**
   ```
   DO: Backup wallet securely
   DON'T: Share private keys
   ```

2. **Verify payroll source**
   ```
   DO: Confirm employer address
   DON'T: Accept unknown payrolls
   ```

3. **Withdraw regularly**
   ```
   DO: Withdraw periodically
   DON'T: Let large amounts accumulate
   ```

### For Operators

1. **Use hardware wallets**
   ```
   Recommended: Ledger for signing
   ```

2. **Implement rate limiting**
   ```
   Frontend: Limit transaction frequency
   Backend: Monitor for abuse
   ```

3. **Audit regularly**
   ```
   Review: Access logs
   Monitor: Unusual patterns
   ```

## Incident Response

### If Keys Are Compromised

**Employer:**
1. Close all active payrolls (`close_jar`)
2. Create new wallet
3. Recreate payrolls with new wallet

**Employee:**
1. Withdraw immediately (`get_dough`)
2. Notify employer
3. Get new payroll with new wallet

### If Privacy Is Breached

1. Document the breach
2. Assess what data was exposed
3. Notify affected parties
4. Consider legal obligations

## Audit Status

| Component | Audit Status | Date |
|-----------|--------------|------|
| **Bagel Program** | Self-audited | January 2026 |
| **Arcium Integration** | Following SDK patterns | v0.5.1 |
| **ShadowWire Integration** | Following SDK patterns | Latest |
| **MagicBlock Integration** | Following SDK patterns | Latest |

**Note:** This is a hackathon project. Production deployment requires professional security audits.

## Security Contacts

For security issues, please contact:
- **GitHub Issues:** [Private security advisory](https://github.com/ConejoCapital/Bagel/security)
- **Email:** security@conejocapital.com (coming soon)

## Related Documentation

- [Privacy Layer](./core-concepts/privacy-layer) - Detailed privacy tech docs
- [Architecture](./architecture/overview) - System design
- [Troubleshooting](./troubleshooting) - Common issues
