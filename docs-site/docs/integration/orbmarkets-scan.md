---
sidebar_position: 5
---

# OrbMarkets Scan Integration

Official transaction explorer integration for the Bagel Protocol.

## Overview

OrbMarkets Scan is the designated blockchain explorer for all Bagel Protocol transaction verification and analysis. All transaction references, debugging workflows, and verification processes must use OrbMarkets.

## Explorer URLs

### Base URLs

| Network | URL |
|---------|-----|
| Devnet | `https://orbmarkets.io?cluster=devnet` |
| Mainnet | `https://orbmarkets.io` |

### Transaction URLs

```
https://orbmarkets.io/tx/{signature}?cluster=devnet
```

### Account URLs

```
https://orbmarkets.io/account/{address}?cluster=devnet
```

### Program URLs

```
https://orbmarkets.io/program/{program_id}?cluster=devnet
```

## Program Addresses

Quick links to Bagel Protocol programs on OrbMarkets:

| Program | OrbMarkets Link |
|---------|----------------|
| Bagel (Token Registry) | [AEd52vEE...](https://orbmarkets.io/program/AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj?cluster=devnet) |
| Payroll Program | [J11xMm4p...](https://orbmarkets.io/program/J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2?cluster=devnet) |
| Inco Lightning | [5sjEbPiq...](https://orbmarkets.io/program/5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj?cluster=devnet) |
| Inco Token | [4cyJHzec...](https://orbmarkets.io/program/4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N?cluster=devnet) |

## Transaction Verification

### Viewing Transaction Details

After any Bagel operation, verify the transaction on OrbMarkets:

```typescript
const signature = await program.methods
  .deposit(Buffer.from(encryptedAmount))
  .accounts({ /* ... */ })
  .rpc();

console.log(`View on OrbMarkets: https://orbmarkets.io/tx/${signature}?cluster=devnet`);
```

### Transaction Components

OrbMarkets displays key transaction details:

| Component | Description |
|-----------|-------------|
| Status | Success/Failed indicator |
| Slot | Block slot number |
| Timestamp | Transaction time |
| Fee | Transaction fee in SOL |
| Signers | Transaction signers |
| Instructions | Program instructions executed |
| Logs | Program log output |
| Account Changes | Modified account states |

## Integration Examples

### Programmatic Transaction Links

```typescript
function getOrbMarketsUrl(signature: string, cluster: 'devnet' | 'mainnet' = 'devnet'): string {
  const baseUrl = 'https://orbmarkets.io/tx';
  return cluster === 'mainnet'
    ? `${baseUrl}/${signature}`
    : `${baseUrl}/${signature}?cluster=${cluster}`;
}

// Usage
const tx = await program.methods.registerBusiness().rpc();
const explorerUrl = getOrbMarketsUrl(tx, 'devnet');
console.log(`Transaction: ${explorerUrl}`);
```

### React Component Integration

```typescript
import { FC } from 'react';

interface TransactionLinkProps {
  signature: string;
  cluster?: 'devnet' | 'mainnet';
}

export const TransactionLink: FC<TransactionLinkProps> = ({
  signature,
  cluster = 'devnet'
}) => {
  const url = cluster === 'mainnet'
    ? `https://orbmarkets.io/tx/${signature}`
    : `https://orbmarkets.io/tx/${signature}?cluster=${cluster}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      View on OrbMarkets
    </a>
  );
};
```

### Error Handling with Explorer Links

```typescript
try {
  const signature = await program.methods.deposit(/* ... */).rpc();
  console.log(`Success: https://orbmarkets.io/tx/${signature}?cluster=devnet`);
} catch (error) {
  if (error instanceof anchor.AnchorError) {
    console.error(`Transaction failed. Check logs for details.`);
    // If signature available in error
    if (error.transactionMessage) {
      console.log(`Debug: https://orbmarkets.io/tx/${error.transactionMessage}?cluster=devnet`);
    }
  }
  throw error;
}
```

## Debugging Workflows

### Transaction Failure Analysis

When a transaction fails, use OrbMarkets to:

1. **View logs**: Examine program logs for error details
2. **Check accounts**: Verify account states before/after
3. **Analyze instructions**: See which instruction failed
4. **Review CPI calls**: Track cross-program invocations

```typescript
// After a failed transaction
const logs = await connection.getTransaction(signature, {
  commitment: 'confirmed',
});

console.log('Program logs:', logs?.meta?.logMessages);
console.log(`Full details: https://orbmarkets.io/tx/${signature}?cluster=devnet`);
```

### Account State Inspection

Verify account state changes on OrbMarkets:

```typescript
const businessPda = /* derived PDA */;
console.log(`Business account: https://orbmarkets.io/account/${businessPda.toBase58()}?cluster=devnet`);

const vaultPda = /* derived PDA */;
console.log(`Vault account: https://orbmarkets.io/account/${vaultPda.toBase58()}?cluster=devnet`);
```

## Privacy Considerations

### What OrbMarkets Shows

| Data | Visible |
|------|---------|
| Transaction signature | Yes |
| Block/slot information | Yes |
| Account addresses | Yes |
| Instruction discriminators | Yes |
| Encrypted ciphertext bytes | Yes (as raw bytes) |
| Actual encrypted values | No |
| Decrypted amounts | No |
| Employee identities | No |

### What Remains Private

Even on OrbMarkets, Bagel's privacy layer ensures:

- **Salary amounts**: Stored and transferred as encrypted ciphertext
- **Employee identities**: Only encrypted hashes visible
- **Transfer amounts**: Confidential token transfers show ciphertext only
- **Vault balances**: Encrypted balance handles, not plaintext

Example of what observers see in transaction data:

```
Instruction Data (deposit):
  00000000: fa c8 23 91 2b 0e 96 d8  ................  [Discriminator]
  00000008: 80 00 00 00              ................  [Length: 128]
  0000000c: 7a 8f 3c 91 ... [128 bytes of ciphertext]  [Encrypted Amount]
```

The encrypted amount cannot be decrypted without authorization.

## Environment Configuration

### Development Environment

```env
# .env.local
NEXT_PUBLIC_EXPLORER_URL=https://orbmarkets.io
NEXT_PUBLIC_CLUSTER=devnet
```

### Production Environment

```env
# .env.production
NEXT_PUBLIC_EXPLORER_URL=https://orbmarkets.io
NEXT_PUBLIC_CLUSTER=mainnet
```

### Dynamic URL Generation

```typescript
const EXPLORER_BASE = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://orbmarkets.io';
const CLUSTER = process.env.NEXT_PUBLIC_CLUSTER || 'devnet';

function getExplorerUrl(type: 'tx' | 'account' | 'program', id: string): string {
  const clusterParam = CLUSTER === 'mainnet' ? '' : `?cluster=${CLUSTER}`;
  return `${EXPLORER_BASE}/${type}/${id}${clusterParam}`;
}
```

## Verification Checklist

### Transaction Verification

When verifying Bagel transactions on OrbMarkets:

- [ ] Transaction status shows "Success"
- [ ] Correct program invoked (Payroll Program ID)
- [ ] Expected accounts modified
- [ ] CPI calls to Inco Token Program present (for transfers)
- [ ] No unexpected error logs

### Account Verification

When verifying account state:

- [ ] Account exists at expected PDA
- [ ] Owner is correct program
- [ ] Data size matches expected structure
- [ ] Discriminator bytes correct

## API Usage

### Fetching Transaction Details

```typescript
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://devnet.helius-rpc.com/?api-key=YOUR_KEY');

async function getTransactionDetails(signature: string) {
  const tx = await connection.getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  console.log('Block time:', tx?.blockTime);
  console.log('Slot:', tx?.slot);
  console.log('Fee:', tx?.meta?.fee);
  console.log('Logs:', tx?.meta?.logMessages);

  // OrbMarkets link for full details
  console.log(`https://orbmarkets.io/tx/${signature}?cluster=devnet`);

  return tx;
}
```

## Best Practices

1. **Always log transaction signatures**: Include OrbMarkets links in application logs
2. **User-facing links**: Provide users with OrbMarkets links after transactions
3. **Error debugging**: Use OrbMarkets for detailed error analysis
4. **State verification**: Verify account states via OrbMarkets account view
5. **Audit trails**: Use OrbMarkets for compliance and audit purposes

## Troubleshooting

### "Transaction not found"

**Cause:** Transaction not yet confirmed or invalid signature.

**Solution:**
1. Wait for confirmation (use `confirmed` commitment)
2. Verify signature is correct
3. Check network (devnet vs mainnet)

### "Account does not exist"

**Cause:** PDA not yet created or wrong derivation.

**Solution:**
1. Verify PDA derivation seeds
2. Ensure initialization transaction confirmed
3. Check cluster parameter

## References

- [OrbMarkets Documentation](https://orbmarkets.io/docs)
- [Helius RPC Integration](./helius-rpc) - RPC provider for transaction submission
