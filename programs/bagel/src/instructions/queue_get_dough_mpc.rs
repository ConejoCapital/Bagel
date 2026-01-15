use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_anchor::traits::QueueCompAccs;
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
    
    // Build callback instruction manually (Fix 5 - bypass macros)
    // We construct the Anchor Instruction manually, then wrap it as Arcium's CallbackInstruction
    use crate::arcium_callback_builder::{build_finalize_callback_ix, FinalizeCallbackAccounts};
    use crate::constants::program_ids::MAGICBLOCK_PROGRAM_ID;
    
    // Get MagicBlock program ID
    let magic_program_id = Pubkey::try_from(MAGICBLOCK_PROGRAM_ID)
        .unwrap_or(Pubkey::default());
    
    // Build the callback accounts with the actual pubkeys
    // Note: magic_context and magic_program will need to be passed or derived
    // For now, we use placeholders - in production these should be actual accounts
    let callback_accounts = FinalizeCallbackAccounts {
        employee: ctx.accounts.employee.key(),
        employer: ctx.accounts.employer.key(),
        payroll_jar: ctx.accounts.payroll_jar.key(),
        magic_context: Pubkey::default(), // TODO: Get actual magic_context account
        magic_program: magic_program_id,
        system_program: anchor_lang::solana_program::system_program::ID,
    };
    
    // Build the Anchor instruction
    let anchor_cb_ix = build_finalize_callback_ix(
        ctx.program_id,
        callback_accounts,
    );
    
    // Wrap as Arcium's CallbackInstruction
    // CallbackInstruction is re-exported through arcium_anchor::prelude
    // But it's from arcium_client::idl::arcium::types
    // Since it's private, we need to use the trait method or construct it via the trait
    // Actually, let's use the CallbackCompAccs trait method if available
    // For now, we'll construct it manually using the expected structure
    // The queue_computation function expects Vec<CallbackInstruction>
    // Let's check if we can use a simpler approach - just pass the instruction data
    
    // Since CallbackInstruction is private, we need to use the trait method
    // But we removed the macro, so we need to implement CallbackCompAccs manually
    // OR we can try to construct it using the types that are public
    
    // For Fix 5, let's try a different approach:
    // Use the instruction directly and see if queue_computation accepts it
    // If not, we'll need to implement CallbackCompAccs trait for the callback struct
    
    // Actually, looking at the queue_computation signature, it needs CallbackInstruction
    // which is private. The only way to get it is through CallbackCompAccs::callback_ix
    // So we need to implement that trait for FinalizeGetDoughFromMpcCallback
    
    // For now, let's create a placeholder and document that we need to implement the trait
    msg!("   ⚠️  NOTE: CallbackInstruction construction pending trait implementation");
    msg!("   🔄 Will implement CallbackCompAccs for FinalizeGetDoughFromMpcCallback");
    
    // Placeholder - this will fail compilation but shows the structure needed
    // TODO: Implement CallbackCompAccs trait for FinalizeGetDoughFromMpcCallback
    return err!(BagelError::ComputationFailed);
    
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
    
    /// Arcium computation accounts (manually added - Fix 5)
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Arcium program
    pub arcium_program: UncheckedAccount<'info>,
    
    /// CHECK: MXE account
    /// Using the deployed MXE account address from constants
    pub mxe_account: UncheckedAccount<'info>,
    
    /// CHECK: Computation definition account
    pub comp_def_account: UncheckedAccount<'info>,
    
    /// CHECK: Computation account (will be created)
    #[account(mut)]
    pub computation_account: UncheckedAccount<'info>,
    
    /// CHECK: Cluster account
    /// Using the deployed cluster account address from constants
    pub cluster_account: UncheckedAccount<'info>,
    
    /// CHECK: Signer PDA for Arcium
    #[account(mut)]
    pub sign_pda_account: UncheckedAccount<'info>,
    
    /// CHECK: Instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}
