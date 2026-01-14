# 🥯 Bagel Development Guide

## ✅ Current Status

**Milestone 1: Core Program Structure** - COMPLETE! 🎉

We've initialized the Bagel program with all core smart contracts following privacy-first design principles.

### What's Been Built

#### Smart Contract Structure
```
programs/bagel/src/
├── lib.rs                      # Main program entrypoint
├── constants.rs                # Seeds, limits, program IDs
├── error.rs                    # Custom error codes
├── state/
│   └── mod.rs                  # PayrollJar, GlobalState, Events
└── instructions/
    ├── bake_payroll.rs        # Initialize payroll
    ├── deposit_dough.rs       # Fund payroll
    ├── get_dough.rs           # Withdraw (private)
    ├── update_salary.rs       # Change salary
    └── close_jar.rs           # Terminate payroll
```

#### Key Features Implemented

1. **🥯 PayrollJar Account (PDA)**
   - Stores encrypted salary data
   - Tracks last withdrawal time
   - Links to Privacy Cash vault
   - PDA seeds: `["bagel_jar", employer, employee]`

2. **🔒 Privacy-First Design**
   - Salary stored as encrypted bytes (ready for Arcium integration)
   - Events NEVER include amounts
   - Withdrawal logs: "Dough delivered" (no amount shown)

3. **🛡️ Security Best Practices**
   - All arithmetic uses checked operations
   - PDA validation in account structs
   - Access control via `has_one` constraints
   - Overflow protection enabled in Cargo.toml

4. **Five Core Instructions:**
   - ✅ `bake_payroll` - Initialize payroll with encrypted salary
   - ✅ `deposit_dough` - Fund the BagelJar (SPL token transfer)
   - ✅ `get_dough` - Withdraw accrued salary (ready for ShadowWire CPI)
   - ✅ `update_salary` - Change salary amount (employer only)
   - ✅ `close_jar` - Terminate and return funds

5. **🎯 Events for Helius Webhooks**
   - `PayrollBaked` - When payroll is created
   - `DoughDelivered` - When employee withdraws (NO amount!)
   - `DoughAdded` - When employer deposits funds

---

## 🛠️ Next Steps: Build & Deploy

### 1. Install Development Tools

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 2. Build the Program

```bash
# Build
anchor build

# This generates:
# - target/deploy/bagel.so (the program binary)
# - target/idl/bagel.json (the IDL for clients)
# - target/types/bagel.ts (TypeScript types)
```

### 3. Test Locally

```bash
# Run tests on local validator
anchor test

# Or test on devnet
anchor test --provider.cluster devnet
```

### 4. Deploy to Devnet

```bash
# Set to devnet
solana config set --url devnet

# Request airdrop (if needed)
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet

# This will output your program ID!
```

### 5. Deploy to Mainnet

```bash
# Set to mainnet with Helius RPC
solana config set --url https://mainnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af

# Check balance (you'll need SOL for deployment)
solana balance

# Deploy (costs ~1-2 SOL for rent)
anchor deploy --provider.cluster mainnet

# Update declare_id! in lib.rs with your new program ID
```

---

## 🔄 Integration Roadmap

### Phase 1: Privacy Integrations (Week 2)

#### Arcium Integration (Encrypted State)
```bash
# Add Arcium SDK
cd programs/bagel
cargo add arcium-client

# Update bake_payroll.rs:
let encrypted_salary = arcium::encrypt(salary_per_second)?;

# Update get_dough.rs:
let amount = arcium::decrypt_for_transfer(&encrypted_amount)?;
```

#### ShadowWire Integration (Private Transfers)
```bash
# Add ShadowWire as dependency
# In Cargo.toml:
shadow-wire = { version = "0.1", features = ["cpi"] }

# Update get_dough.rs:
shadow_wire::cpi::private_transfer(cpi_ctx, amount)?;
```

### Phase 2: MagicBlock Streaming (Week 2)

```bash
# Add MagicBlock SDK
cargo add magicblock

# Create streaming.rs instruction:
#[ephemeral_account]
pub struct StreamState { ... }
```

### Phase 3: Privacy Cash Yield (Week 2)

```bash
# Add Privacy Cash SDK
cargo add privacy-cash

# Update deposit_dough.rs to route idle funds:
privacy_cash::cpi::deposit_yield(ctx, idle_amount)?;
```

### Phase 4: Range Compliance (Week 3)

```bash
# Frontend integration (TypeScript)
npm install @range/sdk

# Create compliance.ts:
const proof = await range.generateProof({ income: >100000 });
```

---

## 📝 TODO: Before Testing

### Smart Contract Updates Needed

1. **Token Vault Setup**
   - [ ] Create PDA token account for holding funds
   - [ ] Update `deposit_dough` and `get_dough` to use vault PDA

2. **Program ID Updates**
   - [ ] Deploy to devnet and update `declare_id!` in lib.rs
   - [ ] Update ShadowWire program ID in constants.rs
   - [ ] Update USD1 mint address in constants.rs

3. **Testing**
   - [ ] Add comprehensive test suite
   - [ ] Test time-based accrual calculations
   - [ ] Test error cases
   - [ ] Test access control

### Frontend Setup (Next!)

```bash
# Initialize Next.js app
cd app
npx create-next-app@latest . --typescript --tailwind --app

# Install Solana dependencies
npm install @solana/web3.js @solana/wallet-adapter-react
npm install @coral-xyz/anchor

# Install Helius SDK
npm install helius-sdk
```

---

## 🎯 Key Design Decisions

### Why PDAs?
- PayrollJar is a PDA so it can sign CPI calls to ShadowWire
- Seeds: `["bagel_jar", employer, employee]` - deterministic addressing
- Bump stored in account for efficient verification

### Why Encrypted Storage?
- Salary data is stored as `Vec<u8>` (encrypted by Arcium)
- Even if someone reads the account, they see gibberish
- Only decrypted in secure context (TEE) during transfer

### Why Event Emission?
- Helius webhooks can parse structured events
- Employers get notified of withdrawals
- NO sensitive data in events (privacy-first!)

### Why SPL Tokens?
- Using USD1 stablecoin for stability
- Can easily swap for other SPL tokens
- Standard token program = compatibility

---

## 🐛 Common Issues & Solutions

### Issue: `anchor build` fails
**Solution:** Make sure Rust and Anchor CLI are installed and updated

### Issue: `declare_id!` macro error  
**Solution:** Deploy first, then update the program ID in lib.rs

### Issue: Account size mismatch
**Solution:** Check `PayrollJar::LEN` calculation includes all fields + padding

### Issue: PDA derivation fails
**Solution:** Verify seeds match exactly between client and program

---

## 📚 Resources

- **Anchor Docs:** https://www.anchor-lang.com/
- **Solana Cookbook:** https://solanacookbook.com/
- **Helius Docs:** https://docs.helius.dev/
- **Agent Rules:** `.cursor/rules/` (for AI-assisted development)

---

## 🥯 Brand Reminders

Keep the friendly voice in all code and docs:
- ❌ "Initialize vault" → ✅ "Start baking"
- ❌ "Execute transfer" → ✅ "Deliver dough"
- ❌ "Encrypted state" → ✅ "Secret recipe"

---

**Next Step:** Install the build tools and run `anchor build`! 🚀
