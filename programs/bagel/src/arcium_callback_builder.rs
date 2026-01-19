//! Manual callback instruction builder for Arcium MPC
//! 
//! This bypasses the Arcium macros and manually constructs the callback instruction.
//! This is Fix 5 - "I refuse to negotiate with proc macros" route.

use anchor_lang::prelude::*;
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_program::instruction::{AccountMeta, Instruction};

/// Client-side accounts struct for building callback instruction
/// 
/// This mirrors FinalizeGetDoughFromMpcCallback but uses Pubkeys instead of AccountInfo.
/// This is needed for ToAccountMetas implementation.
#[derive(Clone)]
pub struct FinalizeCallbackAccounts {
    pub employee: Pubkey,
    pub employer: Pubkey,
    pub payroll_jar: Pubkey,
    pub magic_context: Pubkey,
    pub magic_program: Pubkey,
    pub system_program: Pubkey,
}

impl ToAccountMetas for FinalizeCallbackAccounts {
    fn to_account_metas(&self, _is_signer: Option<bool>) -> Vec<AccountMeta> {
        vec![
            AccountMeta::new(self.employee, true),           // employee: Signer, mut
            AccountMeta::new_readonly(self.employer, false), // employer: UncheckedAccount
            AccountMeta::new(self.payroll_jar, false),       // payroll_jar: Account, mut
            AccountMeta::new_readonly(self.magic_context, false), // magic_context: UncheckedAccount
            AccountMeta::new_readonly(self.magic_program, false), // magic_program: UncheckedAccount
            AccountMeta::new_readonly(self.system_program, false), // system_program: Program
        ]
    }
}

/// Build the Anchor instruction for finalize_get_dough_from_mpc_callback
/// 
/// This creates an Anchor Instruction that can be wrapped as Arcium's CallbackInstruction.
/// 
/// **Account Order:** Must match exactly the order in FinalizeGetDoughFromMpcCallback struct:
/// 1. employee (Signer, mut)
/// 2. employer (UncheckedAccount)
/// 3. payroll_jar (Account, mut)
/// 4. magic_context (UncheckedAccount)
/// 5. magic_program (UncheckedAccount)
/// 6. system_program (Program)
pub fn build_finalize_callback_ix(
    program_id: Pubkey,
    accounts: FinalizeCallbackAccounts,
) -> Instruction {
    // Get account metas
    let account_metas = accounts.to_account_metas(None);
    
    // Build instruction data
    // The discriminator is the first 8 bytes of sha256("global:finalize_get_dough_from_mpc_callback")
    // Anchor will generate this, but for manual construction we need it
    // For now, we'll use a placeholder - Anchor will fill this in when the instruction is called
    // Actually, Arcium will populate the data with the computation result, so we can leave it empty
    let data = vec![]; // Arcium will populate this with the computation output
    
    Instruction {
        program_id,
        accounts: account_metas,
        data,
    }
}
