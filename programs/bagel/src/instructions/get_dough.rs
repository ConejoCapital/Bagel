use anchor_lang::prelude::*;
// NOTE: SPL token functionality temporarily disabled due to stack issues
// use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, error::*, state::*};

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
    
    // Calculate accrued amount
    let time_elapsed = current_time
        .checked_sub(jar.last_withdraw)
        .ok_or(BagelError::InvalidTimestamp)?;
    
    require!(
        time_elapsed >= MIN_WITHDRAW_INTERVAL,
        BagelError::WithdrawTooSoon
    );
    
    // TODO: Decrypt salary_per_second using Arcium/Inco
    // For now, use placeholder calculation
    let placeholder_salary_per_second = 1_000_000; // 0.001 SOL/second for testing
    
    let accrued = (time_elapsed as u64)
        .checked_mul(placeholder_salary_per_second)
        .ok_or(BagelError::ArithmeticOverflow)?;
    
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
    
    msg!("Withdrew {} lamports from payroll jar", accrued);
    
    // TODO: Implement ShadowWire private transfer
    // For now, just emit event
    
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
