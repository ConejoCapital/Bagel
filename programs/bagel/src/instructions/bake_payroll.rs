use anchor_lang::prelude::*;
use crate::{constants::*, error::*, state::*};

/// Initialize a new payroll with encrypted salary
/// 🥯 "Start Baking" - Create the BagelJar
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

    // TODO: Encrypt salary using Arcium SDK
    // For now, we'll store it as a simple byte array
    // In production, this will be: arcium::encrypt(salary_per_second)?
    let encrypted_salary = salary_per_second.to_le_bytes().to_vec();

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
