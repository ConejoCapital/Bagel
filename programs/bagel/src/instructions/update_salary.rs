use anchor_lang::prelude::*;
use crate::{constants::*, error::*, state::*};

/// Update an employee's salary (employer only)
/// 🥯 "Adjust the Recipe" - Change salary amount
pub fn handler(
    ctx: Context<UpdateSalary>,
    new_salary_per_second: u64,
) -> Result<()> {
    require!(
        new_salary_per_second <= MAX_SALARY_PER_SECOND,
        BagelError::SalaryTooHigh
    );

    let payroll_jar = &mut ctx.accounts.payroll_jar;

    // TODO: Encrypt new salary using Inco Lightning
    let encrypted_salary = new_salary_per_second.to_le_bytes().to_vec();

    payroll_jar.encrypted_salary_per_second = encrypted_salary;

    msg!("🥯 Salary recipe adjusted (amount encrypted)");

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateSalary<'info> {
    /// The employer (only they can update salary)
    #[account(mut)]
    pub employer: Signer<'info>,

    /// The BagelJar PDA
    #[account(
        mut,
        seeds = [
            BAGEL_JAR_SEED,
            employer.key().as_ref(),
            payroll_jar.employee.as_ref(),
        ],
        bump = payroll_jar.bump,
        has_one = employer,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,
}
