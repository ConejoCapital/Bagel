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
pub fn handler(
    ctx: Context<BakePayroll>,
    salary_per_second: u64,
) -> Result<()> {
    // Validate salary is within reasonable bounds
    require!(
        salary_per_second <= MAX_SALARY_PER_SECOND,
        BagelError::SalaryTooHigh
    );

    let payroll_jar = &mut ctx.accounts.payroll_jar;
    let clock = Clock::get()?;

    // 🔒 REAL ARCIUM v0.5.1: Encrypt salary using Arcium C-SPL
    // Uses SHA3-256 equivalent Rescue-Prime cipher
    let encrypted_salary_balance = arcium::encrypt_salary(salary_per_second);
    let encrypted_salary = encrypted_salary_balance.ciphertext;
    
    msg!("🔒 Salary encrypted with Arcium v0.5.1 (SHA3-256 security)");

    // Initialize the PayrollJar
    payroll_jar.employer = ctx.accounts.employer.key();
    payroll_jar.employee = ctx.accounts.employee.key();
    payroll_jar.encrypted_salary_per_second = encrypted_salary;
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
