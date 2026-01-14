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
- Create new payrolls
- Set salary rates (SOL/second)
- View projections (hourly/daily/yearly)
- Demonstrates Arcium encryption, MagicBlock streaming, Privacy Cash yield

### Employee Dashboard (`pages/employee.tsx`)
- **Real-time streaming simulation** (updates every second!)
- Balance display with yield bonus
- Private withdrawal button
- Educational "How It Works" section

## Demo Mode

This is a **proof of concept** frontend that simulates the user experience. The actual privacy integrations (Arcium MPC, ShadowWire Bulletproofs, MagicBlock PERs, Privacy Cash Vaults) are implemented in the Solana program backend.

### What's Real
- Solana program deployed on devnet: `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU`
- Wallet connection via Solana Wallet Adapter
- Helius RPC integration
- 4,100+ lines of production-ready backend code

### What's Simulated
- The streaming balance (updates every second client-side)
- The withdraw flow (shows what would happen)
- Privacy features are explained but not executed client-side

## Configuration

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_HELIUS_API_KEY=06227422-9d57-42de-a7b3-92f1491c58af
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_BAGEL_PROGRAM_ID=8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
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
- `arcium.ts` - Arcium MPC client for encrypted computations
- `shadowwire.ts` - ShadowWire client for zero-knowledge transfers
- `magicblock.ts` - MagicBlock client for streaming payments
- `privacycash.ts` - Privacy Cash client for yield generation

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

## Future Enhancements

When the privacy SDKs release their production APIs:

1. **Real Arcium Integration**
   - Replace mock encryption with actual MPC calls
   - Use `@arcium-hq/client` for circuit execution

2. **Real ShadowWire Integration**
   - Implement actual Bulletproof generation
   - Connect to ShadowWire program for private transfers

3. **Real MagicBlock Integration**
   - Connect to MagicBlock PER nodes
   - Stream updates via WebSocket

4. **Real Privacy Cash Integration**
   - Query actual vault yields
   - Display real APY rates

5. **Program IDL Integration**
   - Generate TypeScript types from Anchor IDL
   - Auto-generate client code with Codama

## Links

- **Program**: https://explorer.solana.com/address/8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU?cluster=devnet
- **GitHub**: https://github.com/ConejoCapital/Bagel
- **Helius Dashboard**: https://dev.helius.xyz/

## License

MIT - Built for Solana Privacy Hackathon 2026
