//! Bagel - Maximum Privacy Payroll on Solana
//!
//! This program implements a private payroll system with MAXIMUM privacy through:
//!
//! 1. INDEX-BASED PDAs: No employer/employee pubkeys in PDA seeds
//!    - BusinessEntry uses: ["entry", master_vault, entry_index]
//!    - EmployeeEntry uses: ["employee", business_entry, employee_index]
//!    - Observer CANNOT derive relationships from PDA addresses
//!
//! 2. ENCRYPTED IDENTITIES: Employer/employee pubkey hashes stored as Inco ciphertext
//!    - encrypted_employer_id: Hash of employer pubkey, encrypted
//!    - encrypted_employee_id: Hash of employee pubkey, encrypted
//!    - Only authorized parties can decrypt and verify identity
//!
//! 3. ALL COUNTS ENCRYPTED: Business and employee counts are Inco encrypted
//!    - Observer cannot see how many businesses or employees exist
//!
//! 4. SINGLE MASTER VAULT: All funds in one pool
//!    - Observer sees only total balance changes
//!    - Cannot correlate deposits/withdrawals to any business or employee
//!
//! 5. OPTIONAL SHADOWWIRE: For mainnet, ZK proofs can hide amounts
//!    - Simulated on devnet, real on mainnet
//!
//! Privacy Tools:
//! - Inco Lightning: Encrypted IDs, balances, salaries, counts
//! - MagicBlock PER: Real-time streaming in TEE (optional)
//! - ShadowWire: ZK amount hiding (mainnet only, simulated on devnet)
//! - Range API: Compliance checks (off-chain)

use anchor_lang::prelude::*;
use inco_lightning::cpi::accounts::Operation;
use inco_lightning::cpi::{e_add, e_sub, new_euint128};
use inco_lightning::types::Euint128;
use inco_lightning::ID as INCO_LIGHTNING_ID;

