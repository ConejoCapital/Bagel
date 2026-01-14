---
sidebar_position: 2
title: Getting Started
---

# Getting Started with Bagel

This guide will walk you through setting up your development environment and running your first Bagel payroll transaction.

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| **Rust** | 1.92.0+ | Smart contract development |
| **Solana CLI** | 1.18+ | Blockchain interaction |
| **Anchor** | 0.29.0+ | Solana framework |
| **Node.js** | 18+ | Frontend development |
| **npm/yarn** | Latest | Package management |

### Install Rust

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify installation
rustc --version
# Expected: rustc 1.92.0 or higher
```

### Install Solana CLI

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH (add to your shell profile)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
# Expected: solana-cli 1.18.x
```

### Install Anchor

```bash
# Install AVM (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install Anchor
avm install 0.29.0
avm use 0.29.0

# Verify installation
anchor --version
# Expected: anchor-cli 0.29.0
```

### Install Node.js

```bash
# Using nvm (recommended)
nvm install 18
nvm use 18

# Verify installation
node --version
# Expected: v18.x.x
```

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/ConejoCapital/Bagel.git
cd Bagel
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd app && npm install && cd ..
```

### 3. Configure Solana for Devnet

```bash
# Set to devnet
solana config set --url https://api.devnet.solana.com

# Create a new wallet (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Get free devnet SOL
solana airdrop 2
```

### 4. Build the Program

```bash
# Build the Anchor program
anchor build

# Expected output:
# Compiling bagel v0.1.0
# Finished release target(s)
```

### 5. Run Tests

```bash
# Run the test suite
anchor test --skip-local-validator

# Expected output:
# bagel
#   ✔ Bakes a payroll (initializes BagelJar)
```

### 6. Start the Frontend (Optional)

```bash
cd app

# Copy environment template
cp .env.local.example .env.local

# Start development server
npm run dev

# Open http://localhost:3000
```

## Your First Payroll

Let's create a simple payroll using the TypeScript client:

### Using the Frontend

1. **Connect Wallet**: Open [localhost:3000](http://localhost:3000) and connect your Phantom wallet
2. **Select "Employer"**: Click on the Employer dashboard
3. **Create Payroll**: Enter an employee address and salary
4. **Deposit Funds**: Add SOL to the payroll
5. **Done!**: The employee can now withdraw their accrued salary

### Using the CLI/SDK

```typescript
import { createPayroll, depositDough } from './app/lib/bagel-client';
import { Connection, PublicKey } from '@solana/web3.js';

// Setup connection
const connection = new Connection('https://api.devnet.solana.com');

// Create payroll for an employee
const employeeAddress = new PublicKey('EMPLOYEE_WALLET_ADDRESS');
const salaryPerSecond = 1_000_000; // 0.001 SOL per second ≈ $86/day

const txId = await createPayroll(
  connection,
  wallet,  // Your connected wallet
  employeeAddress,
  salaryPerSecond
);

console.log('Payroll created:', txId);

// Deposit funds
const depositTx = await depositDough(
  connection,
  wallet,
  employeeAddress,
  100_000_000_000  // 100 SOL
);

console.log('Funds deposited:', depositTx);
```

## Project Structure

```
Bagel/
├── programs/bagel/          # Solana program (Rust/Anchor)
│   ├── src/
│   │   ├── lib.rs           # Program entry point
│   │   ├── state/           # Account structures
│   │   ├── instructions/    # Instruction handlers
│   │   └── privacy/         # Privacy integrations
│   └── Cargo.toml
│
├── app/                     # Frontend (Next.js)
│   ├── lib/                 # SDK clients
│   ├── pages/               # React pages
│   └── components/          # React components
│
├── tests/                   # Integration tests
├── scripts/                 # Deployment scripts
└── docs-site/               # This documentation
```

## Deployed Program

The Bagel program is already deployed on Solana Devnet:

```
Program ID: 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
```

You can interact with it immediately without deploying your own instance.

## Environment Variables

Create a `.env.local` file in the `app/` directory:

```bash
# Solana RPC (use Helius for better rate limits)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional: Arcium Circuit ID (for MPC operations)
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=your_circuit_id

# Optional: Helius API Key
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_key
```

## Troubleshooting

### "Insufficient funds" Error

Get free devnet SOL:

```bash
solana airdrop 2
# Or use the web faucet: https://faucet.solana.com
```

### "Edition 2024 conflict" Error

Update problematic dependencies:

```bash
cargo update -p blake3 --precise 1.8.2
cargo update -p constant_time_eq --precise 0.3.1
```

### Wallet Not Connecting

Ensure Phantom is set to Devnet:
1. Open Phantom Settings
2. Go to Developer Settings
3. Enable "Testnet Mode"
4. Select "Solana Devnet"

## Next Steps

Now that you have Bagel running, explore these topics:

- [Installation Details](./installation) - Deep dive into installation options
- [Usage Basics](./usage-basics) - Common workflows and patterns
- [Architecture](./architecture/overview) - Understand the system design
- [API Reference](./reference/program) - Complete instruction documentation
