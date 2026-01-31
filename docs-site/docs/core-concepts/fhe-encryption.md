---
sidebar_position: 2
---

# FHE Encryption

Deep dive into Fully Homomorphic Encryption as used in Bagel Protocol.

## What is FHE?

Fully Homomorphic Encryption (FHE) allows computation on encrypted data without decryption. The result is also encrypted.

```
E(a) ⊕ E(b) = E(a + b)
E(a) ⊗ E(b) = E(a × b)
```

## Inco Lightning

Bagel uses Inco Lightning's TFHE (Torus FHE) implementation on Solana:

- **Program ID**: `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`
- **Primary Type**: `Euint128` (encrypted 128-bit unsigned integer)
- **Operations**: Addition, subtraction, multiplication, comparison

## Euint128 Type

### Structure

```rust
pub struct Euint128 {
    /// Handle to encrypted value (16 bytes)
    pub handle: [u8; 16],
}
```

The handle is a pointer to encrypted data managed by the Inco service. The actual ciphertext is stored off-chain.

### Memory Layout

```
┌────────────────────────────────────────────────┐
│                  Euint128                       │
├────────────────────────────────────────────────┤
│  Offset  │  Size  │  Field                     │
├──────────┼────────┼────────────────────────────┤
│  0       │  16    │  handle (ciphertext ref)   │
└──────────┴────────┴────────────────────────────┘
Total: 16 bytes
```

## Operations

### Create Encrypted Value

```rust
use inco_lightning::cpi::new_euint128;

// Create encrypted value from ciphertext
let encrypted = new_euint128(
    cpi_ctx,
    ciphertext_bytes,  // Vec<u8> from client
    0,                 // input_type: 0 = ciphertext
)?;
```

**Client-side encryption:**

```typescript
const incoClient = new IncoClient({ network: 'devnet' });
const ciphertext = await incoClient.encrypt(100_000_000n);
```

### Homomorphic Addition

```rust
use inco_lightning::cpi::e_add;

// E(a) + E(b) = E(a + b)
let result = e_add(
    cpi_ctx,
    encrypted_a,  // Euint128
    encrypted_b,  // Euint128
    0,            // input_type
)?;
```

### Homomorphic Subtraction

```rust
use inco_lightning::cpi::e_sub;

// E(a) - E(b) = E(a - b)
let result = e_sub(
    cpi_ctx,
    encrypted_a,  // Euint128 (minuend)
    encrypted_b,  // Euint128 (subtrahend)
    0,            // input_type
)?;
```

### Scalar Multiplication

For streaming salary calculation:

```rust
// accrued = salary_per_second × elapsed_seconds
// E(salary) × plain_time = E(salary × time)
let accrued = e_mul_scalar(
    cpi_ctx,
    encrypted_salary,
    elapsed_seconds,
    0,
)?;
```

## Mathematical Foundations

### Encryption Function

```
E: ℤ₂¹²⁸ → C

Where:
  ℤ₂¹²⁸ = Set of 128-bit unsigned integers
  C = Ciphertext space
```

### Homomorphic Properties

**Additive Homomorphism:**
```
∀ a,b ∈ ℤ₂¹²⁸:
  E(a) ⊕ E(b) = E((a + b) mod 2¹²⁸)
```

**Subtractive Homomorphism:**
```
∀ a,b ∈ ℤ₂¹²⁸ where a ≥ b:
  E(a) ⊖ E(b) = E(a - b)
```

**Multiplicative Homomorphism:**
```
∀ a,b ∈ ℤ₂¹²⁸:
  E(a) ⊗ E(b) = E((a × b) mod 2¹²⁸)
```

## Use Cases in Bagel

### 1. Salary Storage

```rust
// Store encrypted salary
employee.encrypted_salary = new_euint128(cpi_ctx, encrypted_salary_bytes, 0)?;
```

### 2. Balance Updates

```rust
// Deposit: balance += amount
entry.encrypted_balance = e_add(
    cpi_ctx,
    entry.encrypted_balance.clone(),
    encrypted_deposit,
    0,
)?;

// Withdrawal: accrued -= amount
employee.encrypted_accrued = e_sub(
    cpi_ctx,
    employee.encrypted_accrued.clone(),
    encrypted_withdrawal,
    0,
)?;
```

### 3. Count Management

```rust
// Increment business count
vault.encrypted_business_count = e_add(
    cpi_ctx,
    vault.encrypted_business_count.clone(),
    encrypted_one,  // E(1)
    0,
)?;
```

### 4. Streaming Calculation

```rust
// accrued = salary_per_second × elapsed
let new_accrued = calculate_streaming_salary(
    encrypted_salary,
    elapsed_seconds,
)?;
```

## Decryption

Decryption requires authorization from Inco's decryption service:

```typescript
// Client-side decryption (authorized)
const plaintext = await incoClient.decrypt(encrypted_handle);
```

### Access Control

Only authorized parties can decrypt:

| Data | Who Can Decrypt |
|------|-----------------|
| `encrypted_salary` | Employer + Employee |
| `encrypted_accrued` | Employee |
| `encrypted_balance` | Employer |
| `encrypted_employer_id` | Employer |
| `encrypted_employee_id` | Employee |

## Security Properties

### Semantic Security

Given two ciphertexts E(a) and E(b), an attacker cannot determine:
- Whether a = b
- Whether a > b
- Any relationship between a and b

### Ciphertext Indistinguishability

All ciphertexts look random, regardless of plaintext value.

### Key Security

- Decryption keys never leave Inco's secure infrastructure
- Access controlled by Solana signatures
- No on-chain key material

## Performance

| Operation | Latency | Notes |
|-----------|---------|-------|
| `new_euint128` | 20-30ms | CPI overhead |
| `e_add` | 20-30ms | CPI overhead |
| `e_sub` | 20-30ms | CPI overhead |
| `e_mul` | 30-50ms | More expensive |
| Client encrypt | 10-50ms | Off-chain |
| Client decrypt | 50-100ms | Requires auth |

## Best Practices

1. **Minimize CPI calls** - Batch operations when possible
2. **Client-side encryption** - Never send plaintext to program
3. **Input validation** - Validate ciphertext format
4. **Error handling** - Handle overflow/underflow gracefully

```rust
// Good: Check for valid ciphertext
require!(!encrypted_amount.is_empty(), BagelError::InvalidCiphertext);

// Good: Handle potential errors
let result = e_add(cpi_ctx, a, b, 0)
    .map_err(|_| BagelError::Overflow)?;
```

## References

- [Inco Lightning Documentation](https://docs.inco.org/svm/home)
- [TFHE Paper](https://eprint.iacr.org/2018/421)
- [FHE Overview](https://en.wikipedia.org/wiki/Fully_homomorphic_encryption)