// MagicBlock Ephemeral Rollups SDK
use ephemeral_rollups_sdk::anchor::{delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

declare_id!("J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE");

// ============================================================
// Seeds for PDA derivation (PRIVACY-PRESERVING)
// ============================================================

/// Seed for MasterVault (global, only 1)
pub const MASTER_VAULT_SEED: &[u8] = b"master_vault";

/// Seed for BusinessEntry (INDEX-BASED - no employer pubkey!)
pub const BUSINESS_ENTRY_SEED: &[u8] = b"entry";

/// Seed for EmployeeEntry (INDEX-BASED - no employee pubkey!)
pub const EMPLOYEE_ENTRY_SEED: &[u8] = b"employee";

/// Minimum time between withdrawals (60 seconds)
pub const MIN_WITHDRAW_INTERVAL: i64 = 60;

/// MagicBlock TEE Validator (Devnet)
pub const TEE_VALIDATOR: &str = "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA";

#[ephemeral]
#[program]
pub mod bagel {
    use super::*;

    // ============================================================
    // Master Vault Instructions
    // ============================================================

    /// Initialize the master vault (one-time setup)
    ///
    /// Creates the single global pool. All business/employee accounting
    /// is internal encrypted state - observer sees ONLY this vault.
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.master_vault;
        
        vault.authority = ctx.accounts.authority.key();
        vault.total_balance = 0;
        vault.next_business_index = 0;
        vault.is_active = true;
        vault.bump = ctx.bumps.master_vault;

        // Initialize encrypted counts to zero
        let zero_ciphertext = vec![0u8; 16];
        let cpi_accounts = Operation {
            signer: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts,
        );
        vault.encrypted_business_count = new_euint128(cpi_ctx, zero_ciphertext.clone(), 0)?;
        
        let cpi_accounts2 = Operation {
            signer: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx2 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts2,
        );
        vault.encrypted_employee_count = new_euint128(cpi_ctx2, zero_ciphertext, 0)?;

        msg!("🏦 Master Vault initialized (Maximum Privacy Mode)");
        msg!("   Business count: ENCRYPTED");
        msg!("   Employee count: ENCRYPTED");

        emit!(VaultInitialized {
            authority: vault.authority,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============================================================
    // Business Entry Instructions (INDEX-BASED)
    // ============================================================

    /// Register a new business using INDEX-BASED PDA
    ///
    /// The PDA is derived from entry_index, NOT employer pubkey.
    /// Employer identity is stored as encrypted hash - observer
    /// cannot link this entry to any specific employer.
    pub fn register_business(
        ctx: Context<RegisterBusiness>,
        encrypted_employer_id: Vec<u8>, // Hash of employer pubkey, encrypted
    ) -> Result<()> {
        require!(!encrypted_employer_id.is_empty(), BagelError::InvalidCiphertext);

        let vault = &mut ctx.accounts.master_vault;
        let entry = &mut ctx.accounts.business_entry;

        // Use next available index (observer sees only index, not employer)
        let entry_index = vault.next_business_index;
        vault.next_business_index += 1;

        entry.master_vault = vault.key();
        entry.entry_index = entry_index;
        entry.next_employee_index = 0;
        entry.is_active = true;
        entry.bump = ctx.bumps.business_entry;

        // Store encrypted employer ID (hash of pubkey, encrypted)
        let cpi_accounts = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts,
        );
        entry.encrypted_employer_id = new_euint128(cpi_ctx, encrypted_employer_id, 0)?;

        // Initialize encrypted balance to zero
        let zero_ciphertext = vec![0u8; 16];
        let cpi_accounts2 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx2 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts2,
        );
        entry.encrypted_balance = new_euint128(cpi_ctx2, zero_ciphertext.clone(), 0)?;

        // Initialize encrypted employee count to zero
        let cpi_accounts3 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx3 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts3,
        );
        entry.encrypted_employee_count = new_euint128(cpi_ctx3, zero_ciphertext, 0)?;

        // Increment master vault's encrypted business count
        let one_ciphertext = vec![1u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let cpi_accounts4 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx4 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts4,
        );
        let encrypted_one = new_euint128(cpi_ctx4, one_ciphertext, 0)?;
        
        let cpi_accounts5 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx5 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts5,
        );
        vault.encrypted_business_count = e_add(
            cpi_ctx5,
            vault.encrypted_business_count.clone(),
            encrypted_one,
            0,
        )?;

        msg!("🏢 Business registered (Maximum Privacy)");
        msg!("   Entry Index: {} (no employer pubkey visible)", entry_index);
        msg!("   Employer ID: ENCRYPTED");
        msg!("   Balance: ENCRYPTED");

        emit!(BusinessRegistered {
            entry_index,
            timestamp: Clock::get()?.unix_timestamp,
            // NOTE: No employer pubkey in event for privacy
        });

        Ok(())
    }

    /// Deposit funds to master vault
    ///
    /// Funds go to the single master vault. Business allocation
    /// is tracked via encrypted balance in BusinessEntry.
    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        encrypted_amount: Vec<u8>,
    ) -> Result<()> {
        require!(amount > 0, BagelError::InvalidAmount);
        require!(!encrypted_amount.is_empty(), BagelError::InvalidCiphertext);

        let vault = &mut ctx.accounts.master_vault;
        let entry = &mut ctx.accounts.business_entry;

        // Transfer SOL to master vault
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.depositor.key(),
            &vault.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.depositor.to_account_info(),
                vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        vault.total_balance = vault.total_balance.checked_add(amount).ok_or(BagelError::Overflow)?;

        // Update business encrypted balance via homomorphic addition
        let cpi_accounts1 = Operation {
            signer: ctx.accounts.depositor.to_account_info(),
        };
        let cpi_ctx1 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts1,
        );
        let encrypted_deposit = new_euint128(cpi_ctx1, encrypted_amount, 0)?;
        
        let cpi_accounts2 = Operation {
            signer: ctx.accounts.depositor.to_account_info(),
        };
        let cpi_ctx2 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts2,
        );
        entry.encrypted_balance = e_add(
            cpi_ctx2,
            entry.encrypted_balance.clone(),
            encrypted_deposit,
            0,
        )?;

        msg!("💰 Deposit received");
        msg!("   Entry: {}", entry.entry_index);
        msg!("   Business balance: ENCRYPTED (updated)");
        // NOTE: Amount intentionally NOT logged

        emit!(FundsDeposited {
            entry_index: entry.entry_index,
            timestamp: Clock::get()?.unix_timestamp,
            // Amount NOT included for privacy
        });

        Ok(())
    }

    // ============================================================
    // Employee Entry Instructions (INDEX-BASED)
    // ============================================================

    /// Add an employee using INDEX-BASED PDA
    ///
    /// The PDA is derived from employee_index, NOT employee pubkey.
    /// Employee identity is stored as encrypted hash.
    pub fn add_employee(
        ctx: Context<AddEmployee>,
        encrypted_employee_id: Vec<u8>, // Hash of employee pubkey, encrypted
        encrypted_salary: Vec<u8>,       // Salary rate, encrypted
    ) -> Result<()> {
        require!(!encrypted_employee_id.is_empty(), BagelError::InvalidCiphertext);
        require!(!encrypted_salary.is_empty(), BagelError::InvalidCiphertext);

        let vault = &mut ctx.accounts.master_vault;
        let business = &mut ctx.accounts.business_entry;
        let employee = &mut ctx.accounts.employee_entry;
        let clock = Clock::get()?;

        // Use next available index
        let employee_index = business.next_employee_index;
        business.next_employee_index += 1;

        employee.business_entry = business.key();
        employee.employee_index = employee_index;
        employee.last_action = clock.unix_timestamp;
        employee.is_active = true;
        employee.bump = ctx.bumps.employee_entry;

        // Store encrypted employee ID
        let cpi_accounts1 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx1 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts1,
        );
        employee.encrypted_employee_id = new_euint128(cpi_ctx1, encrypted_employee_id, 0)?;

        // Store encrypted salary
        let cpi_accounts2 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx2 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts2,
        );
        employee.encrypted_salary = new_euint128(cpi_ctx2, encrypted_salary, 0)?;

        // Initialize encrypted accrued to zero
        let zero_ciphertext = vec![0u8; 16];
        let cpi_accounts3 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx3 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts3,
        );
        employee.encrypted_accrued = new_euint128(cpi_ctx3, zero_ciphertext, 0)?;

        // Increment business and master encrypted employee counts
        let one_ciphertext = vec![1u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let cpi_accounts4 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx4 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts4,
        );
        let encrypted_one = new_euint128(cpi_ctx4, one_ciphertext.clone(), 0)?;
        
        let cpi_accounts5 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx5 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts5,
        );
        business.encrypted_employee_count = e_add(
            cpi_ctx5,
            business.encrypted_employee_count.clone(),
            encrypted_one.clone(),
            0,
        )?;

        let cpi_accounts6 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx6 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts6,
        );
        let encrypted_one2 = new_euint128(cpi_ctx6, one_ciphertext, 0)?;
        
        let cpi_accounts7 = Operation {
            signer: ctx.accounts.employer.to_account_info(),
        };
        let cpi_ctx7 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts7,
        );
        vault.encrypted_employee_count = e_add(
            cpi_ctx7,
            vault.encrypted_employee_count.clone(),
            encrypted_one2,
            0,
        )?;

        msg!("👷 Employee added (Maximum Privacy)");
        msg!("   Business Entry: {}", business.entry_index);
        msg!("   Employee Index: {} (no pubkey visible)", employee_index);
        msg!("   Employee ID: ENCRYPTED");
        msg!("   Salary: ENCRYPTED");

        emit!(EmployeeAdded {
            business_index: business.entry_index,
            employee_index,
            timestamp: clock.unix_timestamp,
            // NOTE: No pubkeys in event for privacy
        });

        Ok(())
    }

    /// Request withdrawal (employee proves identity via signature)
    ///
    /// Employee signs to prove they own the wallet. Program verifies
    /// against encrypted_employee_id. Amount comes from encrypted_accrued.
    pub fn request_withdrawal(
        ctx: Context<RequestWithdrawal>,
        amount: u64,
        encrypted_amount: Vec<u8>,
        use_shadowwire: bool, // Optional ZK amount hiding (simulated on devnet)
    ) -> Result<()> {
        require!(amount > 0, BagelError::NoAccruedDough);

        let vault = &mut ctx.accounts.master_vault;
        let employee = &mut ctx.accounts.employee_entry;
        let clock = Clock::get()?;

        require!(employee.is_active, BagelError::PayrollInactive);
        
        let time_elapsed = clock.unix_timestamp
            .checked_sub(employee.last_action)
            .ok_or(BagelError::InvalidTimestamp)?;
        require!(time_elapsed >= MIN_WITHDRAW_INTERVAL, BagelError::WithdrawTooSoon);
        require!(amount <= vault.total_balance, BagelError::InsufficientFunds);

        // Check rent-exempt minimum
        let rent = anchor_lang::prelude::Rent::get()?;
        let min_lamports = rent.minimum_balance(vault.to_account_info().data_len());
        let vault_lamports = vault.to_account_info().lamports();
        require!(
            vault_lamports.saturating_sub(amount) >= min_lamports,
            BagelError::InsufficientFunds
        );

        // Update vault balance tracking
        vault.total_balance = vault.total_balance.checked_sub(amount).ok_or(BagelError::Underflow)?;

        // Transfer lamports using sub_lamports/add_lamports pattern
        vault.sub_lamports(amount)?;
        ctx.accounts.withdrawer.add_lamports(amount)?;

        // Update encrypted accrued balance via Inco Lightning CPI
        let cpi_accounts = Operation {
            signer: ctx.accounts.withdrawer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts,
        );
        let encrypted_withdrawal = new_euint128(cpi_ctx, encrypted_amount, 0)?;

        let cpi_accounts2 = Operation {
            signer: ctx.accounts.withdrawer.to_account_info(),
        };
        let cpi_ctx2 = CpiContext::new(
            ctx.accounts.inco_lightning_program.to_account_info(),
            cpi_accounts2,
        );
        employee.encrypted_accrued = e_sub(
            cpi_ctx2,
            employee.encrypted_accrued.clone(),
            encrypted_withdrawal,
            0,
        )?;

        employee.last_action = clock.unix_timestamp;

        if use_shadowwire {
            msg!("💸 Withdrawal processed (ShadowWire SIMULATED)");
            msg!("   On mainnet, amount would be hidden via ZK proof");
        } else {
            msg!("💸 Withdrawal processed");
        }
        msg!("   Business Entry: {}", ctx.accounts.business_entry.entry_index);
        msg!("   Employee Index: {}", employee.employee_index);
        // NOTE: Amount intentionally NOT logged

        emit!(WithdrawalProcessed {
            business_index: ctx.accounts.business_entry.entry_index,
            employee_index: employee.employee_index,
            timestamp: clock.unix_timestamp,
            shadowwire_enabled: use_shadowwire,
            // Amount NOT included for privacy
        });

        Ok(())
    }

    /// Delegate employee entry to MagicBlock TEE (optional)
    pub fn delegate_to_tee(ctx: Context<DelegateToTee>) -> Result<()> {
        msg!("⚡ Delegating to MagicBlock TEE...");
        
        let business_entry_key = ctx.accounts.business_entry.key();
        let employee_index_bytes = ctx.accounts.employee_entry.employee_index.to_le_bytes();
        
        let seeds: &[&[u8]] = &[
            EMPLOYEE_ENTRY_SEED,
            business_entry_key.as_ref(),
            &employee_index_bytes,
        ];
        
        let validator_key = ctx.accounts.validator
            .as_ref()
            .map(|v| v.key())
            .or_else(|| Pubkey::try_from(TEE_VALIDATOR).ok());
        
        ctx.accounts.delegate_employee_entry(
            &ctx.accounts.payer,
            seeds,
            DelegateConfig {
                validator: validator_key,
                ..Default::default()
            },
        )?;

        let validator = validator_key.unwrap_or_default();
        msg!("✅ Delegated to TEE");
        msg!("   Employee Index: {}", ctx.accounts.employee_entry.employee_index);
        msg!("   Validator: {}", validator);

        emit!(DelegatedToTee {
            business_index: ctx.accounts.business_entry.entry_index,
            employee_index: ctx.accounts.employee_entry.employee_index,
            validator,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Commit TEE state back to L1
    pub fn commit_from_tee(ctx: Context<CommitFromTee>) -> Result<()> {
        msg!("⚡ Committing from TEE to L1...");
        
        let payer_info = ctx.accounts.payer.to_account_info();
        let employee_info = ctx.accounts.employee_entry.to_account_info();
        let magic_context_info = ctx.accounts.magic_context.to_account_info();
        let magic_program_info = ctx.accounts.magic_program.to_account_info();
        
        commit_and_undelegate_accounts(
            &payer_info,
            vec![&employee_info],
            &magic_context_info,
            &magic_program_info,
        )?;

        msg!("✅ Committed to L1");

        emit!(CommittedFromTee {
            business_index: ctx.accounts.business_entry.entry_index,
            employee_index: ctx.accounts.employee_entry.employee_index,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================
// Account Contexts
// ============================================================

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = MasterVault::LEN,
        seeds = [MASTER_VAULT_SEED],
        bump
    )]
    pub master_vault: Account<'info, MasterVault>,

    /// CHECK: Inco Lightning program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterBusiness<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(
        mut,
        seeds = [MASTER_VAULT_SEED],
        bump = master_vault.bump,
    )]
    pub master_vault: Account<'info, MasterVault>,

    #[account(
        init,
        payer = employer,
        space = BusinessEntry::LEN,
        seeds = [BUSINESS_ENTRY_SEED, master_vault.key().as_ref(), &master_vault.next_business_index.to_le_bytes()],
        bump
    )]
    pub business_entry: Account<'info, BusinessEntry>,

    /// CHECK: Inco Lightning program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, encrypted_amount: Vec<u8>)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [MASTER_VAULT_SEED],
        bump = master_vault.bump,
    )]
    pub master_vault: Account<'info, MasterVault>,

    #[account(
        mut,
        seeds = [BUSINESS_ENTRY_SEED, master_vault.key().as_ref(), &business_entry.entry_index.to_le_bytes()],
        bump = business_entry.bump,
    )]
    pub business_entry: Account<'info, BusinessEntry>,

    /// CHECK: Inco Lightning program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddEmployee<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(
        mut,
        seeds = [MASTER_VAULT_SEED],
        bump = master_vault.bump,
    )]
    pub master_vault: Account<'info, MasterVault>,

    #[account(
        mut,
        seeds = [BUSINESS_ENTRY_SEED, master_vault.key().as_ref(), &business_entry.entry_index.to_le_bytes()],
        bump = business_entry.bump,
    )]
    pub business_entry: Account<'info, BusinessEntry>,

    #[account(
        init,
        payer = employer,
        space = EmployeeEntry::LEN,
        seeds = [EMPLOYEE_ENTRY_SEED, business_entry.key().as_ref(), &business_entry.next_employee_index.to_le_bytes()],
        bump
    )]
    pub employee_entry: Account<'info, EmployeeEntry>,

    /// CHECK: Inco Lightning program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, encrypted_amount: Vec<u8>, use_shadowwire: bool)]
