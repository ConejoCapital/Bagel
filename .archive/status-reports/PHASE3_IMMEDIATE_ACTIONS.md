# 🚀 Phase 3: Immediate Actions (Start Here!)

**Created:** January 15, 2026, 12:20 AM PST  
**Status:** Ready to Code  
**Current Progress:** 50% → Starting 75%

---

## ✅ What's Already Done

### Phase 1 & 2 Completed:
- ✅ Project structure created
- ✅ Anchor program built and deployed
- ✅ All 5 instructions implemented (minimal version)
- ✅ Devnet deployment successful
- ✅ Program ID: `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU`
- ✅ All documentation prepared
- ✅ Agent system configured
- ✅ SDK resources documented

### Current Environment:
```bash
✅ Rust 1.92.0 installed
✅ Solana CLI 3.0.13 installed
✅ Anchor CLI 0.32.1 installed
✅ Program deployed to devnet
✅ 0.82 SOL available for testing
✅ Git repo synced
```

---

## 🎯 Phase 3 Goal

**Integrate 5 Privacy SDKs:**

1. **Inco Lightning** (FHE/TEE) - Encrypted state ⏳ STARTING NOW
2. **ShadowWire** (ZK) - Private transfers
3. **MagicBlock** (PER) - Real-time streaming
4. **Privacy Cash** - Yield generation
5. **Range** - Compliance features

**Target Timeline:** 1 week (40-60 hours)

---

## 🔥 Action 1: Join Discord (Do This First!)

### Encode Club Discord (Hackathon Organizers)

**Why:** Direct access to sponsor support and mentors

