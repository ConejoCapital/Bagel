//! MagicBlock Private Ephemeral Rollups (PER) Integration
//!
//! This module provides integration with MagicBlock PERs for real-time
//! payroll streaming with sub-second precision using Intel TDX TEE.
//!
//! **LEAN BAGEL STACK**
//! Documentation: https://docs.magicblock.gg
//!
//! **KEY FEATURES:**
//! - Real-time balance updates (sub-second precision)
//! - State hidden in TEE (Intel TDX)
//! - Delegate EmployeeEntry to PER for streaming
//! - Commit state back to L1 on withdrawal
//!
//! **HOW IT WORKS:**
//! 1. Employee added → EmployeeEntry delegated to PER
//! 2. Salary accrues in real-time in TEE (state is private!)
//! 3. Employee authenticates with TEE to view balance
//! 4. Employee withdraws → State committed back to L1
//! 5. Confidential token transfer executed
//!
//! **NETWORK:** Devnet
//! **TEE RPC:** https://tee.magicblock.app
//! **Delegation Program:** DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh

use anchor_lang::prelude::*;
use crate::constants::{
    MAGICBLOCK_DELEGATION_PROGRAM,
    MAGICBLOCK_TEE_VALIDATOR,
};

/// MagicBlock PER Configuration
///
/// Configuration for delegating EmployeeEntry to a Private Ephemeral Rollup
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ERConfig {
    /// TEE validator public key
    pub validator: Pubkey,

    /// Account lifetime in seconds
    pub lifetime: u64,

    /// Synchronization frequency (how often to commit to L1)
    pub sync_frequency: u64,
}

impl Default for ERConfig {
    fn default() -> Self {
        // Use TEE validator for maximum privacy
        let validator = Pubkey::try_from(MAGICBLOCK_TEE_VALIDATOR)
            .unwrap_or(Pubkey::default());

        Self {
            validator,
            lifetime: 86400 * 365, // 1 year default
            sync_frequency: 3600,   // Commit every hour
        }
    }
}

impl ERConfig {
    /// Create config with specific validator
    pub fn with_validator(validator_str: &str) -> Self {
        let validator = Pubkey::try_from(validator_str)
            .unwrap_or(Pubkey::default());

        Self {
            validator,
            ..Default::default()
        }
    }

    /// Create config for TEE (maximum privacy)
    pub fn tee() -> Self {
        Self::with_validator(MAGICBLOCK_TEE_VALIDATOR)
    }
}

/// Delegate EmployeeEntry to MagicBlock Ephemeral Rollup
/// 
/// **NOTE:** This helper function is deprecated. The actual delegation is handled
/// by the ephemeral-rollups-sdk via the #[delegate] macro in lib.rs.
/// 
/// The `delegate_to_tee()` instruction uses the #[delegate] macro which
/// automatically handles delegation via account constraints.
/// 
/// This function is kept for reference but is no longer called.
/// 
/// **DEPRECATED:** Use `delegate_to_tee()` instruction instead, which uses the #[delegate] macro.
pub fn delegate_employee_entry(
    _ctx: &Context<DelegateEmployeeEntry>,
    er_config: ERConfig,
) -> Result<()> {
    use crate::constants::program_ids::MAGICBLOCK_PROGRAM_ID;
    
    msg!("⚠️  delegate_employee_entry() helper is deprecated");
    msg!("   Use delegate_to_tee() instruction with #[delegate] macro instead");
    msg!("   Program: {}", MAGICBLOCK_PROGRAM_ID);
    msg!("   Validator: {}", er_config.validator);
    
    // This function is no longer used - delegation is handled by #[delegate] macro
    // in delegate_to_tee() instruction via account constraints
    
    Ok(())
}

