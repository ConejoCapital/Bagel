use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
// Explicitly import Arcium's SIGN_PDA_SEED to avoid shadowing from wildcard imports
use arcium_anchor::prelude::SIGN_PDA_SEED;
// Import only what we need from crate modules to avoid shadowing
use crate::constants::BAGEL_JAR_SEED;
use crate::error::BagelError;
use crate::privacy::mpc_output::QueueGetDoughMpcOutput;
use crate::state::PayrollJar;

// Program modules
pub mod constants;
pub mod error;
pub mod instructions;
pub mod privacy; // Privacy SDK integration layer
pub mod state;

// Re-export for convenience (but avoid wildcard re-exports that might shadow Arcium types)
pub use constants::*;
pub use error::*;
pub use instructions::*;
// Do NOT re-export privacy::* as it might shadow Arcium types
// Explicitly re-export only what's needed from privacy module
pub use state::*;

// 🔮 ARCIUM: Explicitly re-export Accounts structs used by #[arcium_program]
// This ensures Anchor's macro expansion can find the generated __client_accounts_* modules
// Note: The structs are already re-exported via `pub use instructions::*;` above,
// but explicit re-exports help with macro expansion visibility
// If direct path doesn't work, the wildcard export should still make them available

declare_id!("8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU");

// 🔮 ARCIUM: Computation definition offset
// This matches the cluster offset used for the payroll circuit
pub const COMP_DEF_OFFSET_GET_DOUGH: u32 = ARCIUM_CLUSTER_OFFSET as u32;

// 🔮 ARCIUM: Move Accounts structs to crate root to fix macro expansion
// This ensures #[arcium_program] can find the generated __client_accounts_* symbols
// These structs must be at crate root, not in instructions/ modules

/// Queue MPC computation accounts
/// 
/// Uses Arcium's #[queue_computation_accounts] macro to generate the QueueCompAccs trait
/// and ensure all required Arcium accounts are present with correct constraints.
/// 
/// **Macro Order:** Must be macro → derive → instruction (per Arcium docs)
/// **Account Order:** payer → sign_pda → Arcium accounts → Bagel accounts (required by macro)
#[queue_computation_accounts("queue_get_dough_mpc", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct QueueGetDoughMpc<'info> {
    // 1. Payer and sign-PDA (must come first)
    // Payer for computation fees (macro parameter "payer" refers to this field)
    #[account(mut)]
    pub payer: Signer<'info>,
    
    // Signer PDA account required by Arcium queue macro
    // Use plain SignerAccount (not fully qualified) - macro expects this exact pattern
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    
    // 2. Arcium-required accounts (in this exact order)
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, BagelError::InvalidState)
    )]
    pub mempool_account: UncheckedAccount<'info>,
    
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, BagelError::InvalidState)
    )]
    pub executing_pool: UncheckedAccount<'info>,
    
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account, BagelError::InvalidState)
    )]
    pub computation_account: UncheckedAccount<'info>,
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_GET_DOUGH))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, BagelError::InvalidState)
    )]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS
    )]
    pub pool_account: Account<'info, FeePool>,
    
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    
    // 3. Bagel-specific accounts (employee/employer/jar) and MagicBlock context
    #[account(mut)]
    pub employee: Signer<'info>,
    
    pub employer: UncheckedAccount<'info>,
    
    #[account(
        seeds = [BAGEL_JAR_SEED, employer.key().as_ref(), employee.key().as_ref()],
        bump,
        has_one = employee,
        has_one = employer,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,
    
    pub magic_context: UncheckedAccount<'info>,
    
    pub magic_program: UncheckedAccount<'info>,
}