**Steps:**
1. Search for "Encode Club Discord" or ask hackathon organizers
2. Join the server
3. Look for channels:
   - `#solana-privacy-hack` (main channel)
   - `#arcium` (MPC encrypted state)
   - `#inco` (FHE/TEE - this is what we're using!)
   - `#magicblock` (ephemeral rollups)
   - Sponsor channels for ShadowWire, Privacy Cash, Range

**Priority:** HIGH - Do this before coding anything!

### Questions to Ask in Discord:

**In #inco:**
> "Hey! Building a private payroll system for the hackathon. I want to encrypt employee salaries using Inco Lightning (FHE/TEE). Are there Rust SDK examples for encrypted state management? Looking for:
> 1. How to encrypt a u64 salary amount
> 2. How to perform computations on encrypted values
> 3. How to decrypt for private transfers
> Any docs or examples would be amazing!"

**In #solana-privacy-hack:**
> "Hi! Working on Bagel - private payroll infrastructure. Planning to integrate Inco (encrypted state), ShadowWire (private transfers), MagicBlock (streaming), Privacy Cash (yield), and Range (compliance). Any recommendations on integration order or gotchas to watch out for?"

---

## 🔍 Action 2: Research Inco Documentation

### Primary Resources:

**1. Inco Documentation Portal**
- URL: https://docs.inco.org/svm/introduction
- Focus on: "Confidential SPL Token Program"
- Read: Rust SDK Overview

**2. Key Concepts to Understand:**

```rust
// Inco Lightning encrypted types
euint64 - Encrypted u64 (perfect for salaries!)
```

**3. What We Need to Learn:**
- [ ] How to initialize Inco context in Anchor program
- [ ] How to encrypt a u64 value (salary_per_second)
- [ ] How to store encrypted data in account state
- [ ] How to perform computations on encrypted values
- [ ] How to decrypt for transfers (TEE-based attestation)

### Research Checklist:

```bash
# As you read, document:
- [ ] Installation commands (cargo add ...)
- [ ] Import statements needed
- [ ] Account structure changes
- [ ] Encryption function calls
- [ ] Computation patterns
- [ ] Decryption patterns
- [ ] Program ID for devnet
- [ ] Any special configuration
```

---

## 💻 Action 3: Set Up Development Environment

### Step 1: Install Inco SDK

**Expected command (verify in docs):**
```bash
cd programs/bagel
cargo add inco-sdk  # or inco-lightning, or similar
cargo build
```

**If not published to crates.io:**
```toml
# Add to Cargo.toml [dependencies]
inco-sdk = { git = "https://github.com/inco-network/...", tag = "v0.1.0" }
```

### Step 2: Create Integration Branch

```bash
cd "/Users/thebunnymac/Desktop/Solana Privacy Hackaton"
git checkout -b feature/inco-integration
```

### Step 3: Update State Structure

**File to modify:** `programs/bagel/src/state/mod.rs`

**Before (current):**
```rust
pub struct PayrollJar {
    pub employer: Pubkey,
    pub employee: Pubkey,
    pub encrypted_salary_per_second: Vec<u8>,  // Generic bytes
    // ...
}
```

**After (with Inco):**
```rust
use inco_sdk::euint64;  // Example import

pub struct PayrollJar {
    pub employer: Pubkey,
    pub employee: Pubkey,
    pub encrypted_salary_per_second: euint64,  // Inco encrypted type
    // ...
}
```

---

## 🔨 Action 4: Implement Inco in `bake_payroll`

### Goal:
Encrypt the `salary_per_second` parameter when initializing a new payroll.

### File to modify:
`programs/bagel/src/instructions/bake_payroll.rs`

### Implementation Pattern (pseudo-code):

```rust
use inco_sdk::{encrypt, euint64, IncoContext};

pub fn bake_payroll_handler(
    ctx: Context<BakePayroll>,
    salary_per_second: u64,  // Plain input
) -> Result<()> {
    // 1. Validate salary isn't too high
    require!(
        salary_per_second <= MAX_SALARY_PER_SECOND,
        BagelError::SalaryTooHigh
    );
    
    // 2. Encrypt the salary using Inco
    let encrypted_salary = encrypt(salary_per_second, &ctx.accounts.inco_context)?;
    
    // 3. Store encrypted value in PayrollJar
    let jar = &mut ctx.accounts.payroll_jar;
    jar.employer = ctx.accounts.employer.key();
    jar.employee = ctx.accounts.employee.key();
    jar.encrypted_salary_per_second = encrypted_salary;
    jar.last_withdraw = Clock::get()?.unix_timestamp;
    jar.total_accrued = 0;
    jar.bump = ctx.bumps.payroll_jar;
    jar.is_active = true;
    
    // 4. Emit event (NO AMOUNT!)
    emit!(PayrollBaked {
        employer: jar.employer,
        employee: jar.employee,
        bagel_jar: ctx.accounts.payroll_jar.key(),
        timestamp: jar.last_withdraw,
    });
    
    Ok(())
}
```

### Testing:

```bash
# After implementation:
anchor build
anchor test --skip-local-validator

# If it builds, deploy to devnet:
anchor deploy --provider.cluster devnet
```

---

## 🧮 Action 5: Implement Inco in `get_dough`

### Goal:
Compute accrued salary using FHE (without decrypting).

### File to modify:
`programs/bagel/src/instructions/get_dough.rs`

### Implementation Pattern (pseudo-code):

```rust
use inco_sdk::{compute, decrypt, euint64};

pub fn get_dough_handler(ctx: Context<GetDough>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let jar = &mut ctx.accounts.payroll_jar;
    
    // 1. Calculate elapsed time (plaintext)
    let elapsed_seconds = current_time
        .checked_sub(jar.last_withdraw)
        .ok_or(BagelError::ArithmeticOverflow)?;
    
    // 2. Compute accrued = encrypted_salary * elapsed_seconds
    // This happens on encrypted data! (FHE magic)
    let encrypted_accrued = compute::multiply(
        &jar.encrypted_salary_per_second,
        elapsed_seconds as u64,
        &ctx.accounts.inco_context,
    )?;
    
    // 3. Decrypt ONLY for transfer (TEE-based)
    // This happens in a secure enclave
    let accrued_amount = decrypt(
        &encrypted_accrued,
        &ctx.accounts.inco_attestation,
    )?;
    
    // 4. Perform private transfer (placeholder for ShadowWire)
    // CPI to ShadowWire will go here in next phase
    msg!("Transferring {} dough privately", accrued_amount);
    
    // 5. Update state
    jar.last_withdraw = current_time;
    jar.total_accrued = 0;
    
    // 6. Emit privacy-preserving event (NO AMOUNT!)
    emit!(DoughDelivered {
        employee: ctx.accounts.employee.key(),
        bagel_jar: ctx.accounts.payroll_jar.key(),
        timestamp: current_time,
    });
    
    Ok(())
}
```

---

## 📋 Action 6: Update Account Structs

### Accounts to Add:

```rust
// In bake_payroll.rs
#[derive(Accounts)]
pub struct BakePayroll<'info> {
    // ... existing accounts ...
    
    /// Inco context for encryption
    /// CHECK: Inco program will validate
    pub inco_context: AccountInfo<'info>,
    
    /// Inco program
    pub inco_program: Program<'info, IncoProgram>,
}

// In get_dough.rs
#[derive(Accounts)]
pub struct GetDough<'info> {
    // ... existing accounts ...
    
    /// Inco attestation for decryption
    /// CHECK: Inco program will validate
    pub inco_attestation: AccountInfo<'info>,
    
    /// Inco program
    pub inco_program: Program<'info, IncoProgram>,
}
```

---

## ✅ Success Criteria for Inco Integration

### Milestone 1: Encryption Works
- [ ] Program compiles with Inco SDK
- [ ] `bake_payroll` encrypts salary successfully
- [ ] Encrypted value stored in `PayrollJar`
- [ ] No plaintext salary visible on-chain

### Milestone 2: Computation Works
- [ ] `get_dough` calculates accrued amount
- [ ] Computation happens on encrypted data (FHE)
- [ ] No intermediate decryption

### Milestone 3: Decryption Works
- [ ] TEE-based decryption succeeds
- [ ] Correct amount retrieved for transfer
- [ ] Attestation verified

### Milestone 4: Tested on Devnet
- [ ] Deploy updated program
- [ ] Test `bake_payroll` with real salary
- [ ] Test `get_dough` withdrawal
- [ ] Verify Solana Explorer shows encrypted data
- [ ] Verify no leakage in events/logs

---

## 🚧 Anticipated Challenges

### Challenge 1: SDK Not Published

**Symptom:** `cargo add inco-sdk` fails

**Solution:**
1. Ask in Discord for Git URL
2. Use Git dependency in Cargo.toml
3. Request devnet program ID

### Challenge 2: Complex Setup

**Symptom:** Requires additional accounts or initialization

**Solution:**
1. Read examples carefully
2. Ask in Discord for walkthrough
3. Check if there's a testnet sandbox

### Challenge 3: Stack Size

**Symptom:** "Stack offset exceeded" error returns

**Solution:**
1. Optimize data structures
2. Use references instead of cloning
3. May need to re-architect for smaller stack usage

### Challenge 4: Documentation Gaps

**Symptom:** Missing Rust examples

**Solution:**
1. Look for TypeScript examples and translate
2. Ask team directly in Discord
3. Review their program's source code on GitHub

---

## 📊 Progress Tracking

### Today (Next 4 Hours):

**Hour 1: Research**
- [ ] Join Discord channels
- [ ] Read Inco documentation
- [ ] Find SDK installation method
- [ ] Identify devnet program ID

**Hour 2: Setup**
- [ ] Install Inco SDK
- [ ] Create integration branch
- [ ] Update Cargo.toml
- [ ] Verify compilation

**Hour 3: Implementation (Part 1)**
- [ ] Update `PayrollJar` structure
- [ ] Implement encryption in `bake_payroll`
- [ ] Test compilation

**Hour 4: Implementation (Part 2)**
- [ ] Implement computation in `get_dough`
- [ ] Test compilation
- [ ] Fix any errors

### Tomorrow (Next 4-8 Hours):

- [ ] Complete Inco integration
- [ ] Deploy to devnet
- [ ] Test all functionality
- [ ] Document findings
- [ ] Start ShadowWire research

---

## 🎯 Definition of Done (Inco Phase)

**You can move to ShadowWire when:**

1. ✅ Inco SDK successfully integrated
2. ✅ Salaries encrypted in `bake_payroll`
3. ✅ FHE computation works in `get_dough`
4. ✅ TEE decryption returns correct values
5. ✅ Deployed and tested on devnet
6. ✅ No plaintext salary visible anywhere on-chain
7. ✅ Integration documented in code comments
8. ✅ Ready for ShadowWire CPI integration

**Estimated Time:** 1-2 days (8-16 hours)

---

## 📞 Communication Plan

### End of Today:
**Report to user:**
- Discord status (joined/pending)
- Documentation findings
- Installation progress
- Any blockers encountered

### End of Tomorrow:
**Report to user:**
- Inco integration status (%)
- Test results
- Devnet deployment status
- Ready to start ShadowWire? (Y/N)

---

## 🔗 Quick Links

**Documentation:**
- Inco Docs: https://docs.inco.org/svm/introduction
- Inco Rust SDK: https://docs.inco.org/svm/rust-sdk/overview
- Inco Confidential SPL: https://docs.inco.org/svm/tutorials/confidential-spl-token/overview

**Support:**
- Hackathon Hub: https://solana.com/privacyhack
- Discord: Encode Club (find link in hackathon hub)
- Our Repo: https://github.com/ConejoCapital/Bagel

**Resources:**
- Phase 3 Plan: [PHASE3_KICKOFF.md](./PHASE3_KICKOFF.md)
- SDK Resources: [.cursor/skills/privacy-sdk-resources.md](./.cursor/skills/privacy-sdk-resources.md)
- Troubleshooting: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 🚀 LET'S GO!

**Current Status:** Ready to start Inco integration!

**First Step:** Join Discord and ask for Inco Rust SDK guidance!

**Goal Today:** Get Inco SDK installed and compiling!

**Reminder:** This is a marathon, not a sprint. Take breaks. Ask for help. We've got 2 weeks!

**🥯 Let's bake some private payroll! 🔐**
