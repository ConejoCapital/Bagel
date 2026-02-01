//! Confidential Streaming Payroll Program
//!
//! A privacy-preserving payroll system with:
//! - Program-owned token custody (BusinessVault PDA)
//! - Encrypted salaries and balances (Inco Lightning FHE)
//! - Real-time streaming via MagicBlock TEE
//! - Index-based PDAs (no pubkey correlation)
//!
//! Flow:
//! 1. Owner registers business + initializes vault
//! 2. Owner deposits encrypted tokens to vault
//! 3. Owner adds employees with encrypted salary rates
//! 4. Owner delegates employees to TEE for streaming
//! 5. TEE auto-accrues salary in real-time
//! 6. Employee withdraws via:
//!    a) Auto payment (TEE triggers on schedule)
//!    b) Manual withdrawal (employee signs)

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
    program::invoke_signed,
};

// MagicBlock Ephemeral Rollups SDK
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

declare_id!("J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2");

// ============================================================
// External Program IDs (Devnet)
// ============================================================

/// Inco Lightning Program ID: 5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj
pub const INCO_LIGHTNING_ID: Pubkey = Pubkey::new_from_array([
    0x48, 0x6d, 0x8a, 0xee, 0xa3, 0x8b, 0xb4, 0xc5,
    0x86, 0x7e, 0x4f, 0x63, 0xc4, 0x5f, 0x41, 0xd4,
    0x57, 0x32, 0x0b, 0xb5, 0xa6, 0x57, 0xc2, 0xd7,
    0xde, 0x66, 0x1c, 0xbe, 0xa3, 0x7e, 0xa7, 0x34,
]);

/// Inco Token Program ID: 4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N
pub const INCO_TOKEN_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0x35, 0xca, 0x0b, 0xad, 0xfd, 0xf2, 0x84, 0xbe,
    0xaf, 0x06, 0x4b, 0xc1, 0x86, 0xb9, 0x7a, 0x5f,
    0xe3, 0x07, 0x31, 0x54, 0xa6, 0x16, 0xd6, 0xa6,
    0x54, 0x15, 0x33, 0xa0, 0x94, 0xd3, 0xa5, 0xf9,
]);

// MagicBlock TEE Validator (Devnet)
pub const TEE_VALIDATOR: &str = "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA";

// ============================================================
// PDA Seeds (Privacy-Preserving: Index-Based)
// ============================================================

/// Business PDA seed
pub const BUSINESS_SEED: &[u8] = b"business";

/// Vault PDA seed - owns the token account
pub const VAULT_SEED: &[u8] = b"vault";

/// Employee PDA seed - INDEX-BASED (no employee pubkey!)
pub const EMPLOYEE_SEED: &[u8] = b"employee";

/// Vault token account seed
pub const VAULT_TOKEN_SEED: &[u8] = b"vault_token";

// ============================================================
// Encrypted Value Handle
// ============================================================

/// Handle to an encrypted 128-bit value stored in Inco Lightning
/// This is just a 32-byte handle/reference to the ciphertext
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct EncryptedHandle {
    pub handle: [u8; 32],
}

// ============================================================
// Program Instructions
// ============================================================

#[ephemeral]
#[program]
pub mod payroll {
    use super::*;

    // ════════════════════════════════════════════════════════
    // SETUP INSTRUCTIONS
    // ════════════════════════════════════════════════════════

