use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};
use crate::{constants::*, error::*, state::*};

/// Close a payroll and return remaining funds
/// 🥯 "Empty the Jar" - Terminate payroll
pub fn handler(ctx: Context<CloseJar>) -> Result<()> {
    let payroll_jar = &ctx.accounts.payroll_jar;

    // Transfer any remaining funds back to employer
    let vault_balance = ctx.accounts.vault_token_account.amount;
    
    if vault_balance > 0 {
        let seeds = &[
            BAGEL_JAR_SEED,
            payroll_jar.employer.as_ref(),
            payroll_jar.employee.as_ref(),
            &[payroll_jar.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.employer_token_account.to_account_info(),
            authority: payroll_jar.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(
            cpi_program,
            cpi_accounts,
            signer_seeds,
        );

        token::transfer(cpi_ctx, vault_balance)?;
    }

    msg!("🥯 BagelJar emptied and closed");

    Ok(())
}

#[derive(Accounts)]
pub struct CloseJar<'info> {
    /// The employer (only they can close)
    #[account(mut)]
    pub employer: Signer<'info>,

    /// The BagelJar PDA (will be closed)
    #[account(
        mut,
        close = employer,
        seeds = [
            BAGEL_JAR_SEED,
            employer.key().as_ref(),
            payroll_jar.employee.as_ref(),
        ],
        bump = payroll_jar.bump,
        has_one = employer,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,

    /// Vault token account
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Employer's token account (receives remaining funds)
    #[account(mut)]
    pub employer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
