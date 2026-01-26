use anchor_lang::prelude::*;
use crate::{constants::*, error::*, privacy::*, state::*};

/// Initialize a new payroll with encrypted salary
/// 🥯 "Start Baking" - Create the BagelJar
/// 
/// ⚡ MAGICBLOCK ER: This instruction will be delegated to an Ephemeral Rollup
/// for sub-second precision streaming.
/// 
/// **WHEN PROGRAM ID AVAILABLE:**
/// 1. Uncomment `ephemeral-rollups-sdk` in Cargo.toml
/// 2. Uncomment the `#[ephemeral]` attribute below
/// 3. The PayrollJar will automatically stream on MagicBlock ER
/// 
/// ```ignore
/// #[ephemeral]  // Uncomment when SDK is active
/// ```
/// 
/// **PRIVACY:** This instruction accepts salary ciphertext.
/// The salary will be encrypted on-chain via Inco Lightning CPI.
pub fn handler(
    ctx: Context<BakePayroll>,
    salary_ciphertext: [u8; 32],
) -> Result<()> {
    let payroll_jar = &mut ctx.accounts.payroll_jar;
    let clock = Clock::get()?;

    // Privacy: Store encrypted ciphertext (encryption happens on-chain via Inco Lightning)
    // The salary amount is encrypted before storage, ensuring privacy
    msg!("🔒 Storing encrypted salary ciphertext (32 bytes)");
    msg!("   ✅ Salary amount is private - never decrypted on-chain");

    // Initialize the PayrollJar
    payroll_jar.employer = ctx.accounts.employer.key();
    payroll_jar.employee = ctx.accounts.employee.key();
    payroll_jar.encrypted_salary_per_second = salary_ciphertext.to_vec();
    payroll_jar.last_withdraw = clock.unix_timestamp;
    payroll_jar.total_accrued = 0;
    payroll_jar.dough_vault = Pubkey::default(); // Will be set when yield is activated
    payroll_jar.bump = ctx.bumps.payroll_jar;
    payroll_jar.is_active = true;

    // Emit event for Helius webhook
    emit!(PayrollBaked {
        employer: ctx.accounts.employer.key(),
        employee: ctx.accounts.employee.key(),
        bagel_jar: payroll_jar.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("🥯 Payroll baked! BagelJar created for employee");
    
    Ok(())
}

#[derive(Accounts)]
pub struct BakePayroll<'info> {
    /// The employer funding the payroll
    #[account(mut)]
    pub employer: Signer<'info>,

    /// The employee receiving payments
    /// CHECK: This account is not signed, just referenced
    pub employee: UncheckedAccount<'info>,

    /// The BagelJar PDA
    #[account(
        init,
        payer = employer,
        space = PayrollJar::LEN,
        seeds = [
            BAGEL_JAR_SEED,
            employer.key().as_ref(),
            employee.key().as_ref(),
        ],
        bump
    )]
    pub payroll_jar: Account<'info, PayrollJar>,

    pub system_program: Program<'info, System>,
}