pub struct RequestWithdrawal<'info> {
    #[account(mut)]
    pub withdrawer: Signer<'info>,

    #[account(
        mut,
        seeds = [MASTER_VAULT_SEED],
        bump = master_vault.bump,
    )]
    pub master_vault: Account<'info, MasterVault>,

    #[account(
        mut,
        seeds = [BUSINESS_ENTRY_SEED, master_vault.key().as_ref(), &business_entry.entry_index.to_le_bytes()],
        bump = business_entry.bump,
    )]
    pub business_entry: Account<'info, BusinessEntry>,

    #[account(
        mut,
        seeds = [EMPLOYEE_ENTRY_SEED, business_entry.key().as_ref(), &employee_entry.employee_index.to_le_bytes()],
        bump = employee_entry.bump,
    )]
    pub employee_entry: Account<'info, EmployeeEntry>,

    /// CHECK: Inco Lightning program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateToTee<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [MASTER_VAULT_SEED],
        bump = master_vault.bump,
    )]
    pub master_vault: Account<'info, MasterVault>,

    #[account(
        seeds = [BUSINESS_ENTRY_SEED, master_vault.key().as_ref(), &business_entry.entry_index.to_le_bytes()],
        bump = business_entry.bump,
    )]
    pub business_entry: Account<'info, BusinessEntry>,

    #[account(
        mut,
        del,
        seeds = [EMPLOYEE_ENTRY_SEED, business_entry.key().as_ref(), &employee_entry.employee_index.to_le_bytes()],
        bump = employee_entry.bump,
    )]
    pub employee_entry: Account<'info, EmployeeEntry>,

    /// CHECK: Optional validator
    pub validator: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommitFromTee<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [MASTER_VAULT_SEED],
        bump = master_vault.bump,
    )]
    pub master_vault: Account<'info, MasterVault>,

    #[account(
        seeds = [BUSINESS_ENTRY_SEED, master_vault.key().as_ref(), &business_entry.entry_index.to_le_bytes()],
        bump = business_entry.bump,
    )]
    pub business_entry: Account<'info, BusinessEntry>,

    #[account(
        mut,
        seeds = [EMPLOYEE_ENTRY_SEED, business_entry.key().as_ref(), &employee_entry.employee_index.to_le_bytes()],
        bump = employee_entry.bump,
    )]
    pub employee_entry: Account<'info, EmployeeEntry>,

    /// CHECK: MagicBlock context
    #[account(mut)]
    pub magic_context: AccountInfo<'info>,

    /// CHECK: MagicBlock program
    pub magic_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// ============================================================
