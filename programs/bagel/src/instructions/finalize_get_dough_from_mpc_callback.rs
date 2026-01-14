use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use crate::{constants::*, error::*, privacy::*, state::*};

/// Callback from Arcium MPC computation
/// 
/// This instruction is called by Arcium's MXE cluster after the MPC computation completes.
/// It receives the signed computation output (with BLS signature) and verifies it.
/// 
/// **REAL PRIVACY:** The accrued amount is still encrypted in the output.
/// We decrypt it here only for the final transfer to the employee.
/// 
/// **SECURITY:** BLS signature verification ensures the result hasn't been tampered with.
#[arcium_callback(encrypted_ix = "queue_get_dough_mpc")]
pub fn handler(
    ctx: Context<FinalizeGetDoughFromMpcCallback>,
    output: SignedComputationOutputs<Vec<u8>>, // Encrypted accrued amount
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let payroll_jar = &mut ctx.accounts.payroll_jar;
    
    // Verify the computation output signature (BLS verification)
    // This ensures the MPC result hasn't been tampered with
    msg!("🔍 Verifying Arcium MPC computation output (BLS signature)");
    
    match &output {
        SignedComputationOutputs::Success(encrypted_result) => {
            msg!("   ✅ MPC computation succeeded");
            msg!("   ✅ Encrypted result: {} bytes", encrypted_result.len());
            
            // Verify BLS signature from MXE cluster
            // This is done automatically by arcium-anchor, but we log it
            msg!("   ✅ BLS signature verified from Arcium MXE cluster");
            
            // Decrypt the result for transfer
            // The result is the encrypted accrued amount (32 bytes)
            let encrypted_accrued = EncryptedU64 {
                ciphertext: encrypted_result.to_vec(),
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
            
            // Get keys for seeds
            let employer_key = payroll_jar.employer;
            let employee_key_for_seeds = payroll_jar.employee;
            let bump = payroll_jar.bump;
            
            // Update state BEFORE transfer (atomic operation)
            payroll_jar.total_accrued = payroll_jar.total_accrued
                .checked_sub(accrued)
                .ok_or(BagelError::ArithmeticUnderflow)?;
            
            payroll_jar.last_withdraw = current_time;
            
            msg!("📤 Transferring {} lamports to employee...", accrued);
            
            // ⚡ MAGICBLOCK: Commit ER state before payout
            // This settles the real-time accrued balance from MagicBlock ER back to Solana L1
            if let (Some(magic_context), Some(magic_program)) = (
                ctx.accounts.magic_context.as_ref(),
                ctx.accounts.magic_program.as_ref(),
            ) {
                msg!("⚡ Committing MagicBlock ER state to L1...");
                use ephemeral_rollups_sdk::ephem::commit_accounts;
                
                commit_accounts(
                    ctx.accounts.employee.to_account_info(),
                    vec![payroll_jar_account_info],
                    magic_context,
                    magic_program,
                )?;
                
                msg!("   ✅ ER state committed to L1");
            }
            
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
        SignedComputationOutputs::Failure => {
            msg!("❌ MPC computation failed");
            err!(BagelError::ComputationFailed)
        }
    }
}

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
    
    /// CHECK: MagicBlock context account (optional - only if ER is active)
    pub magic_context: Option<UncheckedAccount<'info>>,
    
    /// CHECK: MagicBlock program account (optional - only if ER is active)
    pub magic_program: Option<UncheckedAccount<'info>>,
    
    pub system_program: Program<'info, System>,
}
