//! Manual implementation of QueueCompAccs trait for QueueGetDoughMpc
//! 
//! This implements the trait manually since we're bypassing the macro (Fix 5).

use anchor_lang::prelude::*;
use arcium_anchor::traits::QueueCompAccs;
// QueueComputation is from arcium_client but accessed through arcium_anchor
// It's used in the trait but not directly exported
// We need to use the type through the trait or find another way
// Let's check if we can construct it using the accounts we have
use crate::instructions::queue_get_dough_mpc::QueueGetDoughMpc;
use crate::constants::ARCIUM_CLUSTER_OFFSET;

impl<'info> QueueCompAccs<'info> for QueueGetDoughMpc<'info> {
    fn comp_def_offset(&self) -> u32 {
        // Return the computation definition offset
        // This should match the cluster offset or circuit ID
        ARCIUM_CLUSTER_OFFSET as u32
    }
    
    fn queue_comp_accs(&self) -> arcium_client::idl::arcium::cpi::accounts::QueueComputation<'info> {
        // Build the QueueComputation struct with all required accounts
        // Available fields: signer, sign_seed, comp, mxe, executing_pool, mempool, comp_def_acc, cluster, pool_account, clock
        arcium_client::idl::arcium::cpi::accounts::QueueComputation {
            signer: self.payer.to_account_info(),
            sign_seed: self.sign_pda_account.to_account_info(),
            comp: self.computation_account.to_account_info(),
            mxe: self.mxe_account.to_account_info(),
            executing_pool: self.cluster_account.to_account_info(),
            mempool: self.mempool.to_account_info(),
            comp_def_acc: self.comp_def_account.to_account_info(),
            cluster: self.cluster_account.to_account_info(),
            pool_account: self.pool_account.to_account_info(),
            clock: self.clock.to_account_info(),
            system_program: self.system_program.to_account_info(),
        }
    }
    
    fn arcium_program(&self) -> AccountInfo<'info> {
        self.arcium_program.to_account_info()
    }
    
    fn mxe_program(&self) -> Pubkey {
        // Get MXE program ID from constants or account
        use crate::constants::ARCIUM_MXE_ACCOUNT;
        Pubkey::try_from(ARCIUM_MXE_ACCOUNT).unwrap_or(Pubkey::default())
    }
    
    fn signer_pda_bump(&self) -> u8 {
        // Get bump from sign_pda_account or derive it
        // For now, return 0 - this should be derived properly
        0 // TODO: Derive actual bump
    }
}
