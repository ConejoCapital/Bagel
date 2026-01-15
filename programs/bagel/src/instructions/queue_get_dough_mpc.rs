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
    
    // Build MPC inputs using ArgBuilder
    // Input 1: encrypted_salary_per_second (32 bytes) - encrypted data
    // Input 2: elapsed_seconds (u64) - plaintext scalar
    use crate::constants::ARCIUM_CLUSTER_OFFSET;
    use arcium_anchor::prelude::ArgBuilder;
    
    // Build arguments using ArgBuilder
    // The encrypted salary is already encrypted (32 bytes)
    // We pass it as encrypted data, and elapsed_seconds as plaintext
    let encrypted_bytes: [u8; 32] = encrypted_salary.ciphertext[0..32]
        .try_into()
        .map_err(|_| error!(BagelError::InvalidAmount))?;
    
    let args = ArgBuilder::new()
        .encrypted_u8(encrypted_bytes)  // [u8; 32] - encrypted salary
        .plaintext_u64(elapsed_seconds) // u64 - elapsed seconds
        .build();
    
    msg!("   ✅ MPC inputs prepared using ArgBuilder");
    
    // Build callback instruction using the callback_ix helper
    // The callback_accounts macro generates this method on the accounts struct
    use crate::instructions::finalize_get_dough_from_mpc_callback::FinalizeGetDoughFromMpcCallback;
    
    let callback_ix = FinalizeGetDoughFromMpcCallback::callback_ix(
        ARCIUM_CLUSTER_OFFSET,
        &ctx.accounts.mxe_account,
        &[], // No custom accounts needed
    )?;
    
    // Queue the computation with callback
    queue_computation(
        &ctx.accounts,
        ARCIUM_CLUSTER_OFFSET,  // computation_offset
        args,                    // args: ArgumentList
        None,                    // callback_url: Option<String> (None for on-chain)
        vec![callback_ix],       // callback_instructions
        1,                       // num_callback_txs
        1000,                    // cu_price_micro (priority fee)
    )?;
    
    msg!("   ✅ MPC computation queued on Arcium MXE cluster");
    msg!("   🔄 Waiting for callback: finalize_get_dough_from_mpc_callback");
    
    Ok(())
}

#[queue_computation_accounts("queue_get_dough_mpc", payer)]
#[derive(Accounts)]
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