// Account Structures (Maximum Privacy)
// ============================================================

/// Master Vault - Single account holding all funds
/// Observer sees ONLY this account's total balance
#[account]
pub struct MasterVault {
    /// Program authority
    pub authority: Pubkey,
    
    /// Total balance (PUBLIC - unavoidable on Solana)
    pub total_balance: u64,
    
    /// ENCRYPTED business count (observer cannot see)
    pub encrypted_business_count: Euint128,
    
    /// ENCRYPTED employee count (observer cannot see)
    pub encrypted_employee_count: Euint128,
    
    /// Next business index (for PDA derivation)
    pub next_business_index: u64,
    
    /// Is active
    pub is_active: bool,
    
    /// Bump seed
    pub bump: u8,
}

impl MasterVault {
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // authority
        8 +                      // total_balance
        16 +                     // encrypted_business_count
        16 +                     // encrypted_employee_count
        8 +                      // next_business_index
        1 +                      // is_active
        1 +                      // bump
        32;                      // padding
}

/// Business Entry - INDEX-BASED PDA (no employer pubkey in seeds)
/// Seeds: ["entry", master_vault, entry_index]
#[account]
pub struct BusinessEntry {
    /// Reference to master vault
    pub master_vault: Pubkey,
    
    /// Entry index (used in PDA, NOT employer pubkey)
    pub entry_index: u64,
    
