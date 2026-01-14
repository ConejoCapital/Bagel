use anchor_lang::prelude::*;

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

#[program]
pub mod bagel {
    use super::*;

    /// Initialize a new payroll for an employee with encrypted salary
    /// 🥯 "Start Baking" - Create a new BagelJar for an employee
    pub fn bake_payroll(
        ctx: Context<BakePayroll>,
        salary_per_second: u64,
    ) -> Result<()> {
        instructions::bake_payroll::handler(ctx, salary_per_second)
    }

    /// Deposit funds into the BagelJar
    /// 🥯 "Add Fresh Dough" - Fund the payroll
    pub fn deposit_dough(
        ctx: Context<DepositDough>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit_dough::handler(ctx, amount)
    }

    /// Withdraw accrued salary (private transfer via ShadowWire)
    /// 🥯 "Get Your Dough" - Employee withdraws earned salary
    pub fn get_dough(ctx: Context<GetDough>) -> Result<()> {
        instructions::get_dough::handler(ctx)
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
}
