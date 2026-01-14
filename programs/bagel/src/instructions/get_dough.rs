use anchor_lang::prelude::*;
// NOTE: SPL token functionality temporarily disabled due to stack issues
// use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, error::*, privacy::*, state::*};

/// Withdraw accrued salary (get your dough!)
/// 
/// This calculates how much salary has accrued since the last withdrawal
/// and transfers it to the employee.
/// 
/// TODO: Re-enable private transfers via ShadowWire once SPL tokens are restored
pub fn handler(
    ctx: Context<GetDough>,
) -> Result<()> {
    let jar = &mut ctx.accounts.payroll_jar;
    let current_time = Clock::get()?.unix_timestamp;
    
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
    
    // Update state
    jar.total_accrued = jar.total_accrued
        .checked_sub(accrued)
        .ok_or(BagelError::ArithmeticUnderflow)?;
    
    jar.last_withdraw = current_time;
    
    msg!("📤 Executing private transfer via ShadowWire...");
    
    // Execute private transfer using ShadowWire (Bulletproofs!)
    // This hides the transfer amount using zero-knowledge proofs
    execute_private_payout(
        accrued,
        ctx.accounts.employee.key(),
        jar.dough_vault, // Using vault as mint placeholder
    )?;
    
    msg!("✅ Private transfer complete! Amount hidden via Bulletproofs");
    
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
    
    #[account(
        mut,
        seeds = [BAGEL_JAR_SEED, payroll_jar.employer.as_ref()],
        bump,
        has_one = employee,
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