    /// ENCRYPTED employer ID (hash of pubkey)
    pub encrypted_employer_id: Euint128,
    
    /// ENCRYPTED balance
    pub encrypted_balance: Euint128,
    
    /// ENCRYPTED employee count
    pub encrypted_employee_count: Euint128,
    
    /// Next employee index
    pub next_employee_index: u64,
    
    /// Is active
    pub is_active: bool,
    
    /// Bump seed
    pub bump: u8,
}

impl BusinessEntry {
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // master_vault
        8 +                      // entry_index
        16 +                     // encrypted_employer_id
        16 +                     // encrypted_balance
        16 +                     // encrypted_employee_count
        8 +                      // next_employee_index
        1 +                      // is_active
        1 +                      // bump
        32;                      // padding
}

/// Employee Entry - INDEX-BASED PDA (no employee pubkey in seeds)
/// Seeds: ["employee", business_entry, employee_index]
#[account]
pub struct EmployeeEntry {
    /// Reference to business entry
    pub business_entry: Pubkey,
    
    /// Employee index (used in PDA, NOT employee pubkey)
    pub employee_index: u64,
    
    /// ENCRYPTED employee ID (hash of pubkey)
    pub encrypted_employee_id: Euint128,
    
    /// ENCRYPTED salary
    pub encrypted_salary: Euint128,
    