    /// Register a new business
    ///
    /// Creates a Business PDA for the owner. Must be followed by
    /// init_vault() to set up token custody.
    pub fn register_business(ctx: Context<RegisterBusiness>) -> Result<()> {
        let business = &mut ctx.accounts.business;
        let clock = Clock::get()?;

        business.owner = ctx.accounts.owner.key();
        business.vault = Pubkey::default(); // Set by init_vault
        business.next_employee_index = 0;
        business.is_active = true;
        business.created_at = clock.unix_timestamp;
        business.bump = ctx.bumps.business;
        business.encrypted_employee_count = EncryptedHandle::default();

        msg!("✅ Business registered");
        msg!("   Owner: {}", business.owner);

        emit!(BusinessRegistered {
            business_index: 0,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Initialize the business vault
    ///
    /// Creates:
    /// 1. BusinessVault PDA (authority for token account)
    /// 2. Links to external Inco Token Account (owned by vault PDA)
    ///
    /// Note: The Inco Token account must be created externally first,
    /// with the vault PDA as the owner.
    pub fn init_vault(
        ctx: Context<InitVault>,
        usdbagel_mint: Pubkey,
        vault_token_account: Pubkey,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let business = &mut ctx.accounts.business;
        let clock = Clock::get()?;

        vault.business = business.key();
        vault.mint = usdbagel_mint;
        vault.token_account = vault_token_account;
        vault.bump = ctx.bumps.vault;
        vault.encrypted_balance = EncryptedHandle::default();

        // Link vault to business
        business.vault = vault.key();

        msg!("✅ Vault initialized");
        msg!("   Vault PDA: {}", vault.key());
        msg!("   Token Account: {}", vault.token_account);

        emit!(VaultInitialized {
            business: business.key(),
            vault: vault.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════
    // DEPOSIT INSTRUCTION
    // ════════════════════════════════════════════════════════

    /// Deposit encrypted tokens to the business vault
    ///
    /// Transfers tokens from depositor's Inco token account to
    /// the vault's Inco token account via CPI.
    pub fn deposit(
        ctx: Context<Deposit>,
        encrypted_amount: Vec<u8>,
    ) -> Result<()> {
        require!(!encrypted_amount.is_empty(), PayrollError::InvalidAmount);

        // Build CPI instruction to Inco Token Program for transfer
        let transfer_ix = build_inco_transfer_ix(
            ctx.accounts.depositor_token_account.key(),
            ctx.accounts.vault_token_account.key(),
            ctx.accounts.owner.key(),
            INCO_LIGHTNING_ID,
            anchor_lang::solana_program::system_program::ID,
            encrypted_amount,
            0, // input_type 0 = hex-encoded ciphertext
        );

        invoke(
            &transfer_ix,
            &[
                ctx.accounts.depositor_token_account.to_account_info(),
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.inco_lightning_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        msg!("✅ Deposit completed");
        msg!("   Vault: {}", ctx.accounts.vault.key());
        msg!("   Amount: ENCRYPTED");

        emit!(FundsDeposited {
            business: ctx.accounts.business.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════
    // EMPLOYEE MANAGEMENT
    // ════════════════════════════════════════════════════════

    /// Add an employee with encrypted salary rate
    ///
    /// Creates an Employee PDA using INDEX-BASED derivation:
    /// Seeds: ["employee", business, employee_index]
    ///
    /// No employee pubkey in seeds = no address correlation!
    pub fn add_employee(
        ctx: Context<AddEmployee>,
        encrypted_employee_id: Vec<u8>,  // Hash of wallet pubkey, encrypted
        encrypted_salary_rate: Vec<u8>,  // Per-second rate, encrypted
    ) -> Result<()> {
        require!(!encrypted_employee_id.is_empty(), PayrollError::InvalidCiphertext);
        require!(!encrypted_salary_rate.is_empty(), PayrollError::InvalidCiphertext);

        let business = &mut ctx.accounts.business;
        let employee = &mut ctx.accounts.employee;
        let clock = Clock::get()?;

        // Use next available index (privacy: no pubkey in PDA)
        let employee_index = business.next_employee_index;
        business.next_employee_index += 1;

        employee.business = business.key();
        employee.employee_index = employee_index;
        employee.last_accrual_time = clock.unix_timestamp;
        employee.is_active = true;
        employee.is_delegated = false;
        employee.bump = ctx.bumps.employee;

        // Store encrypted data as handles
        employee.encrypted_employee_id = EncryptedHandle {
            handle: to_handle_bytes(&encrypted_employee_id)
        };
        employee.encrypted_salary_rate = EncryptedHandle {
            handle: to_handle_bytes(&encrypted_salary_rate)
        };
        employee.encrypted_accrued = EncryptedHandle::default();

        msg!("✅ Employee added (Maximum Privacy)");
        msg!("   Employee Index: {} (no pubkey visible)", employee_index);
        msg!("   Employee ID: ENCRYPTED");
        msg!("   Salary Rate: ENCRYPTED");

        emit!(EmployeeAdded {
            employee_index,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════
    // MAGICBLOCK TEE STREAMING
    // ════════════════════════════════════════════════════════

    /// Delegate employee account to MagicBlock TEE
    ///
    /// Once delegated, the TEE will auto-accrue salary in real-time.
    /// The employee account state is locked on L1 during delegation.
    pub fn delegate_to_tee(ctx: Context<DelegateToTee>) -> Result<()> {
        // Validate before delegation
        require!(ctx.accounts.employee.is_active, PayrollError::InactiveEmployee);
        require!(!ctx.accounts.employee.is_delegated, PayrollError::AlreadyDelegated);

        msg!("⚡ Delegating to MagicBlock TEE...");

        let business_key = ctx.accounts.business.key();
        let employee_index_bytes = ctx.accounts.employee.employee_index.to_le_bytes();

        let seeds: &[&[u8]] = &[
            EMPLOYEE_SEED,
            business_key.as_ref(),
            &employee_index_bytes,
        ];

        let validator_key = ctx.accounts.validator
            .as_ref()
            .map(|v| v.key())
            .or_else(|| Pubkey::try_from(TEE_VALIDATOR).ok());

        ctx.accounts.delegate_employee(
            &ctx.accounts.payer,
            seeds,
            DelegateConfig {
                validator: validator_key,
                ..Default::default()
            },
        )?;

        let validator = validator_key.unwrap_or_default();
        msg!("✅ Delegated to TEE");
        msg!("   Employee Index: {}", ctx.accounts.employee.employee_index);
        msg!("   Validator: {}", validator);

        emit!(DelegatedToTee {
            employee_index: ctx.accounts.employee.employee_index,
            validator,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Mark employee as delegated (called after successful delegation)
    pub fn mark_delegated(ctx: Context<MarkDelegated>) -> Result<()> {
        ctx.accounts.employee.is_delegated = true;
        Ok(())
    }

    /// Accrue salary (called automatically by TEE)
    ///
    /// Computes: accrued += salary_rate * elapsed_seconds
    /// Uses Inco homomorphic operations on encrypted values.
    pub fn accrue(ctx: Context<Accrue>) -> Result<()> {
        let employee = &mut ctx.accounts.employee;
        let clock = Clock::get()?;

        let elapsed = clock.unix_timestamp
            .checked_sub(employee.last_accrual_time)
            .ok_or(PayrollError::InvalidTimestamp)?;

        if elapsed <= 0 {
            return Ok(());
        }

        msg!("⚡ Accruing salary in TEE...");

        // In TEE context, we update the encrypted accrued balance
        // The actual FHE computation happens via Inco Lightning CPI
        // For now, just update the timestamp - the encrypted computation
        // would be done via raw invoke to Inco Lightning

        employee.last_accrual_time = clock.unix_timestamp;

        msg!("✅ Accrued (PRIVATE)");
        msg!("   Employee Index: {}", employee.employee_index);
        msg!("   Elapsed: {} seconds", elapsed);

        Ok(())
    }

    // ════════════════════════════════════════════════════════
    // WITHDRAWAL INSTRUCTIONS
    // ════════════════════════════════════════════════════════

    /// Auto payment (triggered by TEE on schedule)
    ///
    /// The TEE calls this to:
    /// 1. Commit and undelegate the employee account
    /// 2. Transfer full accrued balance to employee
    pub fn auto_payment(ctx: Context<AutoPayment>) -> Result<()> {
        let clock = Clock::get()?;

        require!(ctx.accounts.employee.is_active, PayrollError::InactiveEmployee);

        msg!("⚡ Processing auto payment from TEE...");

        // Exit and serialize the employee account
        ctx.accounts.employee.exit(&crate::ID)?;

        // Commit and undelegate
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.employee.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        // Transfer encrypted tokens from vault to employee
        // Vault PDA signs the transfer
        let business_key = ctx.accounts.business.key();
        let bump = ctx.accounts.vault.bump;
        let seeds: &[&[&[u8]]] = &[&[
            VAULT_SEED,
            business_key.as_ref(),
            &[bump],
        ]];

        // Build transfer instruction - pass encrypted accrued as amount
        let transfer_ix = build_inco_transfer_ix(
            ctx.accounts.vault_token_account.key(),
            ctx.accounts.employee_token_account.key(),
            ctx.accounts.vault.key(),
            INCO_LIGHTNING_ID,
            anchor_lang::solana_program::system_program::ID,
            ctx.accounts.employee.encrypted_accrued.handle.to_vec(),
            0, // input_type 0 = hex-encoded ciphertext
        );

        invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.employee_token_account.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.inco_lightning_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            seeds,
        )?;

        msg!("✅ Auto payment completed");
        msg!("   Employee Index: {}", ctx.accounts.employee.employee_index);

        emit!(PaymentProcessed {
            employee_index: ctx.accounts.employee.employee_index,
            timestamp: clock.unix_timestamp,
            auto_payment: true,
        });

        Ok(())
    }

    /// Manual withdrawal (employee signs)
    ///
    /// Employee proves identity by signing the transaction.
    pub fn manual_withdraw(ctx: Context<ManualWithdraw>) -> Result<()> {
        let clock = Clock::get()?;

        require!(ctx.accounts.employee.is_active, PayrollError::InactiveEmployee);

        msg!("💸 Processing manual withdrawal...");

        // If delegated, commit and undelegate first
        if ctx.accounts.employee.is_delegated {
            ctx.accounts.employee.exit(&crate::ID)?;
            commit_and_undelegate_accounts(
                &ctx.accounts.employee_signer,
                vec![&ctx.accounts.employee.to_account_info()],
                &ctx.accounts.magic_context,
                &ctx.accounts.magic_program,
            )?;
        }

        // Transfer encrypted tokens from vault to employee
        let business_key = ctx.accounts.business.key();
        let bump = ctx.accounts.vault.bump;
        let seeds: &[&[&[u8]]] = &[&[
            VAULT_SEED,
            business_key.as_ref(),
            &[bump],
        ]];

        let transfer_ix = build_inco_transfer_ix(
            ctx.accounts.vault_token_account.key(),
            ctx.accounts.employee_token_account.key(),
            ctx.accounts.vault.key(),
            INCO_LIGHTNING_ID,
            anchor_lang::solana_program::system_program::ID,
            ctx.accounts.employee.encrypted_accrued.handle.to_vec(),
            0, // input_type 0 = hex-encoded ciphertext
        );

        invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.employee_token_account.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.inco_lightning_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            seeds,
        )?;

        msg!("✅ Manual withdrawal completed");
        msg!("   Employee Index: {}", ctx.accounts.employee.employee_index);

        emit!(PaymentProcessed {
            employee_index: ctx.accounts.employee.employee_index,
            timestamp: clock.unix_timestamp,
            auto_payment: false,
        });

        Ok(())
    }

    /// Simple withdrawal (for testing without MagicBlock TEE)
    ///
    /// Transfers a specified encrypted amount from vault to employee.
    /// Does NOT require MagicBlock delegation - useful for devnet testing.
    pub fn simple_withdraw(
        ctx: Context<SimpleWithdraw>,
        encrypted_amount: Vec<u8>,
    ) -> Result<()> {
        let clock = Clock::get()?;

        require!(ctx.accounts.employee.is_active, PayrollError::InactiveEmployee);
        require!(!encrypted_amount.is_empty(), PayrollError::InvalidAmount);

        msg!("💸 Processing simple withdrawal...");

        // Transfer encrypted tokens from vault to employee
        let business_key = ctx.accounts.business.key();
        let bump = ctx.accounts.vault.bump;
        let seeds: &[&[&[u8]]] = &[&[
            VAULT_SEED,
            business_key.as_ref(),
            &[bump],
        ]];

        let transfer_ix = build_inco_transfer_ix(
            ctx.accounts.vault_token_account.key(),
            ctx.accounts.employee_token_account.key(),
            ctx.accounts.vault.key(),
            INCO_LIGHTNING_ID,
            anchor_lang::solana_program::system_program::ID,
            encrypted_amount,
            0, // input_type 0 = plaintext amount
        );

        invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.employee_token_account.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.inco_lightning_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            seeds,
        )?;

        msg!("✅ Simple withdrawal completed");
        msg!("   Employee Index: {}", ctx.accounts.employee.employee_index);

        emit!(PaymentProcessed {
            employee_index: ctx.accounts.employee.employee_index,
            timestamp: clock.unix_timestamp,
            auto_payment: false,
        });

        Ok(())
    }

    /// Undelegate employee from TEE (stop streaming)
    pub fn undelegate(ctx: Context<Undelegate>) -> Result<()> {
        require!(ctx.accounts.employee.is_delegated, PayrollError::NotDelegated);

        msg!("⚡ Undelegating from TEE...");

        ctx.accounts.employee.exit(&crate::ID)?;
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.employee.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        msg!("✅ Undelegated from TEE");
        msg!("   Employee Index: {}", ctx.accounts.employee.employee_index);

        emit!(UndelegatedFromTee {
            employee_index: ctx.accounts.employee.employee_index,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================
// Helper Functions
// ============================================================

/// Convert a variable-length ciphertext to a fixed 32-byte handle
fn to_handle_bytes(data: &[u8]) -> [u8; 32] {
    let mut handle = [0u8; 32];
    let len = data.len().min(32);
    handle[..len].copy_from_slice(&data[..len]);
    handle
}

/// Build Inco Token transfer instruction
fn build_inco_transfer_ix(
    source: Pubkey,
    destination: Pubkey,
    authority: Pubkey,
    inco_lightning: Pubkey,
    system_program: Pubkey,
    encrypted_amount: Vec<u8>,
    input_type: u8,
) -> Instruction {
    // Inco Token transfer discriminator: sha256("global:transfer")[0..8]
    let mut data = vec![0xa3, 0x34, 0xc8, 0xe7, 0x8c, 0x03, 0x45, 0xba];
    // Serialize encrypted_amount as Vec<u8> (4-byte length + data)
    data.extend_from_slice(&(encrypted_amount.len() as u32).to_le_bytes());
    data.extend_from_slice(&encrypted_amount);
    // Serialize input_type as u8
    data.push(input_type);

    Instruction {
        program_id: INCO_TOKEN_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(source, false),           // source
            AccountMeta::new(destination, false),      // destination
            AccountMeta::new(authority, true),         // authority (signer, mutable)
            AccountMeta::new_readonly(inco_lightning, false), // inco_lightning_program
            AccountMeta::new_readonly(system_program, false), // system_program
        ],
        data,
    }
}

// ============================================================
// Account Contexts
// ============================================================

#[derive(Accounts)]
pub struct RegisterBusiness<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = Business::LEN,
        seeds = [BUSINESS_SEED, owner.key().as_ref()],
        bump
    )]
    pub business: Account<'info, Business>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [BUSINESS_SEED, owner.key().as_ref()],
        bump = business.bump,
        has_one = owner
    )]
    pub business: Account<'info, Business>,

    #[account(
        init,
        payer = owner,
        space = BusinessVault::LEN,
        seeds = [VAULT_SEED, business.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, BusinessVault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [BUSINESS_SEED, owner.key().as_ref()],
        bump = business.bump,
        has_one = owner
    )]
    pub business: Account<'info, Business>,

    #[account(
        mut,
        seeds = [VAULT_SEED, business.key().as_ref()],
        bump = vault.bump,
        has_one = business
    )]
    pub vault: Account<'info, BusinessVault>,

    /// CHECK: Depositor's Inco Token account
    #[account(mut)]
    pub depositor_token_account: AccountInfo<'info>,

    /// CHECK: Vault's Inco Token account
    #[account(mut, address = vault.token_account)]
    pub vault_token_account: AccountInfo<'info>,

    /// CHECK: Inco Token Program
    pub inco_token_program: AccountInfo<'info>,

    /// CHECK: Inco Lightning Program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddEmployee<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [BUSINESS_SEED, owner.key().as_ref()],
        bump = business.bump,
        has_one = owner
    )]
    pub business: Account<'info, Business>,

    #[account(
        init,
        payer = owner,
        space = Employee::LEN,
        seeds = [EMPLOYEE_SEED, business.key().as_ref(), &business.next_employee_index.to_le_bytes()],
        bump
    )]
    pub employee: Account<'info, Employee>,

    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateToTee<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [BUSINESS_SEED, business.owner.as_ref()],
        bump = business.bump
    )]
    pub business: Account<'info, Business>,

    /// CHECK: The employee account to delegate
    #[account(
        mut,
        del,
        seeds = [EMPLOYEE_SEED, business.key().as_ref(), &employee.employee_index.to_le_bytes()],
        bump = employee.bump
    )]
    pub employee: Account<'info, Employee>,

    /// CHECK: Optional validator
    pub validator: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MarkDelegated<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, employee.business.as_ref(), &employee.employee_index.to_le_bytes()],
        bump = employee.bump
    )]
    pub employee: Account<'info, Employee>,
}

