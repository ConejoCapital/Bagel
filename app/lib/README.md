# 📚 Bagel Frontend Libraries

This directory contains utility modules for integrating with privacy SDKs.

## Files

### `arcium.ts`
Arcium C-SPL integration for client-side encryption/decryption.

**Key Features:**
- RescueCipher for x25519 key exchange
- Client-side salary encryption
- MPC circuit calls
- Wallet integration

**Usage:**
```typescript
import { createArciumClient } from './lib/arcium';

const arcium = createArciumClient();

// Employer encrypts salary
const encrypted = await arcium.encryptSalary(1_000_000, employeePubkey);

// Employee decrypts pay
const myPay = await arcium.decryptAmount(encrypted, myPrivateKey);
```

### Future Files:
- `shadowwire.ts` - Private ZK transfers
- `magicblock.ts` - Streaming state management
- `privacy-cash.ts` - Yield vault integration
- `range.ts` - Compliance features

## Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_HELIUS_API_KEY=06227422-9d57-42de-a7b3-92f1491c58af
NEXT_PUBLIC_ARCIUM_MPC_PROGRAM_ID=<circuit_id_after_deployment>
NEXT_PUBLIC_BAGEL_PROGRAM_ID=8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
```

## Development

```bash
# Install dependencies
npm install

# Run type checking
npm run type-check

# Run tests
npm test
```

## Notes

Current implementations are mocks for testing the flow.
Real Arcium SDK integration will be added when circuit is deployed.
