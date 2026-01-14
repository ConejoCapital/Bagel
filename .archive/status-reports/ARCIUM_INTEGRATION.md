# 🛡️ Arcium Integration Strategy - $10k DeFi Bounty Path

**Date:** January 15, 2026, 1:00 AM PST  
**Target:** Arcium $10k DeFi Bounty  
**Status:** In Progress - Strategic Pivot from Inco to Arcium

---

## 🎯 Why Arcium?

### Strategic Advantages:
1. **$10,000 DeFi Bounty** - Specifically designed for confidential DeFi apps
2. **C-SPL Standard** - Confidential SPL tokens for encrypted balances
3. **MPC Architecture** - Multi-Party Computation for shared state
4. **Production Ready** - Backed by Solana Foundation
5. **Better Documentation** - Mature tooling and examples

### Perfect Fit for Bagel:
- ✅ Encrypted salary balances (C-SPL)
- ✅ Private payroll transfers
- ✅ MPC for secure computation
- ✅ Compatible with Token-2022
- ✅ Targets DeFi bounty category

---

## 📋 Arcium Technology Stack

### 1. C-SPL (Confidential SPL) Standard

**What It Is:**
- Extension of SPL Token (Token-2022 program)
- Encrypts token balances on-chain
- Private transfers using homomorphic encryption
- Maintains compatibility with standard SPL

**Use Case in Bagel:**
```
Instead of: Transfer 1000 USDC (visible)
We use: ConfidentialTransfer(encrypted_amount) (hidden!)
```

### 2. MPC (Multi-Party Computation)

**What It Is:**
- Distributed computation across multiple nodes
- No single party sees plaintext
- Results computed on encrypted data
- Trustless privacy (no central authority)

**Use Case in Bagel:**
```
Payroll Calculation Circuit:
Inputs: encrypted_salary_per_second, elapsed_time
Computation: MPC multiply (stays encrypted!)
Output: encrypted_accrued_amount
```

### 3. Arcium SDK (@arcium-hq/client)

**What It Is:**
- TypeScript client for encryption/decryption
- RescueCipher for x25519 key exchange
- Integration with Solana wallets
- Client-side cryptography

**Use Case in Bagel:**
```typescript
// Employer encrypts salary when creating payroll
const encryptedSalary = await arciumClient.encrypt(salaryAmount);

// Employee decrypts their accrued pay (only they can!)
const myPay = await arciumClient.decrypt(encryptedAccrued, myPrivateKey);
```

---

## 🚀 Integration Approach (Without Docker)

### Challenge: Docker Not Installed

**Problem:** Arcium installation requires Docker for local node  
**Solution:** Use Arcium's devnet directly, skip local node

### What We CAN Do Without Docker:

1. ✅ **Use C-SPL Token Standard**
   - Integrate Token-2022 with confidential extensions
   - No local node needed (uses Solana devnet)
   
2. ✅ **Client-Side SDK (@arcium-hq/client)**
   - Install via npm
   - Handles encryption/decryption
   - Works with Solana wallets

3. ✅ **Deploy to Arcium Devnet**
   - Use Arcium's hosted devnet
   - No local infrastructure needed

### What We CAN'T Do Without Docker:

1. ❌ **Run Local Arcium Node**
   - Requires Docker + Docker Compose
   - Only needed for local testing

2. ❌ **Local MPC Simulation**
   - Runs in Docker container
   - Can use devnet instead

### Recommendation: **Proceed Without Docker**

**For hackathon purposes, we can:**
- Use Arcium's devnet for testing
- Integrate C-SPL tokens directly
- Deploy MPC circuits to devnet
- Install client SDK via npm

**Docker only needed if user wants local development environment.**

---

## 📦 Installation Plan (No Docker)

### Step 1: Install TypeScript SDK

```bash
cd app/
npm install @arcium-hq/client
```

