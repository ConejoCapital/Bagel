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
    let current_time = Clock::get()?.unix_timestamp;
    
    // Get account info and keys BEFORE mutable borrow
    let payroll_jar_key = ctx.accounts.payroll_jar.key();
    let employee_key = ctx.accounts.employee.key();
    let payroll_jar_account_info = ctx.accounts.payroll_jar.to_account_info();
    let employee_account_info = ctx.accounts.employee.to_account_info();
    let system_program_account_info = ctx.accounts.system_program.to_account_info();
    
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
    
    msg!("📤 Transferring {} lamports to employee...", accrued);
    
    // REAL SOL TRANSFER: Use system_instruction::transfer
    // The PayrollJar PDA signs the transfer using its seeds
    let seeds = &[
        BAGEL_JAR_SEED,
        employer_key.as_ref(),
        employee_key_for_seeds.as_ref(),
        &[bump],
    ];
    
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &payroll_jar_key,
        &employee_key,
        accrued,
    );
    
    anchor_lang::solana_program::program::invoke_signed(
        &transfer_ix,
        &[
            payroll_jar_account_info,
            employee_account_info,
            system_program_account_info,
        ],
        &[seeds],
    )?;
    
    msg!("✅ SOL transferred to employee! {} lamports", accrued);
    
    // TODO: In production, wrap this transfer with ShadowWire for privacy
    // When ShadowWire program ID is available, use real private transfer:
    // shadowwire::execute_private_payout(accrued, employee_key, USD1_MINT)?;
    // 
    // For now, we have working SOL transfers (core functionality restored)
    msg!("📝 NOTE: ShadowWire private transfer pending program ID from Radr Labs");
    
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
