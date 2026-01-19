// Minimal reproduction test for Arcium macro
// This isolates the sign_pda_account field to see if the macro accepts it in isolation

use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use crate::error::BagelError;

#[queue_computation_accounts("dummy", payer)]
#[derive(Accounts)]
pub struct DummyQueue<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,

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
        address = derive_comp_pda!(0u64, mxe_account, BagelError::InvalidState)
    )]
    pub computation_account: UncheckedAccount<'info>,
    
    #[account(address = derive_comp_def_pda!(0u32))]
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
}