/// Callback accounts for Arcium MPC computation result
/// 
/// Uses #[callback_accounts] macro to generate CallbackCompAccs trait implementation
/// which provides the callback_ix() method for building callback instructions.
/// 
/// **Naming Requirement:** Must be named `{InstructionName}Callback` where InstructionName
/// matches the encrypted_ix name in #[queue_computation_accounts].
/// **Account Order:** Arcium callback accounts first, then Bagel-specific accounts (required by macro)
#[callback_accounts("queue_get_dough_mpc")]
#[derive(Accounts)]
pub struct QueueGetDoughMpcCallback<'info> {
    // Arcium callback accounts first (standard order)
    pub arcium_program: Program<'info, Arcium>,
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_GET_DOUGH))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    
    #[account(mut)]
    pub computation_account: UncheckedAccount<'info>,
    
    #[account(address = derive_cluster_pda!(mxe_account, BagelError::InvalidState))]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    
    // Then Bagel-specific accounts (needed for payout)
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
    pub magic_program: UncheckedAccount<'info>,
}

// ⚡ MAGICBLOCK: Enable Ephemeral Rollup support
// This allows the PayrollJar to stream on MagicBlock ER for sub-second precision
// Note: Do NOT stack #[ephemeral] on the same module as #[arcium_program]
// Apply ephemeral behavior at instruction level instead
use ephemeral_rollups_sdk::anchor::{ephemeral, commit, delegate};

// 🔮 ARCIUM: Use #[arcium_program] instead of #[program] for Arcium integration
// This generates the necessary client account helpers and callback instruction builders
// Note: #[arcium_program] includes #[program], so we don't need both
#[arcium_program]
pub mod bagel {
    use super::*;

    /// Initialize a new payroll for an employee with encrypted salary
    /// 🥯 "Start Baking" - Create a new BagelJar for an employee
    /// 
    /// **PRIVACY:** This accepts pre-encrypted salary ciphertext (32 bytes).
    /// The frontend MUST encrypt the salary using Arcium RescueCipher before calling this.
    pub fn bake_payroll(
        ctx: Context<BakePayroll>,
        salary_ciphertext: [u8; 32],
    ) -> Result<()> {
        instructions::bake_payroll::handler(ctx, salary_ciphertext)
    }

    /// Deposit funds into the BagelJar
    /// 🥯 "Add Fresh Dough" - Fund the payroll
    pub fn deposit_dough(
        ctx: Context<DepositDough>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit_dough::handler(ctx, amount)
    }

    /// Withdraw accrued salary (legacy - redirects to MPC queue)
    /// 🥯 "Get Your Dough" - Employee withdraws earned salary
    /// 
    /// **NOTE:** This now redirects to `queue_get_dough_mpc` for real MPC computation.
    /// The actual payout happens in `queue_get_dough_mpc_callback`.
    pub fn get_dough(ctx: Context<GetDough>) -> Result<()> {
        instructions::get_dough::handler(ctx)
    }

    /// Queue MPC computation for accrued salary calculation
    /// 🔮 "Queue MPC" - Start async computation on Arcium MXE cluster
    /// 
    /// **REAL PRIVACY:** Salary stays encrypted throughout MPC computation.
    /// The result comes back via `finalize_get_dough_from_mpc_callback`.
    /// 
    /// **NOTE:** Logic is inlined here to avoid Context<T> delegation across modules,
    /// which can break Anchor's macro expansion for __client_accounts_* symbols.
    pub fn queue_get_dough_mpc(
        ctx: Context<QueueGetDoughMpc>,
        computation_offset: u64,
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
        use arcium_anchor::prelude::ArgBuilder;
        
        let encrypted_bytes: [u8; 32] = encrypted_salary.ciphertext[0..32]
            .try_into()
            .map_err(|_| error!(BagelError::InvalidAmount))?;
        
        let args = ArgBuilder::new()
            .encrypted_u8(encrypted_bytes)  // [u8; 32] - encrypted salary
            .plaintext_u64(elapsed_seconds) // u64 - elapsed seconds
            .build();
        
        msg!("   ✅ MPC inputs prepared using ArgBuilder");
        
        // Build callback instruction using macro-generated callback_ix() method
        let callback_ix = QueueGetDoughMpcCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[], // No extra accounts needed
        )?;
        
        msg!("   ✅ Callback instruction built using macro-generated callback_ix()");
        
        // Set the signer PDA bump (required by Arcium)
        // The macro generates sign_pda_account with the correct bump handling
        // Access it via the generated accounts structure
        
