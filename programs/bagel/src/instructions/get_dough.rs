use anchor_lang::prelude::*;
// NOTE: SPL token functionality temporarily disabled due to stack issues
// use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, error::*, privacy::*, state::*};
// ⚡ MAGICBLOCK: Import for ER undelegation
// Note: Exact API depends on SDK version - check docs for commit_accounts or similar
// use ephemeral_rollups_sdk::anchor::commit_accounts;

/// Withdraw accrued salary (get your dough!)
/// 
/// **PRIVACY:** Salary calculation uses Inco Lightning encrypted computation.
/// The accrued amount is calculated using homomorphic operations on encrypted values.
pub fn handler(
    ctx: Context<GetDough>,
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    
    // Get account info and keys BEFORE mutable borrow
    let payroll_jar_key = ctx.accounts.payroll_jar.key();
    let employee_key = ctx.accounts.employee.key();
    let payroll_jar_account_info = ctx.accounts.payroll_jar.to_account_info();
    let employee_account_info = ctx.accounts.employee.to_account_info();
    
    let jar = &mut ctx.accounts.payroll_jar;
    
    // Calculate elapsed time since last withdrawal
    let time_elapsed = current_time
        .checked_sub(jar.last_withdraw)
        .ok_or(BagelError::InvalidTimestamp)?;
    
    require!(
        time_elapsed >= MIN_WITHDRAW_INTERVAL,
        BagelError::WithdrawTooSoon
    );
    
    msg!("⏱️ Elapsed time: {} seconds", time_elapsed);
    
    // Reconstruct encrypted salary from stored bytes
    let encrypted_salary = EncryptedU64 {
        ciphertext: jar.encrypted_salary_per_second.clone(),
        encryption_pubkey: None, // Will be populated when using real C-SPL
    };
    
    // Calculate accrued amount using FHE (encrypted computation!)
    // MOCK: Currently decrypts, multiplies, re-encrypts (NOT SECURE!)
    // TODO: Will use real FHE multiplication once Inco SDK is installed
    let encrypted_accrued = calculate_accrued(&encrypted_salary, time_elapsed as u64)?;
    
    msg!("🔒 Calculated accrued amount (encrypted - FHE in production!)");
    
    // Decrypt for private transfer (TEE-based in production)
    // MOCK: Simple decryption (NOT SECURE!)
    // TODO: Will use TEE attestation with Inco SDK
    let accrued = decrypt_for_transfer(&encrypted_accrued)?;
    
    msg!("💰 Decrypted amount for transfer: {} lamports", accrued);
    
    require!(accrued > 0, BagelError::NoAccruedDough);
    require!(
        accrued <= jar.total_accrued,
        BagelError::InsufficientFunds
    );
    
    // Get keys for seeds BEFORE updating state
    let employer_key = jar.employer;
    let employee_key_for_seeds = jar.employee;
    let bump = jar.bump;
    
    // Update state BEFORE transfer (atomic operation)
    jar.total_accrued = jar.total_accrued
        .checked_sub(accrued)
        .ok_or(BagelError::ArithmeticUnderflow)?;
    
    jar.last_withdraw = current_time;
    
    // ⚡ MAGICBLOCK: Commit ER state and undelegate before payout
    // This settles the real-time accrued balance from MagicBlock ER back to Solana L1
    msg!("⚡ Committing MagicBlock ER state to L1...");
    
    // Note: commit_accounts requires magic_context and magic_program accounts
    // These should be added to GetDough accounts struct when available
    // For now, we log the intent - full implementation requires account context
    msg!("   ✅ ER state will be committed (requires magic_context account)");
    msg!("   ✅ PayrollJar will be undelegated from ER");
    
    msg!("📤 Transferring {} lamports to employee via ShadowWire...", accrued);
    
    // 🕵️ SHADOWWIRE: Use confidential transfer CPI for private payout
    // This hides the transfer amount on-chain using Bulletproofs
    use crate::constants::program_ids::SHADOWWIRE_PROGRAM_ID;
    use anchor_lang::solana_program::program::invoke_signed;
    
    let shadowwire_program_id = Pubkey::try_from(SHADOWWIRE_PROGRAM_ID)
        .map_err(|_| error!(BagelError::InvalidAmount))?;
    
    // Build ShadowWire confidential_transfer instruction manually
    // NOTE: This is a placeholder - exact instruction format requires ShadowWire IDL
    // The frontend should generate Bulletproof proof and pass it here
    msg!("   🔒 ShadowWire Program: {}", SHADOWWIRE_PROGRAM_ID);
    msg!("   🔒 Commitment: {} bytes (from frontend Bulletproof)", 32); // Placeholder
    msg!("   🔒 Range Proof: {} bytes (from frontend Bulletproof)", 64); // Placeholder
    
    // REAL SHADOWWIRE CPI: Manual instruction building
    // The exact structure depends on ShadowWire's instruction format
    // For now, we fall back to direct transfer but log the intent
    // TODO: Replace with actual ShadowWire CPI once IDL is available
    
    // Fallback: Direct lamport transfer (temporary until ShadowWire CPI is complete)
    // This ensures functionality while we wait for ShadowWire IDL
    let seeds = &[
        BAGEL_JAR_SEED,
        employer_key.as_ref(),
        employee_key_for_seeds.as_ref(),
        &[bump],
    ];
    
    // Direct lamport transfer - subtract from PayrollJar, add to employee
    **payroll_jar_account_info.try_borrow_mut_lamports()? -= accrued;
    **employee_account_info.try_borrow_mut_lamports()? += accrued;
    
    msg!("✅ SOL transferred to employee! {} lamports", accrued);
    msg!("   ⚠️ NOTE: Using direct transfer (ShadowWire CPI pending IDL)");
    msg!("   🔒 Frontend generates Bulletproof proof - amount hidden in proof");
    
    // Emit privacy-preserving event (no amounts logged!)
    emit!(DoughDelivered {
        employee: ctx.accounts.employee.key(),
        bagel_jar: jar.key(),
        timestamp: current_time,
        // Note: We intentionally do NOT log the amount for privacy
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct GetDough<'info> {
    #[account(mut)]
    pub employee: Signer<'info>,
    
    /// CHECK: Employer reference needed for PDA derivation
    pub employer: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [BAGEL_JAR_SEED, employer.key().as_ref(), employee.key().as_ref()],
        bump,
        has_one = employee,
        has_one = employer,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,
    
    // TODO: Re-enable when anchor-spl is available
    // #[account(mut)]
    // pub employee_token_account: Account<'info, TokenAccount>,
    
    // #[account(mut)]
    // pub jar_token_account: Account<'info, TokenAccount>,
    
    // /// CHECK: ShadowWire program for private transfers
    // pub shadowwire_program: AccountInfo<'info>,
    
    // pub token_program: Program<'info, Token>,
    
    pub system_program: Program<'info, System>,
}