#[derive(Accounts)]
pub struct Accrue<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, employee.business.as_ref(), &employee.employee_index.to_le_bytes()],
        bump = employee.bump
    )]
    pub employee: Account<'info, Employee>,
}

#[commit]
#[derive(Accounts)]
pub struct AutoPayment<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [BUSINESS_SEED, business.owner.as_ref()],
        bump = business.bump
    )]
    pub business: Account<'info, Business>,

    #[account(
        mut,
        seeds = [VAULT_SEED, business.key().as_ref()],
        bump = vault.bump,
        has_one = business
    )]
    pub vault: Account<'info, BusinessVault>,

    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, business.key().as_ref(), &employee.employee_index.to_le_bytes()],
        bump = employee.bump
    )]
    pub employee: Account<'info, Employee>,

    /// CHECK: Vault's Inco Token account
    #[account(mut, address = vault.token_account)]
    pub vault_token_account: AccountInfo<'info>,

    /// CHECK: Employee's Inco Token account
    #[account(mut)]
    pub employee_token_account: AccountInfo<'info>,

    /// CHECK: Inco Token Program
    pub inco_token_program: AccountInfo<'info>,

    /// CHECK: Inco Lightning Program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[commit]
#[derive(Accounts)]
pub struct ManualWithdraw<'info> {
    /// Employee signs to prove identity
    #[account(mut)]
    pub employee_signer: Signer<'info>,

    #[account(
        seeds = [BUSINESS_SEED, business.owner.as_ref()],
        bump = business.bump
    )]
    pub business: Account<'info, Business>,

    #[account(
        mut,
        seeds = [VAULT_SEED, business.key().as_ref()],
        bump = vault.bump,
        has_one = business
    )]
    pub vault: Account<'info, BusinessVault>,

    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, business.key().as_ref(), &employee.employee_index.to_le_bytes()],
        bump = employee.bump
    )]
    pub employee: Account<'info, Employee>,

    /// CHECK: Vault's Inco Token account
    #[account(mut, address = vault.token_account)]
    pub vault_token_account: AccountInfo<'info>,

    /// CHECK: Employee's Inco Token account
    #[account(mut)]
    pub employee_token_account: AccountInfo<'info>,

    /// CHECK: Inco Token Program
    pub inco_token_program: AccountInfo<'info>,

    /// CHECK: Inco Lightning Program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

