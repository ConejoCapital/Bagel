use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use crate::{constants::*, error::*, privacy::*, state::*};

/// Queue MPC computation for accrued salary calculation
/// 
/// This instruction queues an Arcium MPC computation to calculate:
/// accrued_salary = encrypted_salary_per_second * elapsed_seconds
/// 
/// The computation happens asynchronously on Arcium's MXE cluster.
/// Once complete, Arcium will call back to `finalize_get_dough_from_mpc_callback`.
/// 
/// **REAL PRIVACY:** The salary amount stays encrypted throughout the computation.
pub fn handler(
    ctx: Context<QueueGetDoughMpc>,
    elapsed_seconds: u64,
) -> Result<()> {
    let payroll_jar = &ctx.accounts.payroll_jar;
    
    // Verify payroll is active
    require!(payroll_jar.is_active, BagelError::InvalidState);
    
    // Reconstruct encrypted salary from stored ciphertext
    let encrypted_salary = EncryptedU64 {
        ciphertext: payroll_jar.encrypted_salary_per_second.clone(),
        encryption_pubkey: None,
    };
    
    msg!("🔮 Queueing MPC computation for accrued salary");
    msg!("   Elapsed seconds: {}", elapsed_seconds);
    msg!("   Encrypted salary: {} bytes", encrypted_salary.ciphertext.len());
    
    // Build MPC inputs
    // Input 1: encrypted_salary_per_second (32 bytes)
    // Input 2: elapsed_seconds (8 bytes, u64)
    let mut inputs = Vec::new();
    inputs.extend_from_slice(&encrypted_salary.ciphertext);
    
    let elapsed_bytes = elapsed_seconds.to_le_bytes();
    inputs.extend_from_slice(&elapsed_bytes);
    
    msg!("   ✅ MPC inputs prepared: {} bytes", inputs.len());
    
    // Queue the computation with callback
    // The callback will be: finalize_get_dough_from_mpc_callback
    queue_computation(&ctx.accounts, inputs)?;
    
    msg!("   ✅ MPC computation queued on Arcium MXE cluster");
    msg!("   🔄 Waiting for callback: finalize_get_dough_from_mpc_callback");
    
    Ok(())
}

#[derive(Accounts)]
#[queue_computation_accounts("queue_get_dough_mpc", payer)]
pub struct QueueGetDoughMpc<'info> {
    #[account(mut)]
    pub employee: Signer<'info>,
    
    /// CHECK: Employer reference needed for PDA derivation
    pub employer: UncheckedAccount<'info>,
    
    #[account(
        seeds = [BAGEL_JAR_SEED, employer.key().as_ref(), employee.key().as_ref()],
        bump,
        has_one = employee,
        has_one = employer,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,
    
    /// Arcium computation accounts (provided by QueueCompAccs trait)
    #[account(mut)]
    pub payer: Signer<'info>,
    
    // Arcium accounts are automatically added by #[queue_computation_accounts] macro
    // These include: computation_account, cluster_account, mxe_account, etc.
    pub system_program: Program<'info, System>,
}