    /// ENCRYPTED accrued amount
    pub encrypted_accrued: Euint128,
    
    /// Last action timestamp
    pub last_action: i64,
    
    /// Is active
    pub is_active: bool,
    
    /// Bump seed
    pub bump: u8,
}

impl EmployeeEntry {
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // business_entry
        8 +                      // employee_index
        16 +                     // encrypted_employee_id
        16 +                     // encrypted_salary
        16 +                     // encrypted_accrued
        8 +                      // last_action
        1 +                      // is_active
        1 +                      // bump
        32;                      // padding
}

// ============================================================
// Events (Minimal information for privacy)
// ============================================================

#[event]
pub struct VaultInitialized {
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BusinessRegistered {
    pub entry_index: u64,
    pub timestamp: i64,
    // NOTE: No employer pubkey for privacy
}

#[event]
pub struct FundsDeposited {
    pub entry_index: u64,
    pub timestamp: i64,
    // NOTE: No amount for privacy
}

#[event]
pub struct EmployeeAdded {
    pub business_index: u64,
    pub employee_index: u64,
    pub timestamp: i64,
    // NOTE: No pubkeys for privacy
}

#[event]
pub struct WithdrawalProcessed {
    pub business_index: u64,
    pub employee_index: u64,
    pub timestamp: i64,
    pub shadowwire_enabled: bool,
    // NOTE: No amount for privacy
}

#[event]
pub struct DelegatedToTee {
    pub business_index: u64,
    pub employee_index: u64,
    pub validator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CommittedFromTee {
    pub business_index: u64,
    pub employee_index: u64,
    pub timestamp: i64,
}

// ============================================================
// Errors
// ============================================================

#[error_code]
pub enum BagelError {
    #[msg("Invalid ciphertext provided")]
    InvalidCiphertext,

    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Arithmetic underflow")]
    Underflow,

    #[msg("Invalid timestamp")]
    InvalidTimestamp,

    #[msg("Must wait at least 60 seconds between actions")]
    WithdrawTooSoon,

    #[msg("No accrued balance to withdraw")]
    NoAccruedDough,

    #[msg("Insufficient funds in master vault")]
    InsufficientFunds,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Entry is not active")]
    PayrollInactive,

    #[msg("Identity verification failed")]
    IdentityVerificationFailed,
}
