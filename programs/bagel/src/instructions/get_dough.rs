use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, error::*, state::*};

/// Withdraw accrued salary (private transfer via ShadowWire)
/// 🥯 "Get Your Dough" - Employee withdraws earned salary
pub fn handler(ctx: Context<GetDough>) -> Result<()> {
    let payroll_jar = &mut ctx.accounts.payroll_jar;
    let clock = Clock::get()?;

    // Check minimum time between withdrawals
    let time_since_last = clock.unix_timestamp
        .checked_sub(payroll_jar.last_withdraw)
        .ok_or(BagelError::InvalidTimestamp)?;

    require!(
        time_since_last >= MIN_WITHDRAW_INTERVAL,
        BagelError::WithdrawTooSoon
    );

    // TODO: Decrypt salary and calculate accrued amount using Arcium
    // For now, we'll use a simple calculation
    let salary_per_second = u64::from_le_bytes(
        payroll_jar.encrypted_salary_per_second[..8]
            .try_into()
            .map_err(|_| BagelError::DecryptionFailed)?
    );

    let seconds_elapsed = time_since_last as u64;
    
    let accrued_amount = salary_per_second
        .checked_mul(seconds_elapsed)
        .ok_or(BagelError::ArithmeticOverflow)?;

    require!(accrued_amount > 0, BagelError::NoAccruedDough);

    // Update payroll jar state
    payroll_jar.last_withdraw = clock.unix_timestamp;
    payroll_jar.total_accrued = payroll_jar.total_accrued
        .checked_add(accrued_amount)
        .ok_or(BagelError::ArithmeticOverflow)?;

    // TODO: Transfer via ShadowWire for privacy
    // For now, we'll use a standard SPL token transfer
    let seeds = &[
        BAGEL_JAR_SEED,
        payroll_jar.employer.as_ref(),
        payroll_jar.employee.as_ref(),
        &[payroll_jar.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.employee_token_account.to_account_info(),
        authority: payroll_jar.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(
        cpi_program,
        cpi_accounts,
        signer_seeds,
    );

    token::transfer(cpi_ctx, accrued_amount)?;

    // Emit event (NO AMOUNT - privacy!)
    emit!(DoughDelivered {
        employee: ctx.accounts.employee.key(),
        bagel_jar: payroll_jar.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("🥯 Dough delivered! (amount private)");

    Ok(())
}

#[derive(Accounts)]
pub struct GetDough<'info> {
    /// The employee withdrawing their salary
    #[account(mut)]
    pub employee: Signer<'info>,

    /// The BagelJar PDA
    #[account(
        mut,
        seeds = [
            BAGEL_JAR_SEED,
            payroll_jar.employer.as_ref(),
            employee.key().as_ref(),
        ],
        bump = payroll_jar.bump,
        has_one = employee,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,

    /// Vault token account (holds the funds)
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Employee's USD1 token account
    #[account(mut)]
    pub employee_token_account: Account<'info, TokenAccount>,

    /// TODO: ShadowWire program for private transfer
    /// CHECK: Will be validated by ShadowWire CPI
    pub shadow_wire_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}