**What this gives us:**
- Encryption/decryption utilities
- RescueCipher implementation
- Solana wallet integration
- MPC client for devnet

### Step 2: Configure Arcium Devnet

```typescript
// app/lib/arcium.ts
import { ArciumClient } from '@arcium-hq/client';

export const arciumClient = new ArciumClient({
  network: 'devnet',
  solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
});
```

### Step 3: Integrate C-SPL in Anchor Program

**Update Cargo.toml:**
```toml
[dependencies]
anchor-lang = "0.32.1"
anchor-spl = "0.32.1"  # Re-enable with Token-2022
spl-token-2022 = { version = "4.0", features = ["confidential-transfers"] }
```

**NOTE:** This brings back the stack issue, so we'll need to:
- Optimize account sizes
- Use minimal features
- Test carefully

### Step 4: Create MPC Circuit (.arcis file)

```arcis
// programs/bagel/circuits/payroll.arcis
circuit PayrollCalculation {
  // Inputs
  input encrypted_salary_per_second: u64;
  input elapsed_seconds: u64;  // Plaintext
  
  // Computation (MPC - stays encrypted!)
  let encrypted_accrued = encrypted_salary_per_second * elapsed_seconds;
  
  // Output (still encrypted!)
  output encrypted_accrued;
}
```

---

## 🔄 Refactoring Strategy

### Phase 1: Update Privacy Module (Today)

**File:** `programs/bagel/src/privacy/mod.rs`

**Changes:**
1. Replace `EncryptedU64` mock with C-SPL integration
2. Add Token-2022 confidential transfer instructions
3. Implement MPC circuit calls
4. Keep same interface (easy swap!)

### Phase 2: Update Instructions (Today)

**bake_payroll.rs:**
- Use `ConfidentialTransferInstruction::InitializeMint`
- Store encrypted salary in Token-2022 account

**get_dough.rs:**
- Call MPC circuit for accrual calculation
- Use `ConfidentialTransferInstruction::Transfer`

**deposit_dough.rs:**
- Use confidential token transfers
- Re-enable `anchor-spl` carefully

### Phase 3: Add Client SDK (Tomorrow)

**app/lib/arcium.ts:**
- Initialize Arcium client
- Encryption utilities
- Decryption utilities
- Wallet integration

**app/components/:**
- Employer: Encrypt salary input
- Employee: Decrypt accrued pay

---

## 📊 Implementation Roadmap

### Today (Hours 1-4):

**Hour 1: Research & Planning** ✅
- [x] Arcium documentation reviewed
- [x] C-SPL standard understood
- [x] Integration strategy created
- [x] Workaround for Docker identified

**Hour 2: Client SDK Setup**
- [ ] Install `@arcium-hq/client`
- [ ] Create `app/lib/arcium.ts`
- [ ] Test basic encryption/decryption
- [ ] Document API usage

**Hour 3: Privacy Module Refactor**
- [ ] Add C-SPL types
- [ ] Update `EncryptedU64` to use Token-2022
- [ ] Implement confidential transfer logic
- [ ] Test compilation

**Hour 4: MPC Circuit**
- [ ] Create `circuits/payroll.arcis`
- [ ] Define payroll calculation logic
- [ ] Document circuit interface
- [ ] Plan deployment to devnet

### Tomorrow (Hours 5-8):

- [ ] Test C-SPL integration on devnet
- [ ] Deploy MPC circuit to Arcium devnet
- [ ] Update instructions to use confidential transfers
- [ ] End-to-end testing

### This Week:

- [ ] Complete Arcium integration
- [ ] Move to ShadowWire (private transfers)
- [ ] Integrate MagicBlock (streaming)
- [ ] Add Privacy Cash + Range
- [ ] Frontend integration

---

## 🎯 Success Metrics for Arcium Integration

### Milestone 1: Client SDK Working
- [ ] @arcium-hq/client installed
- [ ] Basic encryption/decryption works
- [ ] Wallet integration tested

