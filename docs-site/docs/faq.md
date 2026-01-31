---
sidebar_position: 8
---

# FAQ

Frequently asked questions about Bagel Protocol.

## General

### What is Bagel?

Bagel is a privacy-first payroll protocol on Solana that uses Fully Homomorphic Encryption (FHE) to keep salary data, balances, and identities encrypted on-chain.

### How is Bagel different from traditional payroll?

| Feature | Traditional | Bagel |
|---------|------------|-------|
| Salary visibility | Public | Encrypted |
| Balance visibility | Public | Encrypted |
| Transfer amounts | Public | Encrypted |
| Identity linkage | Public | Hidden |

### What networks does Bagel support?

Currently Devnet, with Mainnet planned for production release.

## Privacy

### How does FHE work?

Fully Homomorphic Encryption allows computations on encrypted data without decrypting:

```
E(a) + E(b) = E(a + b)
```

This means salary calculations happen while values remain encrypted.

### Can anyone see my salary?

No. Your salary is stored as an `Euint128` encrypted value. Only you (with Inco authorization) can decrypt it.

### Can observers see transfer amounts?

No. All deposits and withdrawals use Inco Confidential Tokens where amounts are encrypted.

### How are identities protected?

Bagel uses index-based PDAs instead of pubkeys in account addresses:

```
// Hidden identity
["employee", business_pda, 5]

// NOT
["employee", employer_pubkey, employee_pubkey]
```

## Technical

### What's the minimum withdrawal interval?

60 seconds between withdrawals to prevent timing analysis attacks.

### How does real-time streaming work?

MagicBlock TEE allows balance updates every ~10ms:

1. Employee entry delegated to TEE
2. TEE calculates accrued salary in real-time
3. State committed to L1 on withdrawal

### What tokens are supported?

USDBagel (confidential USDC) on Devnet:
- Mint: `GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt`

### How do I get test tokens?

1. Get devnet SOL from [Solana Faucet](https://faucet.solana.com)
2. Request USDBagel from the Bagel faucet (coming soon)

## Integration

### How do I integrate Bagel?

```typescript
import { Program } from '@coral-xyz/anchor';
import { IncoClient } from '@inco/sdk';

const program = new Program(BagelIDL, BAGEL_PROGRAM_ID, provider);
const incoClient = new IncoClient({ network: 'devnet' });

// Encrypt and deposit
const encrypted = await incoClient.encrypt(amount);
await program.methods.deposit(Buffer.from(encrypted)).rpc();
```

### Do I need special wallets?

No, any Solana wallet works (Phantom, Solflare, etc.). Encryption happens client-side.

### Can I use this for any token?

Currently only USDBagel. Multi-token support is planned.

## Business

### How much does it cost?

| Operation | Cost |
|-----------|------|
| Initialize vault | ~0.002 SOL |
| Register business | ~0.002 SOL |
| Add employee | ~0.002 SOL |
| Deposit | ~0.001 SOL |
| Withdraw | ~0.001 SOL |

### Is there a subscription fee?

No subscription fees. Only standard Solana transaction costs.

### Can I have multiple businesses?

Yes. Each business gets a unique `BusinessEntry` with separate employee management.

### Can employees work for multiple businesses?

Yes. Each employee can have separate `EmployeeEntry` accounts under different businesses.

## Troubleshooting

### "InvalidCiphertext" error

Ensure you're encrypting with the Inco SDK:
```typescript
const encrypted = await incoClient.encrypt(amount);
```

### "WithdrawTooSoon" error

Wait 60 seconds between withdrawals:
```typescript
const lastAction = employee.lastAction.toNumber();
const now = Math.floor(Date.now() / 1000);
if (now - lastAction < 60) {
  throw new Error('Please wait before withdrawing');
}
```

### "Unauthorized" error

Ensure you're using the correct wallet:
- Authority operations: Use vault authority
- Employee operations: Use employee wallet
- Employer operations: Use employer wallet

### Transaction fails silently

Check the Solana Explorer for detailed error messages. Common causes:
- Insufficient SOL for fees
- Wrong account addresses
- Program ID mismatch

## Support

### Where can I get help?

- [Discord](https://discord.gg/bagel)
- [GitHub Issues](https://github.com/ConejoCapital/Bagel/issues)
- [Twitter](https://twitter.com/bagelprotocol)

### How do I report bugs?

Create an issue on GitHub with:
- Transaction signature
- Error message
- Steps to reproduce
- Environment (network, wallet, etc.)

### Is there documentation for developers?

Yes! Check out:
- [Getting Started](./getting-started)
- [Architecture](./architecture/overview)
- [API Reference](./reference/program-api)
- [TypeScript SDK](./reference/typescript-sdk)
