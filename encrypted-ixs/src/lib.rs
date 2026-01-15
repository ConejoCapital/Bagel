// 🥯 Bagel Payroll MPC Circuit (Arcium v0.6.1)
// 
// This Arcium MPC circuit calculates accrued salary in a privacy-preserving way.
// 
// **VERSION:** Arcium v0.6.1 (with arcis-imports 0.6.1)
// 
// **PURPOSE:**
// Calculate: accrued_amount = salary_per_second * elapsed_seconds
// WITHOUT revealing the salary amount to anyone (including the MPC nodes!)
//
// **HOW IT WORKS:**
// 1. Employer encrypts salary_per_second when creating payroll
// 2. This encrypted value is stored on-chain in the BagelJar
// 3. When employee withdraws, we pass:
//    - encrypted_salary_per_second (confidential input)
//    - elapsed_seconds (public input - time is not secret)
// 4. MPC nodes compute the multiplication WITHOUT decrypting
// 5. Result is encrypted_accrued_amount
// 6. Only the employee can decrypt (using their private key)

use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    /// Input structure for payroll calculation
    pub struct PayrollInput {
        /// Encrypted salary per second (confidential)
        pub salary_per_second: u64,
        /// Elapsed seconds since last withdrawal (public)
        pub elapsed_seconds: u64,
    }

    /// Encrypted instruction: Calculate accrued salary
    /// 
    /// This instruction runs on Arcium's MPC cluster, computing:
    /// accrued_amount = salary_per_second * elapsed_seconds
    /// 
    /// Both inputs are encrypted, and the result is also encrypted.
    /// The MPC nodes never see the actual salary amount.
    #[instruction]
    pub fn queue_get_dough_mpc(input_ctxt: Enc<Shared, PayrollInput>) -> Enc<Shared, u64> {
        let input = input_ctxt.to_arcis();
        
        // Calculate accrued amount: salary_per_second * elapsed_seconds
        // This multiplication happens in encrypted form on the MPC cluster
        let accrued: u64 = input.salary_per_second * input.elapsed_seconds;
        
        // Return encrypted result
        input_ctxt.owner.from_arcis(accrued)
    }
}
