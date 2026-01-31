---
sidebar_position: 5
---

# Glossary

Key terms and concepts used in the Bagel Protocol.

## A

### Accrued Balance
The accumulated salary an employee has earned but not yet withdrawn. Stored encrypted as `Euint128`.

### Anchor
The Rust framework used to build Solana programs. Bagel uses Anchor 0.29+.

## B

### Bagel Program
The main Solana smart contract that manages payroll operations with privacy.
- **Program ID**: `AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj`

### BusinessEntry
An on-chain account representing a registered business. Uses index-based PDA for privacy.

## C

### Ciphertext
The encrypted form of data. In Bagel, all sensitive data is stored as ciphertext.

### Confidential Tokens
Token transfers where the amount is encrypted. Uses Inco Confidential Token program.

### CPI (Cross-Program Invocation)
Calling one Solana program from another. Bagel uses CPI for Inco operations.

## D

### Delegation
The process of giving TEE control over an account for real-time streaming.

### Decrypt
The process of converting ciphertext back to plaintext. Requires authorization.

## E

### Ebool
Encrypted boolean type in Inco Lightning. Used for encrypted comparisons.

### EmployeeEntry
An on-chain account representing an employee. Contains encrypted salary and accrued balance.

### Encrypt
The process of converting plaintext to ciphertext. Done client-side with Inco SDK.

### Euint128
Encrypted 128-bit unsigned integer. The primary encrypted type in Bagel.

```rust
pub struct Euint128 {
    pub handle: [u8; 16],
}
```

## F

### FHE (Fully Homomorphic Encryption)
Encryption scheme that allows computation on encrypted data. Bagel uses TFHE via Inco.

## H

### Handle
A reference to encrypted data stored by Inco. The 16-byte `handle` field in `Euint128`.

### Helius
Infrastructure provider for high-performance Solana RPC and APIs.

### Homomorphic Operation
A mathematical operation on encrypted data that produces encrypted results.
- `e_add`: Encrypted addition
- `e_sub`: Encrypted subtraction
- `e_mul`: Encrypted multiplication

## I

### Index-Based PDA
PDA derivation using sequential indices instead of pubkeys for privacy.

```rust
// Privacy-preserving
seeds = ["employee", business_pda, employee_index]
```

### Inco Lightning
The FHE service providing encrypted storage and computation on Solana.
- **Program ID**: `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`

### Inco Tokens
Confidential token program for encrypted transfers.
- **Program ID**: `HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22`

## L

### L1 (Layer 1)
The main Solana blockchain, as opposed to rollups or TEE environments.

## M

### MagicBlock
TEE-based infrastructure for real-time state updates.
- **Program ID**: `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`

### MasterVault
The global account holding aggregate funds and encrypted counts.

## P

### PDA (Program Derived Address)
Deterministic addresses derived from seeds. Bagel uses privacy-preserving PDAs.

### PER (Private Ephemeral Rollup)
MagicBlock's real-time execution environment in TEE.

### Plaintext
Unencrypted data. Should never be stored on-chain for sensitive information.

## S

### Seeds
Byte arrays used to derive PDA addresses:
- MasterVault: `["master_vault"]`
- BusinessEntry: `["entry", master_vault, index]`
- EmployeeEntry: `["employee", business_entry, index]`

### Streaming
Real-time salary accrual, typically using TEE for sub-second granularity.

## T

### TEE (Trusted Execution Environment)
Secure hardware enclave for private computation. Used by MagicBlock.

### TFHE (Torus FHE)
The specific FHE scheme used by Inco Lightning.

## U

### USDBagel
The confidential stablecoin used in Bagel Protocol.
- **Mint**: `A3G2NBGL7xH9T6BYwVkwRGsSYxtFPdg4HSThfTmV94ht`

### UserTokenAccount
PDA-based registry for deterministic token account lookup.

## V

### Vault
See [MasterVault](#mastervault).

## W

### Withdrawal
The process of an employee claiming accrued salary. Uses confidential transfers.

## Z

### Zero-Knowledge
Cryptographic technique where a prover demonstrates knowledge without revealing the data. Bagel uses FHE which provides similar privacy guarantees through a different mechanism.