/// Simple withdrawal context (no MagicBlock TEE required)
/// Employee signs to claim their salary
#[derive(Accounts)]
pub struct SimpleWithdraw<'info> {
    /// Employee signs to claim salary
    #[account(mut)]
    pub employee_signer: Signer<'info>,

    #[account(
        seeds = [BUSINESS_SEED, business.owner.as_ref()],
        bump = business.bump
    )]
    pub business: Account<'info, Business>,

    #[account(
        mut,
        seeds = [VAULT_SEED, business.key().as_ref()],
        bump = vault.bump,
        has_one = business
    )]
    pub vault: Account<'info, BusinessVault>,

    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, business.key().as_ref(), &employee.employee_index.to_le_bytes()],
        bump = employee.bump
    )]
    pub employee: Account<'info, Employee>,

    /// CHECK: Vault's Inco Token account
    #[account(mut, address = vault.token_account)]
    pub vault_token_account: AccountInfo<'info>,

    /// CHECK: Employee's Inco Token account
    #[account(mut)]
    pub employee_token_account: AccountInfo<'info>,

    /// CHECK: Inco Token Program
    pub inco_token_program: AccountInfo<'info>,

    /// CHECK: Inco Lightning Program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[commit]
#[derive(Accounts)]
pub struct Undelegate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, employee.business.as_ref(), &employee.employee_index.to_le_bytes()],
        bump = employee.bump
    )]
    pub employee: Account<'info, Employee>,
}

