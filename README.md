# Bagel - Privacy-First Payroll on Solana

**Real-time streaming payments with zero-knowledge transfers and automated yield generation.**

[![Deployed](https://img.shields.io/badge/Deployed-Devnet-success)](https://explorer.solana.com/address/8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU?cluster=devnet)
[![Built with Anchor](https://img.shields.io/badge/Anchor-0.32.1-blueviolet)](https://www.anchor-lang.com/)

---

## Overview

Bagel is a privacy-preserving payroll system built on Solana. It solves the "Glass Office" problem where traditional crypto payroll exposes sensitive financial data on-chain.

**Key Features:**
- Encrypted salary storage via Arcium MPC
- Zero-knowledge transfers via ShadowWire Bulletproofs
- Real-time streaming via MagicBlock Ephemeral Rollups
- Automated yield generation via Privacy Cash Vaults

**Program ID:** `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU`

---

## Prerequisites

- **Rust** 1.92.0+
- **Solana CLI** 2.0+
- **Anchor CLI** 0.32.1
- **Node.js** 18+
- **Bun** or **npm**

---

## Installation

```bash
# Clone the repository
git clone https://github.com/ConejoCapital/Bagel.git
cd Bagel

# Install Rust dependencies
cargo build

# Install root dependencies
npm install

# Build the Solana program
anchor build
```

---

## Running the App

### Frontend Development

```bash
cd app

# Install dependencies
npm install
# or
bun install

# Start the development server
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Pages

| Page | URL | Description |
|------|-----|-------------|
| Landing | `/landing` | Marketing landing page |
| Dashboard | `/dashboard` | Employer overview with charts |
| Employer | `/employer` | Create and manage payrolls |
| Employee | `/employee` | View earnings and withdraw |
| Employees | `/employees` | Manage employee list |
| History | `/history` | Transaction history |

---

## Project Structure

```
Bagel/
├── programs/bagel/src/          # Solana program (Rust/Anchor)
│   ├── lib.rs                   # Program entry point
│   ├── instructions/            # Instruction handlers
│   │   ├── bake_payroll.rs      # Create new payroll
│   │   ├── deposit_dough.rs     # Fund payroll vault
│   │   ├── get_dough.rs         # Employee withdrawal
│   │   ├── update_salary.rs     # Modify salary rate
│   │   └── close_jar.rs         # Close payroll
│   ├── privacy/                 # Privacy integrations
│   │   ├── arcium.rs            # MPC encrypted calculations
│   │   ├── shadowwire.rs        # ZK Bulletproof transfers
│   │   ├── magicblock.rs        # Streaming payments
│   │   ├── kamino.rs            # DeFi yield integration
│   │   └── privacycash.rs       # Yield vaults
│   └── state/                   # Account structures
│
├── encrypted-ixs/circuits/      # Arcium MPC circuits
│   └── payroll.arcis            # Salary calculation circuit
│
├── app/                         # Frontend (Next.js 15)
│   ├── pages/                   # Application routes
│   ├── lib/                     # SDK clients
│   │   ├── bagel-client.ts      # Main Bagel SDK
│   │   ├── arcium.ts            # MPC client
│   │   ├── shadowwire.ts        # ZK transfer client
│   │   ├── magicblock.ts        # Streaming client
│   │   └── privacycash.ts       # Yield client
│   └── components/              # React components
│
├── scripts/                     # Deployment scripts
│   ├── deploy-arcium-cli.sh     # Arcium deployment
│   ├── deploy-arcium-circuit.sh # Circuit deployment
│   └── deploy-mainnet.sh        # Mainnet deployment
│
├── tests/                       # Integration tests
└── docs-site/                   # Documentation website
```

---

## Scripts

### Root Commands

```bash
# Start frontend dev server
npm run dev

# Build program + frontend
npm run build

# Run Anchor tests
npm run test

# Deploy program
npm run deploy

# Lint frontend
npm run lint
```

### App Commands (from `/app`)

```bash
npm run dev      # Start Next.js dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run test     # Run Jest tests
```

### Anchor Commands

```bash
anchor build                           # Build program
anchor test                            # Run tests with local validator
anchor test --skip-local-validator     # Run tests on devnet
anchor deploy                          # Deploy to configured cluster
```

---

## Configuration

### Solana Cluster

Edit `Anchor.toml` to change the target cluster:

```toml
[provider]
cluster = "Devnet"  # Options: Localnet, Devnet, Mainnet
wallet = "~/.config/solana/id.json"
```

### Environment Variables (Frontend)

Create `app/.env.local`:

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
```

---

## Privacy Architecture

### How It Works

1. **Employer creates payroll** - Salary is encrypted via Arcium MPC before storing on-chain
2. **Funds are deposited** - SOL goes into a vault that earns yield automatically
3. **Employee accrues salary** - Calculated every second via MagicBlock streaming
4. **Employee withdraws** - Amount is hidden via ShadowWire Bulletproofs
5. **Yield is distributed** - 80% to employee, 20% to employer

### Privacy Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Storage | Arcium C-SPL | Encrypted on-chain state |
| Computation | Arcium MPC | Private salary calculations |
| Transfers | ShadowWire | Zero-knowledge withdrawals |
| Streaming | MagicBlock | Real-time balance updates |
| Yield | Privacy Cash | Private lending vaults |

---

## Testing

```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/bagel.ts

# Run tests on devnet
anchor test --skip-local-validator
```

---

## Deployment

### Devnet

```bash
# Configure for devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 5

# Build and deploy
anchor build
anchor deploy
```

### Mainnet

```bash
# Use the mainnet deployment script
./scripts/deploy-mainnet.sh
```

### Arcium Circuit

```bash
# Deploy MPC circuit
./scripts/deploy-arcium-circuit.sh

# Update circuit ID in program
./scripts/update-circuit-id.sh
```

---

## Tech Stack

**Blockchain:**
- Solana
- Anchor Framework 0.32.1

**Privacy:**
- Arcium MPC (v0.5.4)
- ShadowWire Bulletproofs
- MagicBlock Ephemeral Rollups
- Privacy Cash Vaults

**Frontend:**
- Next.js 15
- React 18
- TailwindCSS
- Recharts
- Framer Motion

**Wallets:**
- Solana Wallet Adapter
- Phantom, Solflare, etc.

---

## License

MIT License - see [LICENSE](./LICENSE)

---

## Links

- **GitHub:** [github.com/ConejoCapital/Bagel](https://github.com/ConejoCapital/Bagel)
- **Explorer:** [Program on Solana Explorer](https://explorer.solana.com/address/8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU?cluster=devnet)

---

Built by [@ConejoCapital](https://twitter.com/ConejoCapital) & [@tomi204_](https://twitter.com/tomi204_)
