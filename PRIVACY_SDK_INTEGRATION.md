# 🔐 Privacy SDK Integration Guide

**Status:** Research & Planning Phase  
**Last Updated:** January 14, 2026

This document outlines the integration plan for all privacy SDKs needed for Bagel.

---

## 🎯 Integration Priority

### Phase 1: Foundation (Arcium/Inco)
Encrypted state is foundational - start here.

### Phase 2: Transfers (ShadowWire)
Private transfers depend on encrypted state.

### Phase 3: Streaming (MagicBlock)
Real-time updates enhance UX.

### Phase 4: Yield (Privacy Cash)
Yield generation adds value proposition.

### Phase 5: Compliance (Range)
Compliance features for hackathon completeness.

---

## 1. 🔒 Arcium/Inco Integration (PRIORITY 1)

### Purpose
Encrypt salary amounts on-chain so only authorized parties can decrypt.

### Research Needed
- [ ] Find Arcium SDK documentation/GitHub
- [ ] Alternative: Inco Network SDK
- [ ] Determine which is more mature for Solana
- [ ] Get API keys/access if needed

### Integration Points

#### In `bake_payroll` Instruction
**Goal:** Encrypt salary_per_second before storing

```rust
// Current placeholder:
pub encrypted_salary_per_second: Vec<u8>,

// TODO: Replace with actual encryption
// Example (pseudo-code):
let encrypted = arcium_sdk::encrypt(
    salary_per_second,
    employee_pubkey,  // Only employee can decrypt
    encryption_key,    // Derived from program
)?;
jar.encrypted_salary_per_second = encrypted;
```

#### In `get_dough` Instruction
**Goal:** Decrypt salary to calculate accrual

```rust
// Current placeholder:
let placeholder_salary_per_second = 1_000_000;

// TODO: Replace with actual decryption
// Example (pseudo-code):
let salary_per_second = arcium_sdk::decrypt(
    &jar.encrypted_salary_per_second,
    employee_signature,  // Prove ownership
)?;
let accrued = time_elapsed * salary_per_second;
```

#### In `update_salary` Instruction
**Goal:** Re-encrypt new salary

```rust
// TODO: Decrypt old, encrypt new
let new_encrypted = arcium_sdk::encrypt(
    new_salary_per_second,
    employee_pubkey,
    encryption_key,
)?;
jar.encrypted_salary_per_second = new_encrypted;
```

### Dependencies to Add
```toml
[dependencies]
arcium-sdk = "x.x.x"  # TBD - need to find correct crate
# OR
inco-sdk = "x.x.x"    # Alternative
```

### Testing Strategy
1. Unit test with mock encryption/decryption
2. Test on devnet with real SDK
3. Verify only employee can decrypt their salary

### Resources to Find
- GitHub: `github.com/arcium-dev` or similar
- Docs: Developer documentation site
- Discord: Support channel for API keys
- Examples: Sample code for Solana integration

---

## 2. 🔐 ShadowWire Integration (PRIORITY 2)

### Purpose
Private ZK transfers for payouts using Bulletproofs.

### Research Needed
- [ ] Find Radr Labs/ShadowWire documentation
- [ ] Get ShadowWire program ID (devnet & mainnet)
- [ ] Find USD1 token mint address
- [ ] Understand CPI interface

### Integration Points

#### In `get_dough` Instruction
**Goal:** Execute private transfer via CPI

```rust
// Current placeholder:
// TODO: Implement ShadowWire private transfer

// Proposed implementation:
use shadowwire_sdk::cpi;

let cpi_accounts = shadowwire_sdk::Transfer {
    from: ctx.accounts.jar_token_account.to_account_info(),
    to: ctx.accounts.employee_token_account.to_account_info(),
    authority: ctx.accounts.payroll_jar.to_account_info(),
    shadowwire_program: ctx.accounts.shadowwire_program.to_account_info(),
};

let seeds = &[
    BAGEL_JAR_SEED,
    jar.employer.as_ref(),
    &[jar.bump],
];
let signer_seeds = &[&seeds[..]];

// Execute private transfer (amount hidden via ZK proof)
cpi::private_transfer(
    CpiContext::new_with_signer(
        ctx.accounts.shadowwire_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    ),
    accrued,  // Amount (will be hidden in proof)
)?;
```

### Account Additions Needed

```rust
#[derive(Accounts)]
pub struct GetDough<'info> {
    // ... existing accounts ...
    
    /// CHECK: ShadowWire program for private transfers
    pub shadowwire_program: AccountInfo<'info>,
    
    #[account(mut)]
    pub jar_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub employee_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}
```

### Dependencies to Add
```toml
[dependencies]
shadowwire-sdk = "x.x.x"  # TBD
# May need to re-enable anchor-spl for TokenAccount
```

