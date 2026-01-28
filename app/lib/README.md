# Bagel Frontend Libraries

This directory contains utility modules for integrating with privacy SDKs.

## Files

### `inco.ts`
Inco Lightning integration for FHE encrypted state.

**Key Features:**
- Encrypted value creation (Euint128)
- Homomorphic operations (add, subtract)
- Client-side encryption helpers

### `shadowwire.ts`
ShadowWire private transfer integration.

**Key Features:**
- Zero-knowledge private transfers
- Bulletproof amount hiding
- Internal/external transfer types

### `magicblock.ts`
MagicBlock PER integration for real-time streaming.

**Key Features:**
- TEE delegation
- Real-time balance updates
- State commit/undelegate

### `range.ts`
Range compliance integration.

**Key Features:**
- Wallet risk scoring
- OFAC sanctions checks
- Compliance pre-screening

### `helius.ts`
Helius RPC and DAS API integration.

**Key Features:**
- Enhanced transaction parsing
- Privacy audit data fetching
- High-performance RPC

## Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_HELIUS_API_KEY=YOUR_HELIUS_API_KEY
NEXT_PUBLIC_BAGEL_PROGRAM_ID=AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj
NEXT_PUBLIC_INCO_PROGRAM_ID=5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj
NEXT_PUBLIC_SHADOWWIRE_PROGRAM_ID=GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD
NEXT_PUBLIC_RANGE_API_KEY=YOUR_RANGE_API_KEY
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
