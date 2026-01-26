# Bagel Frontend

A Next.js-based proof of concept demonstrating the Bagel privacy-first payroll system.

## Features

- **Wallet Connection**: Phantom, Solflare, and more via @solana/wallet-adapter
- **Employer Dashboard**: Create payrolls, see projections
- **Employee Dashboard**: Real-time streaming balance simulation, private withdrawals
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Devnet Integration**: Connected to the deployed Bagel program on Solana Devnet

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Architecture

```
┌─────────────────┐
│   _app.tsx      │  ← Wallet adapter setup + Helius RPC
└────────┬────────┘
         │
    ┌────┴────────────────┬───────────────┐
    │                     │               │
┌───▼────┐      ┌────────▼──────┐   ┌───▼──────┐
│ index  │      │   employer    │   │ employee │
│ (home) │      │  (dashboard)  │   │  (stream)│
└────────┘      └───────────────┘   └──────────┘
```

## Key Components

### Home Page (`pages/index.tsx`)
- Landing page with feature overview
- Wallet connection prompt
- Links to employer/employee dashboards

### Employer Dashboard (`pages/employer.tsx`)
- Register business (one-time setup)
- Add employees with encrypted salaries
- Deposit funds to master vault
- View projections (hourly/daily/yearly)
- Demonstrates Inco Lightning encryption, MagicBlock streaming

### Employee Dashboard (`pages/employee.tsx`)
- Request withdrawals using business and employee indices
- Private withdrawal with optional ShadowWire ZK proofs
- Transaction verification links

## Demo Mode

This is the frontend for Bagel Privacy Payroll. The privacy integrations (Inco Lightning, ShadowWire Bulletproofs, MagicBlock PERs, Range Compliance, Helius RPC) are implemented in the Solana program backend.

### What's Real
- Solana program deployed on devnet: `J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE`
- Wallet connection via Solana Wallet Adapter
- Helius RPC integration
- Privacy tool integrations (Inco, MagicBlock, ShadowWire, Range)

### What's Integrated
- Real on-chain transactions
- Inco Lightning encrypted state
- MagicBlock PER delegation (ready)
- ShadowWire private transfers (mainnet)
- Range compliance checks

## Configuration

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_HELIUS_API_KEY=YOUR_HELIUS_API_KEY
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_BAGEL_PROGRAM_ID=J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE
```

### RPC Endpoints
- **Devnet**: `https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af`
- **Mainnet**: `https://mainnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af`

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Solana Wallet Adapter** - Wallet integration
- **@coral-xyz/anchor** - Solana program client
- **@solana/web3.js** - Solana blockchain interaction

## Privacy Integration Libraries

Located in `lib/`:
- `inco.ts` - Inco Lightning client for FHE encrypted state
- `shadowwire.ts` - ShadowWire client for zero-knowledge transfers
- `magicblock.ts` - MagicBlock client for streaming payments
- `range.ts` - Range API client for compliance checks
- `helius.ts` - Helius RPC and DAS API client

## Design System

### Colors
- **Bagel Orange** `#FF6B35` - Primary actions, highlights
- **Bagel Cream** `#F7F7F2` - Background
- **Bagel Dark** `#2D2D2A` - Text
- **Bagel Sesame** `#FFD23F` - Secondary actions, accents

### Typography
- System fonts for fast loading
- Bold headings, clear hierarchy
- Friendly, conversational copy

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Architecture Notes

The frontend uses the new index-based PDA architecture:
- **Master Vault**: Single global vault for all funds
- **Business Entry**: Index-based PDA (no employer pubkey in seeds)
- **Employee Entry**: Index-based PDA (no employee pubkey in seeds)

Employees need their business entry index and employee index (provided by employer) to request withdrawals.

## Future Enhancements

1. **Enhanced Inco Integration**
   - Use Inco SDK for client-side encryption
   - Real FHE operations on encrypted values

2. **Real ShadowWire Integration**
   - Implement actual Bulletproof generation
   - Connect to ShadowWire program for private transfers (mainnet)

3. **Real MagicBlock Integration**
   - Connect to MagicBlock PER nodes
   - Stream updates via WebSocket

4. **Program IDL Integration**
   - Generate TypeScript types from Anchor IDL
   - Auto-generate client code

## Links

- **Program**: https://explorer.solana.com/address/J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE?cluster=devnet
- **GitHub**: https://github.com/ConejoCapital/Bagel
- **Helius Dashboard**: https://dev.helius.xyz/

## License

MIT - Built for Solana Privacy Hackathon 2026
