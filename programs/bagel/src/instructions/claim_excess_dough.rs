use anchor_lang::prelude::*;
use crate::{constants::*, error::*, privacy::*, state::*};
use crate::privacy::inco::ConfidentialBalance;

/// Claim excess dough (yield profit) from Kamino vault
/// 
/// This instruction allows the employer to withdraw ONLY the yield earned
/// from the Kamino vault, leaving the principal intact for employee payouts.
/// 
/// **USE CASE:** Employer wants to claim yield profits while keeping payroll funded
/// 
/// **FLOW:**
/// 1. Get current kSOL value from Kamino (encrypted via Arcium C-SPL)
/// 2. Calculate yield profit using MPC: current_value - initial_deposit
/// 3. Withdraw only the yield amount from Kamino
/// 4. Transfer yield to employer
/// 5. Principal remains in vault for employee payouts
/// 
/// **PRIVACY:**
/// - Treasury total value stays hidden (Arcium C-SPL)
/// - Yield amount calculated via MPC (encrypted computation)
/// - Only employer can see their yield profit
pub fn handler(ctx: Context<ClaimExcessDough>) -> Result<()> {
    let jar = &ctx.accounts.payroll_jar;
    let clock = Clock::get()?;
    
    msg!("💰 Claiming excess dough (yield profit)");
    msg!("   PayrollJar: {}", jar.key());
    
    // Validate that this is the employer
    require!(
        ctx.accounts.employer.key() == jar.employer,
        BagelError::UnauthorizedEmployer
    );
    
    // TODO: Get current kSOL value from Kamino vault
    // This should be from the Confidential Token Account (Arcium C-SPL)
    // 
    // use kamino::vault::get_position_value;
    // let current_kSOL_value = get_position_value(
    //     ctx.accounts.kamino_vault_position,
    // )?;
    // 
    // // The value should be encrypted in C-SPL account
    // let encrypted_current_value = ctx.accounts.confidential_token_account.get_balance()?;
    
    // For now, mock the current value
    // In production, this comes from Kamino + Arcium C-SPL
    msg!("⚠️ MOCK: Getting current kSOL value from Kamino");
    let encrypted_current_value = ConfidentialBalance::new(0); // TODO: Get from C-SPL account
    let encrypted_initial_deposit = ConfidentialBalance::new(0); // TODO: Get from PayrollJar state
    
    // Calculate yield profit using MPC (Arcium circuit)
    // This uses the YieldProfitCalculation circuit
    msg!("🔮 Calculating yield profit via MPC...");
    
    // TODO: Call Arcium MPC circuit for yield calculation
    // 
    // use arcium::queue_computation;
    // 
    // let yield_circuit_id = "YIELD_PROFIT_CIRCUIT_ID"; // From deployment
    // let args = ArgBuilder::new()
    //     .addConfidentialU64(encrypted_current_value)  // Current kSOL value
    //     .addConfidentialU64(encrypted_initial_deposit) // Initial deposit
    //     .build();
    // 
    // let signed_result = queue_computation(
    //     yield_circuit_id,
    //     args,
    //     1000, // Priority fee
    // )?;
    // 
    // // Verify BLS signature
    // signed_result.verify_output(&cluster_account, &computation_account)?;
    // 
    // let encrypted_yield_profit = signed_result.value;
    
    // For now, mock the calculation
    let encrypted_yield_profit = encrypted_current_value; // TODO: Use MPC result
    
    // Decrypt yield profit (only employer can do this)
    let yield_profit = encrypted_yield_profit.decrypt()?;
    
    require!(yield_profit > 0, BagelError::NoAccruedDough);
    
    msg!("✅ Yield profit calculated: {} lamports", yield_profit);
    
    // TODO: Withdraw yield from Kamino vault
    // This should withdraw ONLY the yield, leaving principal intact
    // 
    // use kamino::vault::withdraw_yield;
    // 
    // let withdrawn_amount = withdraw_yield(
    //     ctx.accounts.kamino_vault_position,
    //     yield_profit,
    // )?;
    
    msg!("💸 Withdrawing yield from Kamino vault...");
    msg!("   Amount: {} lamports", yield_profit);
    msg!("   ⚠️ MOCK: In production, this would call Kamino withdraw_yield");
    
    // TODO: Transfer yield to employer
    // 
    // ** Transfer logic would go here **
    // The yield profit goes back to the employer's wallet
    // The principal remains in the Kamino vault for employee payouts
    
    msg!("✅ Yield profit claimed!");
    msg!("   Amount: {} lamports", yield_profit);
    msg!("   Principal remains in vault for employee payouts");
    
    // Emit event (using state module)
    emit!(crate::state::YieldClaimed {
        employer: ctx.accounts.employer.key(),
        bagel_jar: jar.key(),
        yield_amount: yield_profit,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimExcessDough<'info> {
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
    
    /// CHECK: Kamino vault position account
    /// This holds the kSOL tokens from the 90% deposit
    pub kamino_vault_position: UncheckedAccount<'info>,
    
    /// CHECK: Arcium Confidential Token Account
    /// This wraps the kSOL tokens to hide the treasury value
    pub confidential_token_account: UncheckedAccount<'info>,
    
    /// CHECK: Arcium MPC program for yield calculation
    pub arcium_mpc_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

// Event is defined in state/mod.rs