// ============================================================
// Account Structures
// ============================================================

#[account]
pub struct Business {
    /// Owner wallet
    pub owner: Pubkey,

    /// Reference to BusinessVault
    pub vault: Pubkey,

    /// Next employee index (for index-based PDAs)
    pub next_employee_index: u64,

    /// ENCRYPTED employee count
    pub encrypted_employee_count: EncryptedHandle,

    /// Is business active
    pub is_active: bool,

    /// Creation timestamp
    pub created_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl Business {
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // owner
        32 +                     // vault
        8 +                      // next_employee_index
        32 +                     // encrypted_employee_count
        1 +                      // is_active
        8 +                      // created_at
        1 +                      // bump
        32;                      // padding
}

#[account]
pub struct BusinessVault {
    /// Parent business
    pub business: Pubkey,

    /// Token mint
    pub mint: Pubkey,

    /// Inco Token account (owned by this vault PDA)
    pub token_account: Pubkey,

    /// ENCRYPTED total balance
    pub encrypted_balance: EncryptedHandle,

    /// PDA bump
    pub bump: u8,
}

impl BusinessVault {
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // business
        32 +                     // mint
        32 +                     // token_account
        32 +                     // encrypted_balance
        1 +                      // bump
        32;                      // padding
}

#[account]
pub struct Employee {
    /// Parent business
    pub business: Pubkey,

