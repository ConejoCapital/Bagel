---
sidebar_position: 3
---

# Installation

Complete installation guide for the Bagel Protocol.

## System Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | 18.0+ |
| Rust | 1.70+ |
| Solana CLI | 1.17+ |
| Anchor | 0.29+ |

## Frontend Installation

### Using npm

```bash
npm install @bagel/sdk @inco/sdk @solana/web3.js @coral-xyz/anchor
```

### Using yarn

```bash
yarn add @bagel/sdk @inco/sdk @solana/web3.js @coral-xyz/anchor
```

### Using bun

```bash
bun add @bagel/sdk @inco/sdk @solana/web3.js @coral-xyz/anchor
```

### Peer Dependencies

Ensure you have these peer dependencies installed:

```bash
npm install @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-wallets
```

## Program Deployment

### Clone Repository

```bash
git clone https://github.com/bagel-protocol/bagel.git
cd bagel
```

### Install Dependencies

```bash
# Install Rust dependencies
cargo build

# Install Node dependencies
bun install
```

### Configure Anchor

Update `Anchor.toml` with your settings:

```toml
[features]
seeds = false
skip-lint = false

[programs.devnet]
bagel = "AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "bun run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Build the Program

```bash
anchor build
```

### Deploy to Devnet

```bash
# Ensure you have devnet SOL
solana airdrop 2

# Deploy
anchor deploy
```

## Environment Configuration

Create a `.env.local` file in your project root:

```env
# ===========================================
# Solana Configuration
# ===========================================
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# ===========================================
# Bagel Program
# ===========================================
NEXT_PUBLIC_BAGEL_PROGRAM_ID=AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj

# ===========================================
# Inco FHE Configuration
# ===========================================
NEXT_PUBLIC_INCO_LIGHTNING_ID=5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj
NEXT_PUBLIC_INCO_TOKEN_ID=4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N
NEXT_PUBLIC_INCO_NETWORK=devnet

# ===========================================
# Token Configuration
# ===========================================
NEXT_PUBLIC_USDBAGEL_MINT=GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt

# ===========================================
# MagicBlock TEE (Optional)
# ===========================================
NEXT_PUBLIC_MAGICBLOCK_PROGRAM_ID=DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh
NEXT_PUBLIC_TEE_VALIDATOR=FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA

# ===========================================
# Helius API (Required for transaction history)
# ===========================================
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
```

## Verification

### Verify Installation

```typescript
import { Connection, PublicKey } from '@solana/web3.js';

const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');

async function verifyInstallation() {
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);

  // Check program exists
  const accountInfo = await connection.getAccountInfo(BAGEL_PROGRAM_ID);
  if (accountInfo?.executable) {
    console.log('Bagel program verified');
  } else {
    console.error('Bagel program not found');
  }

  // Check master vault exists
  const [masterVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('master_vault')],
    BAGEL_PROGRAM_ID
  );

  const vaultInfo = await connection.getAccountInfo(masterVaultPda);
  if (vaultInfo) {
    console.log('Master vault found:', masterVaultPda.toBase58());
  } else {
    console.log('Master vault not initialized (normal for first setup)');
  }
}

verifyInstallation();
```

### Test Connection

```bash
# Run tests
anchor test

# Or with bun
bun test
```

## Troubleshooting

### Common Issues

**Error: "Program not found"**
- Ensure you're connected to devnet
- Verify the program ID is correct
- Check your RPC URL is valid

**Error: "Insufficient SOL"**
```bash
solana airdrop 2 --url devnet
```

**Error: "Account not found"**
- The master vault may not be initialized
- Run `initialize_vault` instruction first

**Error: "Inco program not found"**
- Ensure Inco Lightning is deployed on devnet
- Verify the Inco program ID

### Getting Help

- [Discord Community](https://discord.gg/bagel)
- [GitHub Issues](https://github.com/bagel-protocol/bagel/issues)
- [FAQ](./faq)

## Next Steps

After installation:

1. [Initialize the Master Vault](./getting-started#4-register-a-business)
2. [Register your first business](./getting-started#4-register-a-business)
3. [Add employees](./getting-started#5-add-an-employee)
4. [Learn about privacy features](./core-concepts/privacy-layer)
