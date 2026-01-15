use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

// Program modules
pub mod constants;
pub mod error;
pub mod instructions;
pub mod privacy; // Privacy SDK integration layer
pub mod state;

// Re-export for convenience
pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use privacy::*; // Privacy utilities
pub use state::*;

declare_id!("8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU");

// ⚡ MAGICBLOCK: Enable Ephemeral Rollup support
// This allows the PayrollJar to stream on MagicBlock ER for sub-second precision
use ephemeral_rollups_sdk::anchor::{ephemeral, commit, delegate};

// 🔮 ARCIUM: Use #[arcium_program] instead of #[program] for Arcium integration
// This generates the necessary client account helpers and callback instruction builders
#[ephemeral]
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
    /// The actual payout happens in `finalize_get_dough_from_mpc_callback`.
    pub fn get_dough(ctx: Context<GetDough>) -> Result<()> {
        instructions::get_dough::handler(ctx)
    }

    /// Queue MPC computation for accrued salary calculation
    /// 🔮 "Queue MPC" - Start async computation on Arcium MXE cluster
    /// 
    /// **REAL PRIVACY:** Salary stays encrypted throughout MPC computation.
    /// The result comes back via `finalize_get_dough_from_mpc_callback`.
    pub fn queue_get_dough_mpc(
        ctx: Context<QueueGetDoughMpc>,
        computation_offset: u64,
        elapsed_seconds: u64,
    ) -> Result<()> {
        instructions::queue_get_dough_mpc::handler(ctx, computation_offset, elapsed_seconds)
    }

    /// Callback from Arcium MPC computation
    /// ✅ "Finalize MPC" - Receive signed result and complete payout
    /// 
    /// **REAL PRIVACY:** BLS signature verified, then decrypt only for final transfer.
    /// This is called automatically by Arcium's MXE cluster after computation completes.
    pub fn finalize_get_dough_from_mpc_callback(
        ctx: Context<FinalizeGetDoughFromMpcCallback>,
        output: arcium_anchor::prelude::SignedComputationOutputs<crate::privacy::mpc_output::GetDoughMpcOut>,
    ) -> Result<()> {
        instructions::finalize_get_dough_from_mpc_callback::handler(ctx, output)
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