/// Commit ER state and undelegate EmployeeEntry
/// 
/// This commits the final accrued balance from the ER back to Solana L1
/// and undelegates the account.
/// 
/// **USE CASE:** Called when employee withdraws to settle final balance
/// 
/// **CURRENT:** Mock implementation
/// **PRODUCTION:** Will use ephemeral-rollups-sdk
/// 
/// ```ignore
/// use ephemeral_rollups_sdk::prelude::*;
/// 
/// // Commit state to L1
/// commit_and_undelegate_accounts(
///     ctx,
///     &[payroll_jar],
/// )?;
/// ```
/// Commit ER state and undelegate EmployeeEntry
/// 
/// **NOTE:** This is a helper function. The actual commit is handled
/// by the ephemeral-rollups-sdk via commit_and_undelegate_accounts in lib.rs.
pub fn commit_and_undelegate(
    _ctx: &Context<CommitAndUndelegate>,
) -> Result<()> {
    msg!("⚡ Committing ER state and undelegating EmployeeEntry");
    
    // REAL MAGICBLOCK CPI: Commit ER state and undelegate
    // Uses commit_and_undelegate_accounts from ephemeral-rollups-sdk v0.7.2
    // 
    // When program ID is available, uncomment SDK in Cargo.toml and implement:
    // use ephemeral_rollups_sdk::instruction::commit_and_undelegate_accounts;
    // use ephemeral_rollups_sdk::prelude::*;
    // use crate::constants::program_ids::MAGICBLOCK_PROGRAM_ID;
    // 
    // let magicblock_program = Pubkey::try_from(MAGICBLOCK_PROGRAM_ID)?;
    // 
    // // Commit final state from ER back to Solana L1
    // let commit_ix = commit_and_undelegate_accounts(
    //     magicblock_program,
    //     &[ctx.accounts.payroll_jar.key()],
    // )?;
    // 
    // anchor_lang::solana_program::program::invoke(
    //     &commit_ix,
    //     &[
    //         ctx.accounts.payroll_jar.to_account_info(),
    //         ctx.accounts.delegation_program.to_account_info(),
    //     ],
    // )?;
    // 
    // msg!("✅ ER state committed to L1 and undelegated!");
    
    msg!("✅ ER state committed to L1 (mock - will use real SDK)");
    msg!("   EmployeeEntry undelegated and back on Solana L1");
    
    Ok(())
}

/// Get accrued balance from ER
/// 
/// Queries the Ephemeral Rollup for the current accrued balance.
/// 
/// **NOTE:** This is a helper function. The actual delegation is handled
/// by the ephemeral-rollups-sdk via the #[delegate] macro in lib.rs.
/// 
/// **PRODUCTION:** Will query ER RPC endpoint for real-time balance
/// 
/// **PRIVACY:** Balance is still encrypted (Euint128) - this function would
/// query the TEE and return the encrypted handle, not the decrypted value.
/// Decryption requires authorization and should be done client-side.
pub fn get_er_balance(
    _employee_entry_key: Pubkey,
) -> Result<u64> {
    // NOTE: TEE balance query is implemented client-side in app/lib/magicblock.ts
    // This Rust function is a placeholder for program-side queries if needed
    // 
    // The actual balance is encrypted in EmployeeEntry.encrypted_accrued
    // Client-side implementation uses TEE RPC with auth token to query balance
    // 
    // For program-side usage, we would need to:
    // 1. Make CPI to TEE RPC (not directly supported in Solana programs)
    // 2. Or return the encrypted handle from EmployeeEntry.encrypted_accrued
    // 
    // Since TEE queries require auth tokens and are best done client-side,
    // this function remains a placeholder. The real implementation is in the frontend.
    
    msg!("⚠️  TEE balance query should be done client-side with auth token");
    msg!("   Use app/lib/magicblock.ts getStreamBalance() for real-time balance");
    
    // Return 0 as placeholder - actual balance is encrypted and queried client-side
    Ok(0)
}

/// Accounts for delegating EmployeeEntry to ER
/// 
/// **NOTE:** This is a helper struct. The actual delegation is handled
/// by the ephemeral-rollups-sdk via the #[delegate] macro in lib.rs.
#[derive(Accounts)]
pub struct DelegateEmployeeEntry<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,
    
    #[account(mut)]
    pub employee_entry: AccountInfo<'info>,
    
    /// CHECK: MagicBlock Delegation Program
    pub delegation_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Accounts for committing and undelegating
/// 
/// **NOTE:** This is a helper struct. The actual commit is handled
/// by the ephemeral-rollups-sdk via commit_and_undelegate_accounts in lib.rs.
#[derive(Accounts)]
pub struct CommitAndUndelegate<'info> {
    #[account(mut)]
    pub employee_entry: AccountInfo<'info>,
    
    /// CHECK: MagicBlock Delegation Program
    pub delegation_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}
