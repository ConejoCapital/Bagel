# 🔍 SDK Research Findings & Next Steps

**Date:** January 15, 2026, 12:30 AM PST  
**Status:** Research Phase Complete - Ready for Discord Queries

---

## 🎯 Key Findings

### 1. Inco Lightning - Recently Launched! ✅

**Status:** Beta on Solana Devnet (launched recently)

**What We Know:**
- ✅ Available on devnet
- ✅ Enables on-chain confidentiality
- ✅ High-performance privacy infrastructure
- ✅ Supports confidential applications

**What We DON'T Know Yet:**
- ❓ Exact Rust crate name (`inco-sdk`? `inco-lightning`?)
- ❓ Installation method (crates.io or Git?)
- ❓ GitHub repository URL
- ❓ Program ID for devnet
- ❓ Specific API for `euint64` encryption

**Why This Matters:**
Since it's "recently launched in beta," the SDK may not be fully public yet. This is NORMAL for hackathons - we'll need Discord access to get:
- Private beta access
- Installation instructions
- Example code
- Direct support

### 2. Alternative Privacy SDKs (Backup Plans)

If Inco is too new or complex, we have excellent alternatives:

#### Option A: Mirage (Python + Rust)
- **Status:** Production-ready
- **Technology:** Groth16 zkSNARKs
- **Website:** miragesdk.com
- **Pros:** Well-documented, Python-friendly
- **Use Case:** Private transactions (good for transfers)

#### Option B: Veil (Python + Rust)
- **Status:** Production-ready
- **Technology:** Groth16 zkSNARKs + Pedersen Commitments
- **Website:** veil-sdk.com
- **Pros:** Developer-friendly, good docs
- **Use Case:** Confidential dApps

#### Option C: zkShine
- **Status:** Production-ready
- **Technology:** SNARK/STARK compute
- **Website:** zkshine.xyz
- **Pros:** Full privacy infrastructure
- **Use Case:** ZK compute + anonymous relay

#### Option D: Arcium + C-SPL (Original Plan B)
- **Status:** Production-ready
- **Technology:** MPC + Confidential token standard
- **Website:** docs.arcium.com
- **Pros:** Officially backed by Solana Foundation
- **Use Case:** Confidential DeFi operations

---

## 📋 Discord Strategy (PRIORITY!)

### Critical Questions for #inco Channel:

```
Hey Inco team! 👋

I'm building Bagel (private payroll) for the Solana Privacy Hackathon.

I want to use Inco Lightning for encrypted salary state. I read that it's 
in beta on devnet - that's perfect for us!

Could you help with:

1. **SDK Installation**
   - Cargo crate name? (inco-sdk? inco-lightning?)
   - Is it on crates.io or do I need Git URL?
   - Any setup/initialization steps?

2. **Encrypted State**
   - How to encrypt a u64 value (salary amount)
   - How to store encrypted value in Anchor account
   - Example: `let encrypted_salary = ???`

3. **FHE Computation**
   - How to multiply encrypted value by scalar (time elapsed)
   - Example: `encrypted_salary * seconds_elapsed = accrued`
   - Does this stay encrypted throughout?

4. **TEE Decryption**
   - How to decrypt when ready to transfer
   - What attestation accounts are needed?
   - Example: `let amount = decrypt(encrypted_accrued, ???)`

5. **Devnet Info**
   - Program ID for Inco on devnet?
   - Any test tokens needed?
   - Faucet or airdrop available?

Timeline: Aiming to have this working in 1-2 days for Phase 3.

Thanks! 🥯
```

### Backup Questions for #solana-privacy-hack:

```
Hi everyone! Building a private payroll system (Bagel) for the hackathon.

Quick question: For encrypted state management (storing/computing on encrypted 
u64 values), what do you recommend?

Options I'm considering:
1. Inco Lightning (FHE/TEE) - seems new, not sure on SDK status
2. Arcium + C-SPL (MPC)
3. Mirage/Veil/zkShine (zkSNARKs)

Use case: Encrypt employee salary, compute accruals without decrypting, 
then decrypt only for private transfer.

Any recommendations or "gotchas" to watch out for? Thanks! 🙏
```

---

## 🔧 Parallel Approach: Mock Implementation

**Strategy:** While waiting for SDK details from Discord, let's create a mock implementation that:
1. Defines the interface we need
2. Uses placeholder types
3. Can be easily swapped with real SDK later

This keeps development moving forward!

### Mock Implementation: `programs/bagel/src/privacy/mod.rs`

