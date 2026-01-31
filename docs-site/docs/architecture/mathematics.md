---
sidebar_position: 5
---

# Mathematical Foundations

Cryptographic and mathematical foundations of the Bagel Protocol.

## Fully Homomorphic Encryption

### Definition

FHE allows computation on encrypted data:

```
Eval(E(m₁), E(m₂), f) = E(f(m₁, m₂))
```

Where:
- `E` is the encryption function
- `m₁, m₂` are plaintext values
- `f` is any computable function
- The result is encrypted

### TFHE Scheme

Bagel uses TFHE (Torus FHE) via Inco Lightning:

```
TFHE: ℤ₂¹²⁸ → C

Where C = Ciphertext space
```

## Homomorphic Operations

### Addition

For encrypted values `E(a)` and `E(b)`:

```
E(a) ⊕ E(b) = E((a + b) mod 2¹²⁸)
```

**Implementation:**
```rust
e_add(cpi_ctx, encrypted_a, encrypted_b, 0)
```

### Subtraction

For encrypted values where `a ≥ b`:

```
E(a) ⊖ E(b) = E(a - b)
```

**Implementation:**
```rust
e_sub(cpi_ctx, encrypted_a, encrypted_b, 0)
```

### Scalar Multiplication

For encrypted value `E(a)` and plaintext scalar `k`:

```
E(a) ⊗ k = E(a × k)
```

**Implementation:**
```rust
e_mul_scalar(cpi_ctx, encrypted_a, scalar, 0)
```

## Salary Streaming Formula

### Continuous Accrual

For an employee with salary rate `S` (per second):

```
A(t) = A(t₀) + S × (t - t₀)

Where:
  A(t)   = Accrued amount at time t
  A(t₀)  = Previous accrued amount
  S      = Salary per second
  t - t₀ = Elapsed time
```

### Encrypted Streaming

With FHE, this becomes:

```
E(A(t)) = E(A(t₀)) ⊕ (E(S) ⊗ Δt)
```

All operations preserve encryption!

### Integral Form

For continuous streaming from `t₀` to `t₁`:

```
A(t₁) = A(t₀) + ∫[t₀,t₁] S dt = A(t₀) + S × (t₁ - t₀)
```

## Balance Update Mathematics

### Deposit Operation

Business balance after deposit:

```
B'_business = E(B_business) ⊕ E(amount)
            = E(B_business + amount)
```

### Withdrawal Operation

Employee accrued after withdrawal:

```
A'_employee = E(A_employee) ⊖ E(amount)
            = E(A_employee - amount)
```

### Count Increment

When adding a business or employee:

```
C' = E(C) ⊕ E(1) = E(C + 1)
```

## Privacy Guarantees

### Semantic Security

For any two plaintexts `m₀, m₁`:

```
Pr[Distinguish(E(m₀), E(m₁))] ≤ 1/2 + negl(λ)
```

An adversary cannot distinguish ciphertexts with non-negligible advantage.

### Ciphertext Indistinguishability

All ciphertexts look random, regardless of plaintext value.

### Key Security

- Decryption keys never leave Inco's secure infrastructure
- Access controlled by Solana signatures
- No on-chain key material

## PDA Privacy Analysis

### Traditional PDA (Information Leakage)

```
PDA = H("employee" || employer_pk || employee_pk)
```

An observer can:
1. Enumerate all employer pubkeys
2. Enumerate all employee pubkeys
3. Compute all possible PDAs
4. Match against on-chain PDAs
5. **Recover relationships**

### Index-Based PDA (Privacy Preserved)

```
PDA = H("employee" || business_pda || index)
```

An observer sees:
- Generic PDA address
- Sequential index (no meaning)
- **Cannot recover identity**

### Formal Privacy Property

Let `O` be the set of observable information:

```
O = { PDAs, indices, tx_sigs, timestamps }
```

The mapping from O to real identities is computationally infeasible:

```
Pr[Identity(PDA)] ≤ 1 / |Possible Identities|
```

## Rate Limiting

### Withdrawal Interval

Minimum time between withdrawals:

```
Δt_min = 60 seconds
```

Constraint:

```
t_current - t_last_action ≥ Δt_min
```

### Purpose

Prevents:
- Timing analysis attacks
- Transaction flooding
- State spam

## Overflow Protection

### Safe Arithmetic

All operations use checked arithmetic:

```
checked_add(a, b) = {
  a + b    if a + b < 2⁶⁴
  Error    otherwise
}

checked_sub(a, b) = {
  a - b    if a ≥ b
  Error    otherwise
}
```

### Rust Implementation

```rust
let result = current
    .checked_add(delta)
    .ok_or(error!(BagelError::Overflow))?;
```

## Token Economics

### USDBagel

- **Decimals**: 6
- **Minimum unit**: 10⁻⁶ (1 lamport)

### Salary Conversion

Annual salary `Sₐ` to per-second rate `Sₛ`:

```
Sₛ = Sₐ / (365.25 × 24 × 3600)
   = Sₐ / 31,557,600
```

Example: $100,000/year:

```
Sₛ = (100,000 × 10⁶) / 31,557,600
   ≈ 3.17 lamports/second
```

## Confidential Transfer Proofs

### Balance Proof

Inco verifies:

```
E(B_source) ⊖ E(amount) ≥ E(0)
```

Without revealing actual values!

### Conservation Proof

```
E(B_source) + E(B_dest) = E(B'_source) + E(B'_dest)
```

Total balance is conserved (verified on encrypted values).

## Complexity Analysis

| Operation | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| Encryption | O(1) | O(16 bytes) |
| e_add | O(1) | O(16 bytes) |
| e_sub | O(1) | O(16 bytes) |
| e_mul | O(1) | O(16 bytes) |
| Decryption | O(1) | O(8 bytes) |
| PDA derivation | O(1) | O(32 bytes) |

## References

1. Chillotti, I., et al. "TFHE: Fast Fully Homomorphic Encryption over the Torus." Journal of Cryptology, 2020.
2. Gentry, C. "A Fully Homomorphic Encryption Scheme." Stanford University, 2009.
3. [Inco Network Documentation](https://docs.inco.org)