        // Queue the computation with callback
        queue_computation(
            &ctx.accounts,
            computation_offset,      // computation_offset (from instruction)
            args,                    // args: ArgumentList
            None,                    // callback_url: Option<String> (None for on-chain)
            vec![callback_ix],       // callback_instructions (generated by macro)
            1,                       // num_callback_txs
            1000,                    // cu_price_micro (priority fee)
        )?;
        
        msg!("   ✅ MPC computation queued on Arcium MXE cluster");
        msg!("   🔄 Waiting for callback: queue_get_dough_mpc_callback");
        
        Ok(())
    }

    /// Callback from Arcium MPC computation
    /// ✅ "Finalize MPC" - Receive signed result and complete payout
    /// 
    /// **REAL PRIVACY:** BLS signature verified, then decrypt only for final transfer.
    /// This is called automatically by Arcium's MXE cluster after computation completes.
    /// 
    /// **NOTE:** Logic is inlined here to avoid Context<T> delegation across modules.
    /// 
    /// **Arcium Requirement:** Callback function must use #[arcium_callback(encrypted_ix = "...")]
    /// and the struct must be named {InstructionName}Callback.
    #[arcium_callback(encrypted_ix = "queue_get_dough_mpc")]
    pub fn queue_get_dough_mpc_callback(
        ctx: Context<QueueGetDoughMpcCallback>,
        output: arcium_anchor::prelude::SignedComputationOutputs<crate::privacy::mpc_output::QueueGetDoughMpcOutput>,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;
        let payroll_jar = &mut ctx.accounts.payroll_jar;
        
        // Verify the computation output signature (BLS verification)
        msg!("🔍 Verifying Arcium MPC computation output (BLS signature)");
        
        let decoded = output
            .verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account)
            .map_err(|e| {
                msg!("   ❌ BLS signature verification failed: {:?}", e);
                error!(BagelError::ComputationFailed)
            })?;
        
        msg!("   ✅ MPC computation succeeded and BLS signature verified");
        msg!("   ✅ Decoded result: {} bytes", decoded.bytes.len());
        
        // Extract the encrypted result from the decoded output
        let encrypted_result_bytes = &decoded.bytes;
        
        // Decrypt the result for transfer
        let encrypted_accrued = EncryptedU64 {
            ciphertext: encrypted_result_bytes.to_vec(),
            encryption_pubkey: None,
        };
        
        // Decrypt for private transfer (this is the ONLY place we decrypt)
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
        msg!("⚡ Committing MagicBlock ER state to L1...");
        
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
        
        // Direct lamport transfer
        **payroll_jar_account_info.try_borrow_mut_lamports()? -= accrued;
        **employee_account_info.try_borrow_mut_lamports()? += accrued;
        
        msg!("✅ SOL transferred to employee! {} lamports", accrued);
        msg!("   🔒 Transfer amount was computed via MPC (private!)");
        
        // Emit privacy-preserving event (no amounts logged!)
        emit!(DoughDelivered {
            employee: ctx.accounts.employee.key(),
            bagel_jar: payroll_jar.key(),
            timestamp: current_time,
        });
        
        Ok(())
    }

    /// Update an employee's salary (employer only)
    /// 🥯 "Adjust the Recipe" - Change salary amount
    pub fn update_salary(
        ctx: Context<UpdateSalary>,
        new_salary_per_second: u64,
    ) -> Result<()> {
        instructions::update_salary::handler(ctx, new_salary_per_second)
    }

    /// Close a payroll and return remaining funds
    /// 🥯 "Empty the Jar" - Terminate payroll
    pub fn close_jar(ctx: Context<CloseJar>) -> Result<()> {
        instructions::close_jar::handler(ctx)
    }

    /// Claim excess dough (yield profit) from Kamino vault
    /// 🥯 "Harvest the Yield" - Employer claims yield while keeping principal
    pub fn claim_excess_dough(ctx: Context<ClaimExcessDough>) -> Result<()> {
        instructions::claim_excess_dough::handler(ctx)
    }
}