```rust
//! Privacy SDK Integration Layer
//! 
//! This module provides a unified interface for privacy operations.
//! Currently using mock implementations - will be replaced with actual
//! SDK calls once Inco SDK details are available.

use anchor_lang::prelude::*;

/// Encrypted u64 type (placeholder for Inco's euint64)
/// TODO: Replace with `use inco_sdk::euint64;` when SDK is available
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct EncryptedU64 {
    /// Ciphertext bytes
    /// In production, this will be Inco's euint64 type
    pub ciphertext: Vec<u8>,
}

impl EncryptedU64 {
    /// Create a new encrypted value (mock)
    pub fn new(plaintext: u64) -> Self {
        // MOCK: In production, this will call Inco's encrypt()
        // For now, we'll just store the plaintext as bytes (NOT PRIVATE!)
        Self {
            ciphertext: plaintext.to_le_bytes().to_vec(),
        }
    }
    
    /// Decrypt an encrypted value (mock)
    pub fn decrypt(&self) -> Result<u64> {
        // MOCK: In production, this will call Inco's decrypt() with TEE
        // For now, just read the bytes back
        let bytes: [u8; 8] = self.ciphertext[0..8]
            .try_into()
            .map_err(|_| error!(ErrorCode::DecryptionFailed))?;
        Ok(u64::from_le_bytes(bytes))
    }
    
    /// Multiply encrypted value by plaintext scalar (mock)
    pub fn multiply_by_scalar(&self, scalar: u64) -> Result<Self> {
        // MOCK: In production, this will be FHE multiplication
        let plaintext = self.decrypt()?;
        let result = plaintext
            .checked_mul(scalar)
            .ok_or(error!(ErrorCode::ArithmeticOverflow))?;
        Ok(Self::new(result))
    }
}

/// Privacy context (placeholder for SDK context)
/// TODO: Replace with actual Inco context when SDK is available
#[derive(Accounts)]
pub struct PrivacyContext<'info> {
    /// Placeholder for Inco program
    /// TODO: Add `pub inco_program: Program<'info, IncoProgram>`
    pub _reserved: SystemProgram<'info>,
}

/// Error codes for privacy operations
#[error_code]
pub enum PrivacyError {
    #[msg("Encryption failed")]
    EncryptionFailed,
    
    #[msg("Decryption failed")]
    DecryptionFailed,
    
    #[msg("Arithmetic overflow in encrypted computation")]
    ArithmeticOverflow,
}

// Re-export for convenience
pub use PrivacyError as ErrorCode;
```

### Update `bake_payroll.rs` with Mock:

```rust
use crate::privacy::{EncryptedU64, PrivacyContext};

pub fn bake_payroll_handler(
    ctx: Context<BakePayroll>,
    salary_per_second: u64,
) -> Result<()> {
    // Validate
    require!(
        salary_per_second <= MAX_SALARY_PER_SECOND,
        BagelError::SalaryTooHigh
    );
    
    // Encrypt using mock (will be replaced with real Inco SDK)
    let encrypted_salary = EncryptedU64::new(salary_per_second);
    
    // Initialize jar
    let jar = &mut ctx.accounts.payroll_jar;
    jar.employer = ctx.accounts.employer.key();
    jar.employee = ctx.accounts.employee.key();
    jar.encrypted_salary_per_second = encrypted_salary.ciphertext; // Store ciphertext
    jar.last_withdraw = Clock::get()?.unix_timestamp;
    jar.bump = ctx.bumps.payroll_jar;
    jar.is_active = true;
    
    // Event (no amount!)
    emit!(PayrollBaked {
        employer: jar.employer,
        employee: jar.employee,
        bagel_jar: ctx.accounts.payroll_jar.key(),
        timestamp: jar.last_withdraw,
    });
    
    Ok(())
}
```

### Update `get_dough.rs` with Mock:

```rust
use crate::privacy::EncryptedU64;