### Testing Strategy
1. Test on devnet with test USD1 tokens
2. Verify ZK proofs are generated correctly
3. Confirm amounts are not visible on-chain
4. Test with Helius webhooks (should not show amounts)

### Resources to Find
- Radr Labs GitHub/website
- ShadowWire program IDs
- USD1 mint addresses
- Integration examples

---

## 3. ⚡ MagicBlock Integration (PRIORITY 3)

### Purpose
Ephemeral rollups for real-time streaming payment updates.

### Research Needed
- [ ] Find MagicBlock PER documentation
- [ ] Understand ephemeral account setup
- [ ] Learn settlement process
- [ ] Get devnet configuration

### Integration Points

#### Mark Account as Ephemeral
```rust
// In state definition:
#[account]
#[ephemeral]  // MagicBlock attribute
pub struct PayrollJar {
    // ... existing fields ...
}
```

#### Streaming Logic
**Off-chain (MagicBlock PER):**
- Update `total_accrued` every second
- Keep state in ephemeral rollup
- Don't commit to L1 until withdrawal

**On-chain (Settlement):**
- Only settle during `get_dough` withdrawal
- Commit final state to Solana L1

### Proposed Architecture
```
┌─────────────────────────────────────┐
│ MagicBlock Ephemeral Rollup        │
│                                     │
│  Every second:                      │
│  jar.total_accrued += salary/sec    │
│                                     │
│  (Off-chain, real-time updates)     │
└─────────────────────────────────────┘
                 │
                 │ Settlement on withdrawal
                 ▼
┌─────────────────────────────────────┐
│ Solana L1 (BagelJar PDA)           │
│                                     │
│  Only updated during get_dough()    │
│  Final state committed              │
└─────────────────────────────────────┘
```

### Dependencies to Add
```toml
[dependencies]
magicblock-sdk = "x.x.x"  # TBD
```

### Testing Strategy
1. Set up local MagicBlock PER
2. Test streaming updates (1 second intervals)
3. Verify settlement on withdrawal
4. Measure latency improvement

### Resources to Find
- MagicBlock documentation
- PER setup guide
- Devnet endpoints
- Example integrations

---

## 4. 💰 Privacy Cash Integration (PRIORITY 4)

### Purpose
Generate yield on idle payroll funds in privacy-preserving vaults.

### Research Needed
- [ ] Find Privacy Cash SDK documentation
- [ ] Understand vault mechanics
- [ ] Learn yield calculation
- [ ] Get program IDs

### Integration Points

#### In `deposit_dough` Instruction
**Goal:** Deposit idle funds to yield vault

```rust
// After depositing to jar:
// TODO: CPI to Privacy Cash vault
privacy_cash::cpi::deposit_to_vault(
    CpiContext::new_with_signer(...),
    amount,  // Idle funds
    ctx.accounts.dough_vault,  // Vault PDA
)?;
```

#### In `get_dough` Instruction
**Goal:** Withdraw principal + yield

```rust
// Before transfer:
let (principal, yield) = privacy_cash::cpi::withdraw_from_vault(
    CpiContext::new_with_signer(...),
    accrued,  // Amount needed
    ctx.accounts.dough_vault,
)?;

// Transfer principal + yield to employee
let total_payout = principal + yield;
```

### Account Additions
```rust
#[derive(Accounts)]
pub struct DepositDough<'info> {
    // ... existing accounts ...
    
    /// CHECK: Privacy Cash vault for yield generation
    #[account(mut)]
    pub dough_vault: AccountInfo<'info>,
    
    /// CHECK: Privacy Cash program
    pub privacy_cash_program: AccountInfo<'info>,
}
```

### Dependencies to Add
```toml
[dependencies]
privacy-cash-sdk = "x.x.x"  # TBD
```

### Testing Strategy
1. Deposit test funds to vault
2. Wait for yield accrual (may need time-travel in tests)
3. Withdraw and verify yield is included
4. Confirm privacy is maintained

### Resources to Find
- Privacy Cash documentation
- Vault program IDs
- Yield calculation methods
- Integration examples

---

## 5. ✅ Range Integration (PRIORITY 5)

### Purpose
Compliance features and ZK-proofs for income verification.

### Research Needed
- [ ] Find Range SDK documentation
- [ ] Understand "Certified Notes"
- [ ] Learn selective disclosure API
- [ ] Get compliance requirements

### Integration Points

#### New Instruction: `generate_income_proof`
**Goal:** Create ZK-proof of income without revealing exact amounts

```rust
pub fn generate_income_proof(
    ctx: Context<GenerateIncomeProof>,
    time_period: i64,
) -> Result<()> {
    let jar = &ctx.accounts.payroll_jar;
    
    // TODO: Use Range SDK to generate proof
    let proof = range_sdk::generate_proof(
        ProofType::IncomeVerification,
        ProofParams {
            min_income: threshold,  // "Earns at least X"
            time_period,
            jar_address: jar.key(),
        },
    )?;
    
    // Store proof or emit event
    emit!(IncomeProofGenerated {
        employee: jar.employee,
        proof_id: proof.id,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
```