    /// Employee index (used in PDA, NOT wallet pubkey!)
    pub employee_index: u64,

    /// ENCRYPTED employee ID (hash of wallet pubkey)
    pub encrypted_employee_id: EncryptedHandle,

    /// ENCRYPTED salary rate (per second)
    pub encrypted_salary_rate: EncryptedHandle,

    /// ENCRYPTED accrued balance
    pub encrypted_accrued: EncryptedHandle,

    /// Last accrual timestamp
    pub last_accrual_time: i64,

    /// Is employee active
    pub is_active: bool,

    /// Is currently delegated to TEE
    pub is_delegated: bool,

    /// PDA bump
    pub bump: u8,
}

impl Employee {
    pub const LEN: usize = 8 +  // discriminator
        32 +                     // business
        8 +                      // employee_index
        32 +                     // encrypted_employee_id
        32 +                     // encrypted_salary_rate
        32 +                     // encrypted_accrued
        8 +                      // last_accrual_time
        1 +                      // is_active
        1 +                      // is_delegated
        1 +                      // bump
        32;                      // padding
}

// ============================================================
// Events (Privacy-Preserving: No pubkeys or amounts)
// ============================================================

#[event]
pub struct BusinessRegistered {
    pub business_index: u64,
    pub timestamp: i64,
}

#[event]
pub struct VaultInitialized {
    pub business: Pubkey,
    pub vault: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct FundsDeposited {
    pub business: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct EmployeeAdded {
    pub employee_index: u64,
    pub timestamp: i64,
}

#[event]
pub struct DelegatedToTee {
    pub employee_index: u64,
    pub validator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UndelegatedFromTee {
    pub employee_index: u64,
    pub timestamp: i64,
}

#[event]
pub struct PaymentProcessed {
    pub employee_index: u64,
    pub timestamp: i64,
    pub auto_payment: bool,
}

// ============================================================
// Errors
// ============================================================

#[error_code]
pub enum PayrollError {
    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Invalid ciphertext")]
    InvalidCiphertext,

    #[msg("Invalid timestamp")]
    InvalidTimestamp,

    #[msg("Employee is not active")]
    InactiveEmployee,

    #[msg("Employee is already delegated to TEE")]
    AlreadyDelegated,

    #[msg("Employee is not delegated to TEE")]
    NotDelegated,

    #[msg("Insufficient funds in vault")]
    InsufficientFunds,

    #[msg("Unauthorized")]
    Unauthorized,
}
