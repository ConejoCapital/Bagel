# Solana Installation & Setup (Skill)

Based on official Solana documentation: https://solana.com/docs/intro/installation

## 📦 Correct Installation Order (2026)

### 1. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version  # Verify
```

### 2. Install Solana CLI (Official Method)
```bash
# Use the official installer (NOT Homebrew!)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify
solana --version
solana-keygen --version
```

**Why not Homebrew?** The Homebrew version (1.18.20) is deprecated and missing crucial build tools. Always use the official installer.

### 3. Install Anchor CLI
```bash
# Install Anchor Version Manager (AVM)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor
avm install latest
avm use latest

# Verify
anchor --version  # Should show 0.30.x or later
```

### 4. Configure Solana CLI
```bash
# Set to devnet for development
solana config set --url devnet

# Or use Helius RPC (better performance)
solana config set --url https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Create/use a filesystem wallet
solana-keygen new --outfile ~/.config/solana/id.json

# Check config
solana config get

# Get devnet SOL
solana airdrop 2
```

## 🎯 Modern Solana Stack (2026)

### Frontend (Client-Side)
- **Official SDK (Recommended):** `@solana/kit` (v5.x) - Modern, typed, performant
- **React Hooks:** `@solana/react-hooks` - Official React integration
- **UI Framework:** `@solana/client` + `@solana/react-hooks` (framework-kit)
- **Legacy Compatibility:** `@solana/web3-compat` - Bridge to old web3.js code

### Program Development
- **Default:** Anchor Framework (Rust)
- **High Performance:** Pinocchio (zero-dependency, manual)
- **Language:** Rust (required for on-chain programs)

### Testing
- **Unit Tests:** LiteSVM or Mollusk (fast, in-memory)
- **Integration Tests:** Surfpool (mainnet state forking)
- **Legacy:** solana-test-validator (slower, full node)

### Client Generation
- **Modern:** Codama (from Anchor IDL)
- **Legacy:** Kinobi (for Umi framework)

## 🚀 Quick Start Commands

### Create New Project
```bash
# Initialize Anchor project
anchor init my-project
cd my-project

# Build program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Key Files
- `Anchor.toml` - Project configuration
- `programs/*/src/lib.rs` - Your Solana program
- `tests/*.ts` - Integration tests
- `target/idl/*.json` - Generated IDL for clients

## 🔧 Troubleshooting Common Issues

### Issue: "no such command: build-bpf"
**Solution:** You're using an old Solana version. Reinstall using the official installer (not Homebrew).

### Issue: "String is the wrong size" (Program ID)
**Solution:** Program IDs must be valid base58-encoded 32-byte public keys. Use:
```bash
solana-keygen new --no-bip39-passphrase -o target/deploy/program-keypair.json
solana-keygen pubkey target/deploy/program-keypair.json
```

### Issue: SSL errors with installer
**Solution:** Try with VPN or use a different network. The installer requires HTTPS access to release.solana.com.

### Issue: Anchor version mismatch
**Solution:** 
```bash
# Update dependencies in Cargo.toml
anchor-lang = "0.30.0"
anchor-spl = "0.30.0"

# Clean and rebuild
cargo clean
anchor build
```

## 📚 Essential CLI Commands

### Solana CLI Basics
```bash
# Configuration
solana config get                    # Show current config
solana config set --url devnet       # Switch network
solana config set --keypair PATH     # Set default wallet

# Wallet Management
solana-keygen new                    # Create new keypair
solana-keygen pubkey FILE            # Show public key
solana balance                       # Check balance
solana airdrop 2                     # Get devnet SOL

# Programs
solana program deploy PROGRAM.so     # Deploy program
solana program show PROGRAM_ID       # Show program info
solana program close PROGRAM_ID      # Close program (recover SOL)
```

### Anchor CLI Basics
```bash
# Project Management
anchor init PROJECT_NAME             # Create new project
anchor build                         # Build program
anchor test                          # Run tests
anchor deploy                        # Deploy to configured cluster

# IDL
anchor idl init -f target/idl/program.json PROGRAM_ID
anchor idl upgrade -f target/idl/program.json PROGRAM_ID

# Keys
anchor keys list                     # Show program addresses
anchor keys sync                     # Sync declare_id! with Anchor.toml
```

## 🌐 Network Endpoints

### Official Clusters
- **Devnet:** `https://api.devnet.solana.com`
- **Testnet:** `https://api.testnet.solana.com`
- **Mainnet:** `https://api.mainnet-beta.solana.com`

### Helius (Recommended for Production)
- **Devnet:** `https://devnet.helius-rpc.com/?api-key=YOUR_KEY`
- **Mainnet:** `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

Benefits of Helius:
- Enhanced APIs (DAS, webhooks, priority fees)
- Better reliability and performance
- Built-in indexing and caching

## ✅ Verification Checklist

After installation, verify everything works:

```bash
# 1. Rust
rustc --version  # Should show 1.75+ (2026)

# 2. Solana CLI
solana --version  # Should show 1.18.28+ or 2.x
solana config get  # Should show devnet

# 3. Anchor
anchor --version  # Should show 0.30.x

# 4. Wallet
solana balance  # Should show some devnet SOL

# 5. Build test
anchor init test-project && cd test-project && anchor build
```

## 🔗 Official Resources

- **Docs:** https://solana.com/docs
- **Installation:** https://solana.com/docs/intro/installation
- **CLI Basics:** https://solana.com/docs/intro/installation/solana-cli-basics
- **Anchor:** https://solana.com/docs/intro/installation/anchor-cli-basics
- **Cookbook:** https://solana.com/developers/cookbook
- **Modern Dev Skill:** https://github.com/GuiBibeau/solana-dev-skill