pub fn get_dough_handler(ctx: Context<GetDough>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let jar = &mut ctx.accounts.payroll_jar;
    
    // Calculate time elapsed
    let elapsed_seconds = current_time
        .checked_sub(jar.last_withdraw)
        .ok_or(BagelError::ArithmeticOverflow)? as u64;
    
    // Reconstruct encrypted salary from stored bytes
    let encrypted_salary = EncryptedU64 {
        ciphertext: jar.encrypted_salary_per_second.clone(),
    };
    
    // FHE computation (mocked for now)
    let encrypted_accrued = encrypted_salary.multiply_by_scalar(elapsed_seconds)?;
    
    // Decrypt for transfer (TEE-based in production)
    let accrued_amount = encrypted_accrued.decrypt()?;
    
    require!(accrued_amount > 0, BagelError::NoAccruedDough);
    
    // Placeholder for ShadowWire private transfer
    msg!("Transferring {} dough privately (mock)", accrued_amount);
    
    // Update state
    jar.last_withdraw = current_time;
    jar.total_accrued = 0;
    
    // Event (no amount!)
    emit!(DoughDelivered {
        employee: ctx.accounts.employee.key(),
        bagel_jar: ctx.accounts.payroll_jar.key(),
        timestamp: current_time,
    });
    
    Ok(())
}
```

---

## ✅ Action Plan (Next 24 Hours)

### Immediate (Hour 1):
1. **Join Discord** - Get actual SDK details from Inco team
2. **Post questions** - Use the templates above
3. **Wait for response** - Usually 1-4 hours during hackathon

### Parallel Track (Hours 1-4):
1. **Implement mock layer** - Create `programs/bagel/src/privacy/mod.rs`
2. **Update instructions** - Integrate mock privacy layer
3. **Test compilation** - Ensure everything builds
4. **Deploy to devnet** - Test with mock implementation

### When Discord Responds (Hours 5-8):
1. **Get SDK details** - Installation, examples, program ID
2. **Replace mocks** - Swap out `EncryptedU64` with real `euint64`
3. **Update calls** - Use real SDK functions
4. **Retest** - Verify with actual encryption

### Complete Integration (Hours 9-16):
1. **Deploy real version** - With actual Inco SDK
2. **Verify privacy** - Check Solana Explorer (no plaintext!)
3. **Test end-to-end** - Full flow with real encryption
4. **Document** - Update code with actual SDK patterns

---

## 📊 Risk Mitigation

### Risk 1: Inco SDK Not Ready for External Use

**Probability:** Medium (it's beta)  
**Impact:** High (blocks encrypted state)  
**Mitigation:**
1. Use mock implementation to keep moving
2. Switch to Arcium (C-SPL) if Inco unavailable
3. Or use Mirage/Veil for encryption

### Risk 2: Complex Setup Requirements

**Probability:** High (new technology)  
**Impact:** Medium (time delay)  
**Mitigation:**
1. Ask for examples in Discord
2. Request direct 1-on-1 help from team
3. Join hackathon office hours

### Risk 3: Performance Issues

**Probability:** Low (it's called "Lightning"!)  
**Impact:** Medium (slower UX)  
**Mitigation:**
1. Profile and optimize
2. Cache where possible
3. Use MagicBlock for off-chain compute

---

## 🎯 Success Metrics

**Mock Implementation Success:**
- [ ] `programs/bagel/src/privacy/mod.rs` created
- [ ] Mock `EncryptedU64` type defined
- [ ] All instructions compile with mocks
- [ ] Deployed to devnet with mock
- [ ] Tests pass

**Real SDK Integration Success:**
- [ ] Inco SDK installed
- [ ] Real encryption working
- [ ] FHE computation working
- [ ] TEE decryption working
- [ ] No plaintext on-chain
- [ ] Ready for ShadowWire integration

---

## 📝 Notes from Research

### Inco Lightning Key Facts:
- Recently launched in beta
- Focused on confidentiality at native speed
- Supports encrypted types and operations
- TEE-based attestations for decryption
- Designed for high-performance apps

### Why Inco > Alternatives:
- FHE allows computation without decryption (critical for us!)
- TEE provides hardware-level security
- "Lightning" branding suggests speed optimization
- Perfect fit for real-time payroll calculations

### Backup if Inco Doesn't Work:
1. **Arcium + C-SPL** - Most mature, officially backed
2. **Mirage** - Good docs, Python-friendly
3. **Veil** - Similar to Mirage
4. **zkShine** - Full infrastructure stack

---

## 🚀 Immediate Next Step

**OPTION A (Preferred): Get Real SDK**
→ Join Discord → Ask Inco team → Get installation details → Implement real SDK

**OPTION B (Parallel): Mock Implementation**
→ Create privacy module → Use mocks → Deploy to devnet → Swap later

**RECOMMENDATION: Do BOTH in parallel!**
- Mock implementation keeps us moving
- Discord queries get us real SDK
- Swap mocks for real code when ready

---

**Status: Ready to execute! Let's start with the mock implementation while waiting for Discord response! 🚀**
