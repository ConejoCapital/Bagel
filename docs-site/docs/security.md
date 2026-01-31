---
sidebar_position: 7
---

# Security

Security analysis and best practices for Bagel Protocol.

## Threat Model

### Attacker Capabilities

An adversary with full chain access can:

| Capability | Description |
|------------|-------------|
| Read all transactions | See every transaction on Solana |
| Read all accounts | Access all on-chain account data |
| Submit transactions | Interact with any program |
| Monitor timing | Track when transactions occur |
| Analyze patterns | Correlate transaction patterns |

### Attacker Limitations

An adversary **cannot**:

| Limitation | Why |
|------------|-----|
| Decrypt FHE ciphertexts | Requires Inco decryption keys |
| Forge signatures | Cryptographically secure |
| Link PDAs to identities | Index-based derivation |
| See transfer amounts | Confidential tokens |
| See salary values | FHE encrypted |
| See balances | FHE encrypted |

## Security Properties

### Confidentiality

All sensitive data is encrypted:

```
┌─────────────────────────────────────────────────────────────┐
│ ENCRYPTED DATA                                               │
├─────────────────────────────────────────────────────────────┤
│ • Salary rates          (Euint128)                          │
│ • Accrued balances      (Euint128)                          │
│ • Transfer amounts      (Confidential Tokens)               │
│ • Employer IDs          (Euint128)                          │
│ • Employee IDs          (Euint128)                          │
│ • Business counts       (Euint128)                          │
│ • Employee counts       (Euint128)                          │
└─────────────────────────────────────────────────────────────┘
```

### Access Control

Anchor constraints enforce authorization:

```rust
// Only authority can configure mint
require!(
    ctx.accounts.authority.key() == vault.authority,
    BagelError::Unauthorized
);

// Employee must be active
require!(employee.is_active, BagelError::PayrollInactive);

// Rate limiting
require!(
    time_elapsed >= MIN_WITHDRAW_INTERVAL,
    BagelError::WithdrawTooSoon
);
```

### Arithmetic Safety

All math uses checked operations:

```rust
// Overflow protection
let new_amount = current
    .checked_add(delta)
    .ok_or(error!(BagelError::Overflow))?;

// Underflow protection
let new_amount = current
    .checked_sub(delta)
    .ok_or(error!(BagelError::Underflow))?;
```

**Cargo.toml enforcement:**
```toml
[profile.release]
overflow-checks = true
```

## Privacy Guarantees

### What's Protected

| Data | Method | Level |
|------|--------|-------|
| Salary amounts | FHE (Euint128) | Maximum |
| Account balances | FHE (Euint128) | Maximum |
| Transfer amounts | Confidential Tokens | Maximum |
| Employer identity | FHE + Index PDAs | Maximum |
| Employee identity | FHE + Index PDAs | Maximum |
| Business count | FHE (Euint128) | Maximum |
| Employee count | FHE (Euint128) | Maximum |

### What's Public

| Data | Reason |
|------|--------|
| Transaction signatures | Solana requirement |
| Account addresses | Solana requirement |
| Program IDs | Solana requirement |
| Master vault total | On-chain necessity |
| Transaction timestamps | Block timestamps |

## Attack Vectors & Mitigations

### 1. Timing Analysis

**Attack:** Correlating transaction timing with pay schedules.

**Mitigation:**
- Rate limiting (60s between withdrawals)
- Employers can deposit at variable times
- TEE streaming obfuscates timing

### 2. Amount Correlation

**Attack:** Matching deposit/withdrawal amounts.

**Mitigation:**
- All amounts encrypted (confidential tokens)
- Single master vault pools all funds
- Observer sees only encrypted ciphertext

### 3. Identity Linkage

**Attack:** Linking PDA addresses to real identities.

**Mitigation:**
- Index-based PDAs (no pubkeys in seeds)
- Encrypted identity hashes
- No employer/employee pubkeys in events

### 4. Balance Tracking

**Attack:** Monitoring balance changes to infer activity.

**Mitigation:**
- All balances encrypted (FHE)
- Homomorphic updates preserve encryption
- Only authorized parties can decrypt

### 5. Replay Attacks

**Attack:** Replaying valid transactions.

**Mitigation:**
- Solana's built-in replay protection
- Unique transaction signatures
- Blockhash requirements

## Best Practices

### For Developers

1. **Never log plaintext**
```typescript
// BAD
console.log(`Salary: ${salary}`);

// GOOD
console.log('Salary updated (encrypted)');
```

2. **Validate all inputs**
```rust
require!(!encrypted_amount.is_empty(), BagelError::InvalidCiphertext);
```

3. **Use client-side encryption**
```typescript
// GOOD: Encrypt on client
const encrypted = await incoClient.encrypt(amount);
await program.deposit(encrypted);

// BAD: Never send plaintext
await program.deposit(amount); // WRONG!
```

4. **Handle errors gracefully**
```typescript
try {
  await program.withdraw(...);
} catch (e) {
  // Don't leak sensitive info in errors
  console.log('Withdrawal failed');
}
```

### For Employers

1. Deposit at varied times
2. Use unique employee indices
3. Don't correlate amounts with schedules
4. Enable confidential tokens

### For Employees

1. Withdraw at varied intervals
2. Don't publicly discuss amounts
3. Use secure wallet practices
4. Verify transactions on trusted explorer

## Audit Status

| Component | Status | Auditor |
|-----------|--------|---------|
| Bagel Program | Pending | - |
| Inco Lightning | Production | Inco |
| Inco Tokens | Production | Inco |
| MagicBlock | Production | MagicBlock |

## Bug Bounty

Report security issues to: security@bagel.finance

| Severity | Reward |
|----------|--------|
| Critical | $10,000+ |
| High | $5,000 |
| Medium | $1,000 |
| Low | $100 |

## Security Checklist

### Before Deployment

- [ ] Confidential tokens enabled
- [ ] Authority set correctly
- [ ] Rate limiting active (60s)
- [ ] Overflow checks enabled
- [ ] Input validation on all instructions
- [ ] Events don't leak sensitive data

### Ongoing Operations

- [ ] Monitor for unusual patterns
- [ ] Keep dependencies updated
- [ ] Rotate authority if compromised
- [ ] Review access logs
- [ ] Test disaster recovery
