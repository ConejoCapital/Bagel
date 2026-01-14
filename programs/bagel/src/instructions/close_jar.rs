use anchor_lang::prelude::*;
// NOTE: SPL token functionality temporarily disabled due to stack issues
// use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};
use crate::{constants::*, state::*};

/// Close the payroll jar and return remaining funds
/// 
/// Only the employer can close their payroll jar.
/// Any remaining funds are returned to the employer.
/// 
/// TODO: Re-enable token account closure when anchor-spl is restored
pub fn handler(
    ctx: Context<CloseJar>,
) -> Result<()> {
    let jar = &ctx.accounts.payroll_jar;
    
    msg!("Closing payroll jar: {}", jar.key());
    msg!("Remaining funds: {} lamports", jar.total_accrued);
    
    // TODO: Transfer remaining tokens back to employer
    // TODO: Close token account and reclaim rent
    
    // The account will be closed automatically by Anchor's close constraint
    Ok(())
}

#[derive(Accounts)]
pub struct CloseJar<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,
    
    #[account(
        mut,
        close = employer,
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