#### Selective Disclosure
Allow employees to prove income ranges without exact amounts:
- "Earns > $50k/year" (boolean)
- "Earns between $50k-$100k/year" (range)
- Never reveal exact salary

### Dependencies to Add
```toml
[dependencies]
range-sdk = "x.x.x"  # TBD
```

### Testing Strategy
1. Generate proofs for various scenarios
2. Verify proof validation
3. Test selective disclosure levels
4. Ensure no amount leakage

### Resources to Find
- Range documentation
- Certified Notes spec
- ZK-proof generation API
- Compliance use cases

---

## 🔍 Research Checklist

### For Each SDK, Find:
- [ ] **GitHub Repository** - Source code and examples
- [ ] **NPM/Crates Package** - Installation instructions
- [ ] **Documentation Site** - API reference
- [ ] **Program IDs** - Devnet and mainnet addresses
- [ ] **Discord/Telegram** - Support channels
- [ ] **Example Code** - Working integrations
- [ ] **API Keys** - If required
- [ ] **Rate Limits** - Usage restrictions

### Where to Look:
1. **Hackathon Discord** - Ask organizers for SDK links
2. **Solana Ecosystem Map** - Find project websites
3. **GitHub Search** - Search for "arcium solana", etc.
4. **Twitter/X** - Follow project accounts
5. **Solana Foundation** - Ecosystem directory
6. **Direct Contact** - Reach out to project teams

---

## 📋 Integration Workflow

### For Each SDK:

#### Step 1: Research (1-2 hours)
- Find documentation
- Read examples
- Understand API

#### Step 2: Setup (30 minutes)
- Add dependencies
- Get API keys
- Configure devnet

#### Step 3: Implementation (2-4 hours)
- Write integration code
- Update account structures
- Handle errors

#### Step 4: Testing (1-2 hours)
- Unit tests with mocks
- Devnet integration tests
- Edge case handling

#### Step 5: Documentation (30 minutes)
- Update README
- Add code comments
- Write integration guide

**Total per SDK:** ~5-8 hours  
**All 5 SDKs:** ~25-40 hours (1 week with focus)

---

## 🚧 Current Blockers

### 1. SDK Documentation Access
**Status:** Not found via web search  
**Reason:** Very new projects, possibly private beta  
**Solution:** Contact hackathon organizers or project Discord

### 2. Program IDs Unknown
**Status:** Need official addresses  
**Impact:** Can't test CPI calls  
**Solution:** Get from project documentation or Discord

### 3. API Keys May Be Required
**Status:** Unknown  
**Impact:** May need approval for access  
**Solution:** Apply early if needed

---

## 💡 Fallback Strategies

### If SDK Not Available:

#### Arcium/Inco Alternative
- Use libsodium for basic encryption
- Not privacy-preserving but better than plaintext
- Switch to full SDK when available

#### ShadowWire Alternative
- Use regular SPL token transfers for now
- Mark transactions as "will be private"
- Integrate ZK proofs later

#### MagicBlock Alternative
- Calculate streaming off-chain in frontend
- Still works, just not truly real-time
- Backend simulation until PERs available

#### Privacy Cash Alternative
- Build basic yield vault ourselves
- Simple interest calculation
- Integrate with lending protocols manually

#### Range Alternative
- Build basic ZK-proof system
- Use zk-SNARKs libraries
- Simpler compliance features

---

## 📞 Next Actions

### Immediate (Tonight/Tomorrow):
1. **Visit hackathon Discord** - Ask for SDK links in sponsor channels
2. **Check BAGEL_SPEC.md** - Review any SDK hints provided
3. **Email organizers** - Request integration resources
4. **Search GitHub** - Try finding unofficial examples

### This Week:
1. Get devnet SOL (from faucet)
2. Deploy Bagel program
3. Start with Arcium/Inco (most critical)
4. Integrate one SDK per day
5. Test each integration thoroughly

### Before Hackathon Deadline:
1. All 5 SDKs integrated ✅
2. End-to-end testing complete ✅
3. Demo video recorded ✅
4. Documentation polished ✅
5. Submission ready ✅

---

## 📚 Resources to Create

As we integrate each SDK, document:
1. Installation guide
2. Configuration steps
3. Code examples
4. Common errors & solutions
5. Testing procedures

Store in `.cursor/skills/privacy-sdk-{name}.md`

---

**Current Status:** Blocked on SDK access - need to contact project teams  
**Estimated Unblock Time:** 1-2 days (depends on response time)  
**Workaround:** Can deploy basic program now, integrate SDKs iteratively

**Next Step:** Get devnet SOL → Deploy → Contact SDK providers in parallel
