use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, error::*, state::*};

/// Deposit funds into the BagelJar
/// 🥯 "Add Fresh Dough" - Fund the payroll
pub fn handler(
    ctx: Context<DepositDough>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, BagelError::InsufficientFunds);

    // Transfer USD1 tokens from employer to BagelJar vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.employer_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.employer.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::transfer(cpi_ctx, amount)?;

    // Emit event
    emit!(DoughAdded {
        employer: ctx.accounts.employer.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!("🥯 Added {} dough to the jar", amount);

    Ok(())
}

#[derive(Accounts)]
pub struct DepositDough<'info> {
    /// The employer funding the payroll
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

    /// Employer's USD1 token account
    #[account(mut)]
    pub employer_token_account: Account<'info, TokenAccount>,

    /// Vault token account (holds the funds)
    /// TODO: This should be a PDA token account
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
