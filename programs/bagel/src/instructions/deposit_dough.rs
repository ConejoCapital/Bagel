use anchor_lang::prelude::*;
// NOTE: SPL token functionality temporarily disabled due to stack issues
// use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, error::*, privacy::*, state::*};

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
    
    // 🥯 YIELD STRATEGY: Route 90% to Kamino, 10% liquid
    // This allows the treasury to earn yield while keeping some liquidity
    // for immediate payouts.
    
    let yield_amount = (amount as u128 * 90 / 100) as u64; // 90% to yield
    let liquid_amount = amount - yield_amount; // 10% liquid
    
    msg!("💰 Deposit strategy:");
    msg!("   Total deposit: {} lamports", amount);
    msg!("   To Kamino vault (90%): {} lamports", yield_amount);
    msg!("   Liquid (10%): {} lamports", liquid_amount);
    
    // Route 90% to Kamino SOL vault for yield
    // TODO: Replace with actual Kamino vault account
    let kamino_vault = Pubkey::default(); // TODO: Set actual Kamino SOL vault
    
    if yield_amount > 0 {
        msg!("🏦 Depositing {} lamports to Kamino vault...", yield_amount);
        
        // Deposit to Kamino vault
        let _vault_position = kamino::deposit_to_kamino_vault(
            yield_amount,
            kamino_vault,
        )?;
        
        // Store vault position reference in PayrollJar
        // TODO: Store position_token_account in jar.dough_vault
        jar.dough_vault = kamino_vault;
        
        msg!("✅ Yield position created!");
        msg!("   Funds earning yield in Kamino SOL vault");
    }
    
    // Add liquid portion to total_accrued (for immediate payouts)
    jar.total_accrued = jar.total_accrued
        .checked_add(liquid_amount)
        .ok_or(BagelError::ArithmeticOverflow)?;
    
    msg!("💧 Liquid balance: {} lamports (available for payouts)", liquid_amount);
    
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
    
    /// CHECK: Employee reference needed for PDA derivation
    pub employee: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [BAGEL_JAR_SEED, employer.key().as_ref(), employee.key().as_ref()],
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
