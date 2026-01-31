---
sidebar_position: 5
---

# Mathematical Foundations

Cryptographic and mathematical foundations of the Bagel Protocol.

## Fully Homomorphic Encryption

### Definition

FHE allows computation on encrypted data:

$$
\text{Eval}(E(m_1), E(m_2), f) = E(f(m_1, m_2))
$$

Where:
- $E$ is the encryption function
- $m_1, m_2$ are plaintext values
- $f$ is any computable function
- The result is encrypted

### TFHE Scheme

Bagel uses TFHE (Torus FHE) via Inco Lightning:

$$
\text{TFHE}: \mathbb{Z}_{2^{128}} \rightarrow \mathcal{C}
$$

Where $\mathcal{C}$ is the ciphertext space.

## Homomorphic Operations

### Addition

For encrypted values $E(a)$ and $E(b)$:

$$
E(a) \oplus E(b) = E((a + b) \mod 2^{128})
$$

**Implementation:**
```rust
e_add(cpi_ctx, encrypted_a, encrypted_b, 0)
```

### Subtraction

For encrypted values where $a \geq b$:

$$
E(a) \ominus E(b) = E(a - b)
$$

**Implementation:**
```rust
e_sub(cpi_ctx, encrypted_a, encrypted_b, 0)
```

### Scalar Multiplication

For encrypted value $E(a)$ and plaintext scalar $k$:

$$
E(a) \otimes k = E(a \times k)
$$

**Implementation:**
```rust
e_mul_scalar(cpi_ctx, encrypted_a, scalar, 0)
```

## Salary Streaming Formula

### Continuous Accrual

For an employee with salary rate $S$ (per second):

$$
A(t) = A(t_0) + S \times (t - t_0)
$$

Where:
- $A(t)$ = Accrued amount at time $t$
- $A(t_0)$ = Previous accrued amount
- $S$ = Salary per second
- $t - t_0$ = Elapsed time

### Encrypted Streaming

With FHE, this becomes:

$$
E(A(t)) = E(A(t_0)) \oplus (E(S) \otimes \Delta t)
$$

All operations preserve encryption!

### Integral Form

For continuous streaming from $t_0$ to $t_1$:

$$
A(t_1) = A(t_0) + \int_{t_0}^{t_1} S \, dt = A(t_0) + S \times (t_1 - t_0)
$$

## Balance Update Mathematics

### Deposit Operation

Business balance after deposit:

$$
B'_{business} = E(B_{business}) \oplus E(\text{amount})
$$

Expands to:

$$
B'_{business} = E(B_{business} + \text{amount})
$$

### Withdrawal Operation

Employee accrued after withdrawal:

$$
A'_{employee} = E(A_{employee}) \ominus E(\text{amount})
$$

Expands to:

$$
A'_{employee} = E(A_{employee} - \text{amount})
$$

### Count Increment

When adding a business or employee:

$$
C' = E(C) \oplus E(1) = E(C + 1)
$$

## Privacy Guarantees

### Semantic Security

For any two plaintexts $m_0, m_1$:

$$
\Pr[\text{Distinguish}(E(m_0), E(m_1))] \leq \frac{1}{2} + \text{negl}(\lambda)
$$

An adversary cannot distinguish ciphertexts with non-negligible advantage.

### Indistinguishability Under Chosen Plaintext Attack (IND-CPA)

$$
\text{Adv}_{\mathcal{A}}^{\text{IND-CPA}}(\lambda) \leq \text{negl}(\lambda)
$$

## PDA Privacy Analysis

### Traditional PDA (Information Leakage)

```
PDA = H(\text{"employee"} \| \text{employer\_pk} \| \text{employee\_pk})
```

An observer can:
1. Enumerate all employer pubkeys
2. Enumerate all employee pubkeys
3. Compute all possible PDAs
4. Match against on-chain PDAs
5. **Recover relationships**

### Index-Based PDA (Privacy Preserved)

```
PDA = H(\text{"employee"} \| \text{business\_pda} \| \text{index})
```

An observer sees:
- Generic PDA address
- Sequential index (no meaning)
- **Cannot recover identity**

### Formal Privacy Property

Let $\mathcal{O}$ be the set of observable information:

$$
\mathcal{O} = \{ \text{PDAs}, \text{indices}, \text{tx\_sigs}, \text{timestamps} \}
$$

The mapping from $\mathcal{O}$ to real identities is computationally infeasible:

$$
\Pr[\text{Identity}(PDA)] \leq \frac{1}{|\text{Possible Identities}|}
$$

## Rate Limiting

### Withdrawal Interval

Minimum time between withdrawals:

$$
\Delta t_{\min} = 60 \text{ seconds}
$$

Constraint:

$$
t_{\text{current}} - t_{\text{last\_action}} \geq \Delta t_{\min}
$$

### Purpose

Prevents:
- Timing analysis attacks
- Transaction flooding
- State spam

## Overflow Protection

### Safe Arithmetic

All operations use checked arithmetic:

$$
\text{checked\_add}(a, b) = \begin{cases}
a + b & \text{if } a + b < 2^{64} \\
\text{Error} & \text{otherwise}
\end{cases}
$$

$$
\text{checked\_sub}(a, b) = \begin{cases}
a - b & \text{if } a \geq b \\
\text{Error} & \text{otherwise}
\end{cases}
$$

### Rust Implementation

```rust
let result = current
    .checked_add(delta)
    .ok_or(error!(BagelError::Overflow))?;
```

## Token Economics

### USDBagel

- **Decimals**: 6
- **Minimum unit**: $10^{-6}$ (1 lamport)

### Salary Conversion

Annual salary $S_a$ to per-second rate $S_s$:

$$
S_s = \frac{S_a}{365.25 \times 24 \times 3600} = \frac{S_a}{31,557,600}
$$

Example: $100,000/year:

$$
S_s = \frac{100,000 \times 10^6}{31,557,600} \approx 3.17 \text{ lamports/second}
$$

## Confidential Transfer Proofs

### Balance Proof

Inco verifies:

$$
E(B_{\text{source}}) \ominus E(\text{amount}) \geq E(0)
$$

Without revealing actual values!

### Conservation Proof

$$
E(B_{\text{source}}) + E(B_{\text{dest}}) = E(B'_{\text{source}}) + E(B'_{\text{dest}})
$$

Total balance is conserved (verified on encrypted values).

## Complexity Analysis

| Operation | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| Encryption | O(1) | O(16 bytes) |
| `e_add` | O(1) | O(16 bytes) |
| `e_sub` | O(1) | O(16 bytes) |
| `e_mul` | O(1) | O(16 bytes) |
| Decryption | O(1) | O(8 bytes) |
| PDA derivation | O(1) | O(32 bytes) |

## References

1. Chillotti, I., et al. "TFHE: Fast Fully Homomorphic Encryption over the Torus." Journal of Cryptology, 2020.
2. Gentry, C. "A Fully Homomorphic Encryption Scheme." Stanford University, 2009.
3. [Inco Network Documentation](https://docs.inco.org)
