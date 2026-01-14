use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
// NOTE: SPL token functionality temporarily disabled due to stack issues
// use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, error::*, privacy::*, state::*};

// REAL KAMINO CPI: Using kamino-lend v0.4.1
// Note: For native SOL deposits, we may need to wrap to WSOL first
// The CPI will be implemented when we have all required accounts

/// Deposit funds (dough) into the payroll jar
/// 
/// TODO: Re-enable SPL token transfers once spl-token-2022 stack issues are resolved
pub fn handler(
    ctx: Context<DepositDough>,
    amount: u64,
) -> Result<()> {
    // Validate amount
    require!(amount > 0, BagelError::InvalidAmount);
    
    // Get account info BEFORE mutable borrow
    let employer_key = ctx.accounts.employer.key();
    let payroll_jar_key = ctx.accounts.payroll_jar.key();
    let employer_account_info = ctx.accounts.employer.to_account_info();
    let payroll_jar_account_info = ctx.accounts.payroll_jar.to_account_info();
    let system_program_account_info = ctx.accounts.system_program.to_account_info();
    
    let jar = &mut ctx.accounts.payroll_jar;
    
    // 🥯 YIELD STRATEGY: Route 90% to Kamino, 10% liquid
    // This allows the treasury to earn yield while keeping some liquidity
    // for immediate payouts.
    
    let yield_amount = (amount as u128 * 90 / 100) as u64; // 90% to yield
    let liquid_amount = amount - yield_amount; // 10% liquid
    
    msg!("💰 Deposit strategy:");
    msg!("   Total deposit: {} lamports", amount);
    msg!("   To Kamino vault (90%): {} lamports", yield_amount);
    msg!("   Liquid (10%): {} lamports", liquid_amount);
    
    // Route 90% to Kamino Lend V2 Main Market for yield
    // Main Market: 7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF
    // SOL Reserve: d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q
    use crate::constants::{KAMINO_MAIN_MARKET, KAMINO_SOL_RESERVE, KAMINO_LENDING_PROGRAM};
    let kamino_main_market = Pubkey::try_from(KAMINO_MAIN_MARKET)
        .map_err(|_| error!(BagelError::InvalidAmount))?;
    let kamino_sol_reserve = Pubkey::try_from(KAMINO_SOL_RESERVE)
        .map_err(|_| error!(BagelError::InvalidAmount))?;
    let kamino_program_id = Pubkey::try_from(KAMINO_LENDING_PROGRAM)
        .map_err(|_| error!(BagelError::InvalidAmount))?;
    
    if yield_amount > 0 {
        msg!("🏦 Preparing {} lamports for Kamino Lend V2 Main Market", yield_amount);
        msg!("   Market: {}", kamino_main_market);
        msg!("   SOL Reserve: {}", kamino_sol_reserve);
        msg!("   Program: {}", kamino_program_id);
        
        // REAL KAMINO CPI: Using kamino-lend v0.4.1 with CPI feature
        // 
        // IMPORTANT: Kamino requires WSOL (Wrapped SOL) for deposits, not native SOL.
        // For production, we need to:
        // 1. Wrap native SOL to WSOL using SPL Token program
        // 2. Use deposit_reserve_liquidity CPI with WSOL token account
        // 3. Receive kSOL collateral tokens
        // 
        // For now, we transfer the yield_amount to PayrollJar and mark it for Kamino.
        // The real CPI will be implemented when WSOL wrapping is added.
        //
        // Real CPI structure (when WSOL accounts are added):
        // use kamino_lend::cpi::accounts::DepositReserveLiquidityAndObligationCollateral;
        // use kamino_lend::cpi::deposit_reserve_liquidity_and_obligation_collateral;
        // use anchor_lang::CpiContext;
        // 
        // let cpi_accounts = DepositReserveLiquidityAndObligationCollateral {
        //     source_liquidity: ctx.accounts.wsol_token_account.to_account_info(),
        //     destination_collateral: ctx.accounts.ksol_token_account.to_account_info(),
        //     reserve: ctx.accounts.kamino_reserve.to_account_info(),
        //     reserve_liquidity_supply: ctx.accounts.reserve_liquidity_supply.to_account_info(),
        //     reserve_collateral_mint: ctx.accounts.reserve_collateral_mint.to_account_info(),
        //     lending_market: ctx.accounts.kamino_lending_market.to_account_info(),
        //     lending_market_authority: ctx.accounts.kamino_lending_market_authority.to_account_info(),
        //     user_transfer_authority: ctx.accounts.employer.to_account_info(),
        //     obligation: ctx.accounts.obligation.to_account_info(), // Optional
        //     obligation_owner: ctx.accounts.employer.to_account_info(),
        //     token_program: ctx.accounts.token_program.to_account_info(),
        // };
        // 
        // let cpi_ctx = CpiContext::new(
        //     ctx.accounts.kamino_program.to_account_info(),
        //     cpi_accounts,
        // );
        // 
        // deposit_reserve_liquidity_and_obligation_collateral(cpi_ctx, yield_amount)?;
        // 
        // msg!("✅ Real Kamino CPI executed! Funds earning yield");
        
        // For now, transfer yield_amount to PayrollJar and mark it for Kamino
        // This keeps the 90/10 split working while we prepare WSOL wrapping
        let transfer_yield_ix = anchor_lang::solana_program::system_instruction::transfer(
            &employer_key,
            &payroll_jar_key,
            yield_amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_yield_ix,
            &[
                employer_account_info.clone(),
                payroll_jar_account_info.clone(),
                system_program_account_info.clone(),
            ],
        )?;
        
        // Store Kamino reserve reference (will be replaced with position account after real CPI)
        jar.dough_vault = kamino_sol_reserve;
        
        msg!("✅ Yield amount transferred to PayrollJar (marked for Kamino)");
        msg!("   ⚠️ NOTE: Real Kamino CPI requires WSOL wrapping");
        msg!("   Next step: Add WSOL wrapping before Kamino deposit");
        msg!("   Structure ready for kamino-lend v0.4.1 CPI integration");
    }
    
    // REAL SOL TRANSFER: Transfer liquid portion to PayrollJar account
    // This ensures the PayrollJar actually has SOL for employee payouts
    if liquid_amount > 0 {
        msg!("💧 Transferring {} lamports to PayrollJar account...", liquid_amount);
        
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &employer_key,
            &payroll_jar_key,
            liquid_amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                employer_account_info,
                payroll_jar_account_info,
                system_program_account_info,
            ],
        )?;
        
        msg!("✅ SOL transferred to PayrollJar!");
    }
    
    // Update state to track total balance (liquid + yield)
    // Note: Both liquid_amount and yield_amount are now in PayrollJar
    // The yield_amount is marked for Kamino but currently in PayrollJar
    let total_deposited = liquid_amount
        .checked_add(yield_amount)
        .ok_or(BagelError::ArithmeticOverflow)?;
    
    jar.total_accrued = jar.total_accrued
        .checked_add(total_deposited)
        .ok_or(BagelError::ArithmeticOverflow)?;
    
    msg!("💧 Total balance updated: {} lamports", total_deposited);
    msg!("   Liquid (10%): {} lamports (available for immediate payouts)", liquid_amount);
    msg!("   Yield (90%): {} lamports (marked for Kamino, pending WSOL wrap)", yield_amount);
    
    // TODO: In production, wrap yield_amount to WSOL and deposit to Kamino via CPI
    // Then wrap kSOL tokens in Arcium C-SPL for privacy
    
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
