use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use crate::{constants::*, error::*, privacy::*, privacy::mpc_output::GetDoughMpcOut, state::*};

/// Callback from Arcium MPC computation
/// 
/// This instruction is called by Arcium's MXE cluster after the MPC computation completes.
/// It receives the signed computation output (with BLS signature) and verifies it.
/// 
/// **REAL PRIVACY:** The accrued amount is still encrypted in the output.
/// We decrypt it here only for the final transfer to the employee.
/// 
/// **SECURITY:** BLS signature verification ensures the result hasn't been tampered with.
/// Callback handler for Arcium MPC computation
/// 
/// Uses #[arcium_callback] macro to generate proper callback instruction handling
/// and #[callback_accounts] to generate the CallbackCompAccs trait implementation.
#[arcium_callback(encrypted_ix = "queue_get_dough_mpc")]
pub fn handler(
    ctx: Context<FinalizeGetDoughFromMpcCallback>,
    output: SignedComputationOutputs<GetDoughMpcOut>, // Encrypted accrued amount
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let payroll_jar = &mut ctx.accounts.payroll_jar;
    
    // Verify the computation output signature (BLS verification)
    // This ensures the MPC result hasn't been tampered with
    msg!("🔍 Verifying Arcium MPC computation output (BLS signature)");
    
    // Use verify_output() method to verify BLS signature against cluster and computation accounts
    let decoded = output
        .verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account)
        .map_err(|e| {
            msg!("   ❌ BLS signature verification failed: {:?}", e);
            error!(BagelError::ComputationFailed)
        })?;
    
    msg!("   ✅ MPC computation succeeded and BLS signature verified");
    msg!("   ✅ Decoded result: {} bytes", decoded.bytes.len());
    
    // The decoded output contains the encrypted result
    // Extract it for decryption
    let encrypted_result_bytes = &decoded.bytes;
    
    // Decrypt the result for transfer
    // The result is the encrypted accrued amount (32 bytes)
    let encrypted_accrued = EncryptedU64 {
        ciphertext: encrypted_result_bytes.to_vec(),
        encryption_pubkey: None,
    };
    
    // Decrypt for private transfer
    // This is the ONLY place we decrypt (for final payout)
    let accrued = decrypt_for_transfer(&encrypted_accrued)?;
    
    msg!("💰 Decrypted accrued amount: {} lamports", accrued);
    
    require!(accrued > 0, BagelError::NoAccruedDough);
    require!(
        accrued <= payroll_jar.total_accrued,
        BagelError::InsufficientFunds
    );
    
    // Get account info for lamport transfer
    let payroll_jar_account_info = ctx.accounts.payroll_jar.to_account_info();
    let employee_account_info = ctx.accounts.employee.to_account_info();
    
    // Update state BEFORE transfer (atomic operation)
    payroll_jar.total_accrued = payroll_jar.total_accrued
        .checked_sub(accrued)
        .ok_or(BagelError::ArithmeticUnderflow)?;
    
    payroll_jar.last_withdraw = current_time;
    
    msg!("📤 Transferring {} lamports to employee...", accrued);
    
    // ⚡ MAGICBLOCK: Commit ER state before payout
    // This settles the real-time accrued balance from MagicBlock ER back to Solana L1
    msg!("⚡ Committing MagicBlock ER state to L1...");
    
    // Validate MagicBlock program ID
    use crate::constants::program_ids::MAGICBLOCK_PROGRAM_ID;
    let expected_magic_program = Pubkey::try_from(MAGICBLOCK_PROGRAM_ID)
        .map_err(|_| error!(BagelError::InvalidAmount))?;
    require!(
        ctx.accounts.magic_program.key() == expected_magic_program,
        BagelError::InvalidAmount
    );
    
    use ephemeral_rollups_sdk::ephem::commit_accounts;
    
    commit_accounts(
        ctx.accounts.employee.to_account_info(),
        vec![payroll_jar_account_info],
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )?;
    
    msg!("   ✅ ER state committed to L1");
    
    // Direct lamport transfer - subtract from PayrollJar, add to employee
    **payroll_jar_account_info.try_borrow_mut_lamports()? -= accrued;
    **employee_account_info.try_borrow_mut_lamports()? += accrued;
    
    msg!("✅ SOL transferred to employee! {} lamports", accrued);
    msg!("   🔒 Transfer amount was computed via MPC (private!)");
    
    // Emit privacy-preserving event (no amounts logged!)
    emit!(DoughDelivered {
        employee: ctx.accounts.employee.key(),
        bagel_jar: payroll_jar.key(),
        timestamp: current_time,
        // Note: We intentionally do NOT log the amount for privacy
    });
    
    Ok(())
}

/// Callback accounts for Arcium MPC computation result
/// 
/// Uses #[callback_accounts] macro to generate CallbackCompAccs trait implementation
/// which provides the callback_ix() method for building callback instructions.
#[callback_accounts("queue_get_dough_mpc")]
#[derive(Accounts)]
pub struct FinalizeGetDoughFromMpcCallback<'info> {
    #[account(mut)]
    pub employee: Signer<'info>,
    
    /// CHECK: Employer reference needed for PDA derivation
    pub employer: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [BAGEL_JAR_SEED, employer.key().as_ref(), employee.key().as_ref()],
        bump,
        has_one = employee,
        has_one = employer,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,
    
    /// CHECK: MagicBlock context account
    /// Required for committing ER state back to L1 before payout
    pub magic_context: UncheckedAccount<'info>,
    
    /// CHECK: MagicBlock program account
    /// Must equal DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh
    pub magic_program: UncheckedAccount<'info>,
    
    // Arcium callback accounts (generated by #[callback_accounts] macro)
    // The macro adds: arcium_program, comp_def_account, mxe_account,
    // computation_account, cluster_account, instructions_sysvar
    
    /// CHECK: Arcium program
    pub arcium_program: Program<'info, Arcium>,
    
    /// CHECK: Computation definition account
    #[account(address = derive_comp_def_pda!(ARCIUM_CLUSTER_OFFSET as u32))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    /// CHECK: MXE account
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    
    /// CHECK: Computation account
    pub computation_account: UncheckedAccount<'info>,
    
    /// CHECK: Cluster account
    #[account(address = derive_cluster_pda!(mxe_account, BagelError::InvalidState))]
    pub cluster_account: Account<'info, Cluster>,
    
    /// CHECK: Instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}