### Milestone 2: C-SPL Integration
- [ ] Token-2022 with confidential extensions
- [ ] Encrypted balances on-chain
- [ ] Confidential transfers working

### Milestone 3: MPC Circuit Deployed
- [ ] .arcis file created
- [ ] Circuit deployed to devnet
- [ ] Computation returns correct results

### Milestone 4: End-to-End Flow
- [ ] Employer creates payroll (encrypted salary)
- [ ] Time passes
- [ ] MPC calculates accrued (stays encrypted)
- [ ] Employee withdraws (private transfer)
- [ ] Verified on Solana Explorer (amounts hidden!)

---

## 🚧 Known Challenges & Solutions

### Challenge 1: Stack Offset (Again)

**Problem:** Adding `anchor-spl` back may exceed stack limit

**Solutions:**
1. Use minimal Token-2022 features only
2. Optimize account structures
3. Break into smaller instructions if needed
4. Test incrementally

### Challenge 2: Docker Requirement

**Problem:** Full Arcium tooling needs Docker

**Solution:**
- ✅ Use Arcium devnet (no local node)
- ✅ Install client SDK only (npm)
- ✅ Deploy circuits to hosted devnet
- ❌ Skip local MXE environment

### Challenge 3: C-SPL Learning Curve

**Problem:** New token standard, different from standard SPL

**Solution:**
- Read Token-2022 confidential transfer docs
- Study Arcium examples
- Start with simple transfers
- Ask in Arcium Discord if blocked

### Challenge 4: Key Management

**Problem:** Users need to manage encryption keys

**Solution:**
- Derive from Solana wallet
- Use x25519 key exchange
- RescueCipher handles complexity
- Document for frontend team

---

## 📚 Key Resources

### Arcium Documentation:
- **Installation:** https://docs.arcium.com/developers/installation
- **Hello World:** https://docs.arcium.com/developers/hello-world
- **C-SPL Article:** https://arcium.com/articles/confidential-spl-token

### TypeScript SDK:
- **API Reference:** https://ts.arcium.com/api
- **Getting Started:** https://ts.arcium.com/docs

### Solana Token-2022:
- **Confidential Transfers:** https://spl.solana.com/token-2022/extensions#confidential-transfers

### Community:
- **Arcium Discord:** (find via Solana Privacy Hackathon)
- **GitHub:** https://github.com/arcium-hq

---

## 💬 Next Steps

### Immediate (Next 30 minutes):

1. **Install Client SDK**
   ```bash
   cd app/
   npm install @arcium-hq/client
   ```

2. **Create Arcium Utility Module**
   - `app/lib/arcium.ts`
   - Basic encryption/decryption functions
   - Export for use in components

3. **Update Privacy Module**
   - Start refactoring `programs/bagel/src/privacy/mod.rs`
   - Add C-SPL types
   - Plan Token-2022 integration

### This Session:

- Complete client SDK setup
- Refactor privacy module for C-SPL
- Create MPC circuit file
- Test compilation

### Ask User:

**"Should I install Docker for local Arcium node, or proceed with devnet-only approach?"**

**Devnet-only pros:**
- ✅ Faster (no Docker install)
- ✅ Good enough for hackathon
- ✅ Tests on real Arcium network

**Docker install pros:**
- ✅ Local testing (faster feedback)
- ✅ Full Arcium tooling
- ✅ Can run MPC locally

**My recommendation:** Proceed without Docker for now, add later if needed.

---

## 🎉 Ready to Build!

**Current Status:**
- ✅ Arcium strategy defined
- ✅ Workaround for Docker identified
- ✅ Integration plan created
- 🔄 Ready to install client SDK
- 🔄 Ready to refactor privacy module

**Next Command:**
```bash
cd app/ && npm install @arcium-hq/client
```

**Let's target that $10k DeFi bounty! 🚀**
