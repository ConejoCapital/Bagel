use anchor_lang::prelude::*;
// NOTE: SPL token functionality temporarily disabled due to stack issues
// use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, error::*, state::*};

/// Deposit funds (dough) into the payroll jar
/// 
/// TODO: Re-enable SPL token transfers once spl-token-2022 stack issues are resolved
pub fn handler(
    ctx: Context<DepositDough>,
    amount: u64,
) -> Result<()> {
    let jar = &mut ctx.accounts.payroll_jar;
    
    // Validate amount
    require!(amount > 0, BagelError::InvalidAmount);
    
    // TODO: Implement actual token transfer using anchor_spl::token::Transfer
    // For now, just track the amount in state
    jar.total_accrued = jar.total_accrued
        .checked_add(amount)
        .ok_or(BagelError::ArithmeticOverflow)?;
    
    msg!("Deposited {} lamports to payroll jar", amount);
    
    // Emit event for Helius webhooks
    emit!(DoughAdded {
        employer: jar.employer,
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct DepositDough<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [BAGEL_JAR_SEED, employer.key().as_ref()],
        bump,
        has_one = employer,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,
    
    // TODO: Re-enable when anchor-spl is available
    // #[account(mut)]
    // pub employer_token_account: Account<'info, TokenAccount>,
    
    // #[account(mut)]
    // pub jar_token_account: Account<'info, TokenAccount>,
    
    // pub token_program: Program<'info, Token>,
    
    pub system_program: Program<'info, System>,
}
