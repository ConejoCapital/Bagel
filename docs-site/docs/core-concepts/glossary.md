---
sidebar_position: 4
title: Glossary
---

# Glossary

Key terms and concepts used in Bagel documentation.

## A

### APY (Annual Percentage Yield)
The real rate of return earned on an investment, taking into account compound interest. Bagel's yield vaults typically generate 5-10% APY.

### Arcium
A privacy infrastructure provider offering Multi-Party Computation (MPC) and Confidential SPL (C-SPL) for encrypted on-chain operations. Used in Bagel for encrypted salary storage and computation.

### ArgBuilder
Arcium v0.5.1 API for constructing type-safe arguments to MPC circuits.

## B

### BagelJar
Alternative name for PayrollJar. The "Bagel" theme extends throughout the codebase.

### BLS Signature
Boneh-Lynn-Shacham signature scheme used by Arcium MPC to verify computation outputs haven't been tampered with.

### Bulletproof
A zero-knowledge proof system that proves a committed value lies within a range without revealing the value. Used by ShadowWire for private transfers. No trusted setup required.

### Bump (Seed)
A single byte (0-255) used in PDA derivation to ensure the resulting address is off the Ed25519 curve and thus has no private key.

## C

### C-SPL (Confidential SPL)
Arcium's standard for encrypted SPL token operations. Enables hidden balances and private transfers while maintaining compatibility with Token-2022.

### Commitment (Pedersen)
A cryptographic primitive that binds to a value while hiding it: `C = aG + rH` where `a` is the amount and `r` is a random blinding factor.

## D

### Delegation
In MagicBlock, the process of transferring account ownership to the Delegation Program so the account can be processed in an Ephemeral Rollup.

### Discriminator
First 8 bytes of an Anchor account that identify the account type. Computed as `sha256("account:<AccountName>")[..8]`.

### Dough
Bagel's playful term for funds/money. "Add dough" = deposit, "Get dough" = withdraw.

## E

### ECDH (Elliptic Curve Diffie-Hellman)
Key exchange protocol used to establish shared secrets. Bagel uses x25519 ECDH for encryption key derivation.

### Ephemeral Rollup (ER)
MagicBlock's L2 solution that processes state off-chain with high frequency, then commits results to Solana L1. Enables real-time streaming payments.

## G

### Glass Office Problem
The core problem Bagel solves: traditional crypto payments expose all financial data publicly, making salaries visible to competitors, colleagues, and anyone on the blockchain.

## I

### Intel TDX
Intel Trust Domain Extensions - hardware-based Trusted Execution Environment used by MagicBlock to protect streaming state from observation.

## K

### Kamino Finance
DeFi protocol on Solana offering lending vaults. Bagel routes 90% of deposits to Kamino to generate yield on idle payroll funds.

### kSOL
Receipt token received when depositing SOL into Kamino vaults. Represents a position in the lending pool.

## L

### Lamports
Smallest unit of SOL. 1 SOL = 1,000,000,000 lamports (10^9). Named after Leslie Lamport.

### Last Withdraw
Timestamp tracking when an employee last withdrew salary. Used to calculate accrued amount.

## M

### MPC (Multi-Party Computation)
Cryptographic technique allowing multiple parties to jointly compute a function while keeping inputs private. Arcium uses MPC for encrypted salary calculations.

### MXE (Multi-party eXecution Environment)
Arcium's distributed network of nodes that perform MPC computations.

## P

### PayrollJar (see BagelJar)
The main account structure in Bagel, storing the employer-employee payroll relationship including encrypted salary, timestamps, and vault reference.

### PDA (Program Derived Address)
Deterministic address derived from seeds and a program ID. Has no private key. PayrollJar uses PDA with seeds `[bagel_jar, employer, employee]`.

### Priority Fee
Additional fee to incentivize validators/MPC nodes to process transactions faster. Arcium v0.5.1 requires `cu_price_micro` parameter.

## R

### Range Proof
Zero-knowledge proof that a committed value lies within a specified range (e.g., 0 to 2^64) without revealing the actual value.

### RescueCipher
Symmetric encryption scheme used by Arcium with SHA3-256 equivalent security for key derivation.

## S

### Salary Per Second
Bagel stores salaries as lamports-per-second rates. Formula: `annual_salary / seconds_per_year / sol_price * LAMPORTS_PER_SOL`.

### ShadowWire
Privacy protocol by Radr Labs providing zero-knowledge transfers using Bulletproofs. Hides transfer amounts on-chain.

### Streaming Payments
Real-time salary accrual where balance updates continuously (every ~100ms) rather than discrete transactions. Enabled by MagicBlock.

## T

### TEE (Trusted Execution Environment)
Hardware-secured environment where code executes in isolation from the rest of the system. Intel TDX is used by MagicBlock.

### Token-2022
Solana's updated token standard with extensions including confidential transfers. Required for full C-SPL implementation.

### Total Accrued
Liquid buffer in PayrollJar holding 10% of deposits for immediate employee payouts.

## U

### USD1
Stablecoin supported by ShadowWire for private transfers. Used in Bagel for stable payroll payments.

### Undelegate
Returning an account from MagicBlock Ephemeral Rollup back to Solana L1 control.

## V

### Vault (Yield)
Account in Kamino/Privacy Cash holding funds that earn yield through lending.

## X

### x25519
Elliptic curve used for key exchange in encryption operations. Bagel derives encryption keys from wallet signatures via x25519 ECDH.

## Y

### Yield Distribution
Split of earned yield between parties. Bagel default: 80% to employees, 20% to employers.

### Yield Vault Position
Record tracking a deposit into a yield-generating vault, including principal, accrued yield, and APY.

## Z

### Zero-Knowledge Proof (ZKP)
Cryptographic proof that something is true without revealing why it's true. ShadowWire uses ZKPs to prove transfers are valid without revealing amounts.

---

## Quick Reference Table

| Term | What It Means in Bagel |
|------|------------------------|
| **Bake** | Create a new payroll |
| **Dough** | Funds/money |
| **Get Dough** | Employee withdraws salary |
| **Add Dough** | Employer deposits funds |
| **BagelJar / PayrollJar** | Payroll account |
| **Dough Vault** | Yield-generating vault |
| **Excess Dough** | Yield profits to claim |
| **Fresh Dough** | Newly deposited funds |

---

## See Also

- [PayrollJar](./payroll-jar) - Core account structure
- [Privacy Layer](./privacy-layer) - Privacy technologies explained
- [Yield Generation](./yield-generation) - How yield works
- [Architecture Overview](../architecture/overview) - System design
