---
sidebar_position: 3
title: Installation
---

# Installation Guide

This guide covers all installation options for Bagel, from development setup to production deployment.

## Development Installation

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **RAM** | 4 GB | 8+ GB |
| **Disk Space** | 10 GB | 20+ GB |
| **OS** | macOS/Linux | macOS/Linux |
| **CPU** | 2 cores | 4+ cores |

### Full Development Setup

```bash
# 1. Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 2. Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 3. Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.29.0
avm use 0.29.0

# 4. Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install 18
nvm use 18

# 5. Clone and setup Bagel
git clone https://github.com/ConejoCapital/Bagel.git
cd Bagel
npm install
```

### Frontend Only Setup

If you only need to work with the frontend:

```bash
# Clone repository
git clone https://github.com/ConejoCapital/Bagel.git
cd Bagel/app

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

## Configuration

### Solana Network Configuration

```bash
# Configure for devnet (recommended for development)
solana config set --url https://api.devnet.solana.com

# Check current configuration
solana config get

# Expected output:
# Config File: ~/.config/solana/cli/config.yml
# RPC URL: https://api.devnet.solana.com
# WebSocket URL: wss://api.devnet.solana.com/ (computed)
# Keypair Path: ~/.config/solana/id.json
# Commitment: confirmed
```

### Wallet Setup

```bash
# Generate new keypair (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Get devnet SOL for testing
solana airdrop 2

# Check balance
solana balance
```

### Environment Variables

Create `.env.local` in the `app/` directory:

```bash
# Required: Solana RPC endpoint
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional: Use Helius for better rate limits (recommended)
# Get a free API key at https://helius.dev
NEXT_PUBLIC_HELIUS_API_KEY=your-helius-api-key
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=your-helius-api-key

# Optional: Arcium MPC Configuration
NEXT_PUBLIC_ARCIUM_MPC_PROGRAM_ID=arcium_program_id
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=your_circuit_id

# Optional: ShadowWire Configuration
NEXT_PUBLIC_SHADOWWIRE_PROGRAM_ID=shadowwire_program_id
```

## Building the Program

### Standard Build

```bash
# Build the Anchor program
anchor build

# This creates:
# - target/deploy/bagel.so (compiled program)
# - target/idl/bagel.json (Interface Definition)
# - target/types/bagel.ts (TypeScript types)
```

### Build with Specific Features

```bash
# Build for devnet (default)
anchor build

# Build for mainnet (when ready)
anchor build -- --features mainnet
```

### Verify Build

```bash
# Check the compiled program
ls -la target/deploy/bagel.so

# Verify program ID matches
solana address -k target/deploy/bagel-keypair.json
# Should output: 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
```

## Running Tests

### Unit Tests

```bash
# Run Rust unit tests
cd programs/bagel
cargo test
```

### Integration Tests

```bash
# Run Anchor integration tests (uses deployed devnet program)
anchor test --skip-local-validator

# Run with local validator (full test)
anchor test
```

### Frontend Tests

```bash
cd app
npm run test
```

## Deployment

### Deploy to Devnet

The program is already deployed to devnet. To deploy your own version:

```bash
# Ensure you have enough SOL
solana balance

# Deploy
anchor deploy --provider.cluster devnet

# Note the new Program ID in the output
```

### Update Deployed Program

```bash
# Build with changes
anchor build

# Upgrade existing deployment
anchor upgrade target/deploy/bagel.so \
  --program-id 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU \
  --provider.cluster devnet
```

## Debug Mode

### Enable Program Logs

```bash
# Set log level
export RUST_LOG=solana_runtime::system_instruction_processor=trace,solana_runtime::message_processor=trace,solana_bpf_loader=debug,solana_rbpf=debug

# Or add to your shell profile
echo 'export RUST_LOG=solana_runtime::system_instruction_processor=trace' >> ~/.bashrc
```

### View Transaction Logs

```bash
# Watch program logs in real-time
solana logs 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU

# View specific transaction
solana confirm -v <TRANSACTION_SIGNATURE>
```

### Frontend Debug Mode

```bash
cd app

# Enable verbose logging
DEBUG=bagel:* npm run dev
```

## Common Installation Issues

### Edition 2024 Conflict

Some dependencies require specific versions:

```bash
# Fix blake3 and constant_time_eq versions
cargo update -p blake3 --precise 1.8.2
cargo update -p constant_time_eq --precise 0.3.1
```

### Stack Overflow During Build

The program temporarily disables anchor-spl to stay within the 4096-byte stack limit:

```rust
// In get_dough.rs - SPL token functionality temporarily disabled
// NOTE: SPL token functionality temporarily disabled due to stack issues
// use anchor_spl::token::{self, Token, TokenAccount, Transfer};
```

### Node.js Version Mismatch

Ensure you're using Node.js 18+:

```bash
nvm install 18
nvm use 18
node --version  # Should show v18.x.x
```

### Anchor Build Fails

Clear cache and rebuild:

```bash
# Clean build artifacts
anchor clean

# Remove target directory
rm -rf target/

# Rebuild
anchor build
```

## Docker Installation (Alternative)

For containerized development:

```dockerfile
# Dockerfile
FROM rust:1.92

# Install Solana
RUN sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"

# Install Anchor
RUN cargo install --git https://github.com/coral-xyz/anchor avm --locked
RUN avm install 0.29.0 && avm use 0.29.0

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app
COPY . .
RUN npm install
```

```bash
# Build and run
docker build -t bagel-dev .
docker run -it bagel-dev bash
```

## Verify Installation

Run this checklist to verify everything is installed correctly:

```bash
#!/bin/bash
echo "=== Bagel Installation Verification ==="

echo -n "Rust: "
rustc --version

echo -n "Solana: "
solana --version

echo -n "Anchor: "
anchor --version

echo -n "Node.js: "
node --version

echo -n "npm: "
npm --version

echo -n "Solana Config: "
solana config get | grep "RPC URL"

echo -n "Wallet Balance: "
solana balance

echo "=== All checks complete ==="
```

Save as `verify-install.sh` and run:

```bash
chmod +x verify-install.sh
./verify-install.sh
```

## Next Steps

- [Usage Basics](./usage-basics) - Learn common workflows
- [Architecture](./architecture/overview) - Understand the system
- [API Reference](./reference/program) - Explore instructions
