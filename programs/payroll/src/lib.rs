//! Confidential Payroll Program
//!
//! Integrates with Inco Confidential Token Program for privacy-preserving payroll.
//!
//! Features:
//! - Register business with confidential token account
//! - Deposit encrypted funds via CPI to Inco Token Program
//! - Add employees with salary configuration
//! - Pay employees with encrypted transfers
//!
//! Token Integration:
//! - Uses existing USDBagel mint (GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt)
//! - Uses existing Inco Token Program (4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N)
//! - Resolves token accounts from Bagel PDA registry

use anchor_lang::prelude::*;
use anchor_lang::solana_program;

declare_id!("J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2");

// External Program IDs
pub const BAGEL_PROGRAM_ID: Pubkey = solana_program::pubkey!("AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj");
pub const INCO_TOKEN_PROGRAM_ID: Pubkey = solana_program::pubkey!("4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N");
pub const INCO_LIGHTNING_ID: Pubkey = solana_program::pubkey!("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");
pub const USDBAGEL_MINT: Pubkey = solana_program::pubkey!("GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt");

// PDA Seeds
pub const BUSINESS_SEED: &[u8] = b"business";
pub const EMPLOYEE_SEED: &[u8] = b"employee";

#[program]
pub mod payroll {
    use super::*;

    /// Register a business for payroll
    ///
    /// Creates a Business account linked to employer's confidential token account.
    /// The token account is resolved from the Bagel PDA registry.
    pub fn register_business(ctx: Context<RegisterBusiness>) -> Result<()> {
        let business = &mut ctx.accounts.business;
        let clock = Clock::get()?;

        business.owner = ctx.accounts.owner.key();
        business.token_account = ctx.accounts.owner_token_account.key();
        business.total_deposited = 0;
        business.employee_count = 0;
        business.is_active = true;
        business.created_at = clock.unix_timestamp;
        business.bump = ctx.bumps.business;

        msg!("✅ Business registered");
        msg!("   Owner: {}", business.owner);
        msg!("   Token Account: {}", business.token_account);

        emit!(BusinessRegistered {
            owner: business.owner,
            token_account: business.token_account,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Deposit confidential funds to business payroll
    ///
    /// Uses CPI to Inco Token Program to transfer encrypted USDBagel tokens
    /// from employer's token account to business vault token account.
    ///
    /// The amount is encrypted using @inco/solana-sdk on the client side.
    pub fn deposit(
        ctx: Context<Deposit>,
        encrypted_amount: Vec<u8>,
    ) -> Result<()> {
        require!(!encrypted_amount.is_empty(), PayrollError::InvalidAmount);

        let business = &mut ctx.accounts.business;

        // Build CPI to Inco Token Program for confidential transfer
        let transfer_accounts = vec![
            ctx.accounts.from_token_account.to_account_info(),
            ctx.accounts.to_token_account.to_account_info(),
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.inco_lightning_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ];

        // Build instruction data: discriminator + length + encrypted_amount + input_type
        let discriminator = &[163, 52, 200, 231, 140, 3, 69, 186]; // transfer discriminator
        let length_bytes = (encrypted_amount.len() as u32).to_le_bytes();
        let input_type = &[1u8]; // 1 = raw bytes from hexToBuffer

        let mut instruction_data = Vec::new();
        instruction_data.extend_from_slice(discriminator);
        instruction_data.extend_from_slice(&length_bytes);
        instruction_data.extend_from_slice(&encrypted_amount);
        instruction_data.extend_from_slice(input_type);

        let transfer_instruction = solana_program::instruction::Instruction {
            program_id: INCO_TOKEN_PROGRAM_ID,
            accounts: vec![
                solana_program::instruction::AccountMeta::new(
                    ctx.accounts.from_token_account.key(),
                    false,
                ),
                solana_program::instruction::AccountMeta::new(
                    ctx.accounts.to_token_account.key(),
                    false,
                ),
                solana_program::instruction::AccountMeta::new(
                    ctx.accounts.owner.key(),
                    true,
                ),
                solana_program::instruction::AccountMeta::new_readonly(
                    INCO_LIGHTNING_ID,
                    false,
                ),
                solana_program::instruction::AccountMeta::new_readonly(
                    solana_program::system_program::ID,
                    false,
                ),
            ],
            data: instruction_data,
        };

        solana_program::program::invoke(
            &transfer_instruction,
            &transfer_accounts,
        )?;

        business.total_deposited = business.total_deposited.saturating_add(1); // Count deposits

        msg!("✅ Confidential deposit completed");
        msg!("   Business: {}", business.key());
        msg!("   Amount: ENCRYPTED");

        emit!(FundsDeposited {
            business: business.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Add an employee to the business
    ///
    /// Creates an Employee account linked to the employee's confidential token account.
    /// The token account is resolved from the Bagel PDA registry.
    pub fn add_employee(
        ctx: Context<AddEmployee>,
        employee_wallet: Pubkey,
        salary_per_period: u64,
    ) -> Result<()> {
        require!(salary_per_period > 0, PayrollError::InvalidAmount);

        let business = &mut ctx.accounts.business;
        let employee = &mut ctx.accounts.employee;
        let clock = Clock::get()?;

        employee.business = business.key();
        employee.wallet = employee_wallet;
        employee.token_account = ctx.accounts.employee_token_account.key();
        employee.salary_per_period = salary_per_period;
        employee.last_payment = 0;
        employee.total_paid = 0;
        employee.is_active = true;
        employee.created_at = clock.unix_timestamp;
        employee.bump = ctx.bumps.employee;

        business.employee_count = business.employee_count.saturating_add(1);

        msg!("✅ Employee added");
        msg!("   Employee: {}", employee.wallet);
        msg!("   Salary: {} (encrypted on payment)", salary_per_period);
        msg!("   Token Account: {}", employee.token_account);

        emit!(EmployeeAdded {
            business: business.key(),
            employee: employee.wallet,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Pay an employee (confidential withdrawal)
    ///
    /// Uses CPI to Inco Token Program to transfer encrypted USDBagel tokens
    /// from business vault to employee's token account.
    ///
    /// The amount is encrypted using @inco/solana-sdk on the client side.
    /// Note: Owner must sign as they own the vault token account.
    pub fn pay_employee(
        ctx: Context<PayEmployee>,
        encrypted_amount: Vec<u8>,
    ) -> Result<()> {
        require!(!encrypted_amount.is_empty(), PayrollError::InvalidAmount);

        let employee = &mut ctx.accounts.employee;
        let business = &ctx.accounts.business;
        let clock = Clock::get()?;

        require!(employee.is_active, PayrollError::InactiveEmployee);

        // Build CPI to Inco Token Program for confidential transfer
        // Owner signs as they own the vault token account
        let transfer_accounts = vec![
            ctx.accounts.from_token_account.to_account_info(),
            ctx.accounts.to_token_account.to_account_info(),
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.inco_lightning_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ];

        // Build instruction data: discriminator + length + encrypted_amount + input_type
        let discriminator = &[163, 52, 200, 231, 140, 3, 69, 186]; // transfer discriminator
        let length_bytes = (encrypted_amount.len() as u32).to_le_bytes();
        let input_type = &[1u8]; // 1 = raw bytes from hexToBuffer

        let mut instruction_data = Vec::new();
        instruction_data.extend_from_slice(discriminator);
        instruction_data.extend_from_slice(&length_bytes);
        instruction_data.extend_from_slice(&encrypted_amount);
        instruction_data.extend_from_slice(input_type);

        let transfer_instruction = solana_program::instruction::Instruction {
            program_id: INCO_TOKEN_PROGRAM_ID,
            accounts: vec![
                solana_program::instruction::AccountMeta::new(
                    ctx.accounts.from_token_account.key(),
                    false,
                ),
                solana_program::instruction::AccountMeta::new(
                    ctx.accounts.to_token_account.key(),
                    false,
                ),
                solana_program::instruction::AccountMeta::new(
                    ctx.accounts.owner.key(),
                    true,
                ),
                solana_program::instruction::AccountMeta::new_readonly(
                    INCO_LIGHTNING_ID,
                    false,
                ),
                solana_program::instruction::AccountMeta::new_readonly(
                    solana_program::system_program::ID,
                    false,
                ),
            ],
            data: instruction_data,
        };

        solana_program::program::invoke(
            &transfer_instruction,
            &transfer_accounts,
        )?;

        employee.last_payment = clock.unix_timestamp;
        employee.total_paid = employee.total_paid.saturating_add(1); // Count payments

        msg!("✅ Employee paid");
        msg!("   Employee: {}", employee.wallet);
        msg!("   Amount: ENCRYPTED");

        emit!(EmployeePaid {
            business: business.key(),
            employee: employee.wallet,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
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

    /// CHECK: Owner's Inco Token account (resolved from Bagel PDA registry)
    /// This is the token account that holds the employer's USDBagel tokens
    pub owner_token_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [BUSINESS_SEED, owner.key().as_ref()],
        bump = business.bump,
        has_one = owner
    )]
    pub business: Account<'info, Business>,

    /// CHECK: Source token account (owner's Inco Token account)
    #[account(mut)]
    pub from_token_account: AccountInfo<'info>,

    /// CHECK: Destination token account (business vault Inco Token account)
    #[account(mut)]
    pub to_token_account: AccountInfo<'info>,

    /// CHECK: Inco Token Program
    #[account(address = INCO_TOKEN_PROGRAM_ID)]
    pub inco_token_program: AccountInfo<'info>,

    /// CHECK: Inco Lightning Program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(employee_wallet: Pubkey)]
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
        seeds = [EMPLOYEE_SEED, business.key().as_ref(), employee_wallet.as_ref()],
        bump
    )]
    pub employee: Account<'info, Employee>,

    /// CHECK: Employee's Inco Token account (resolved from Bagel PDA registry)
    pub employee_token_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PayEmployee<'info> {
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
        seeds = [EMPLOYEE_SEED, business.key().as_ref(), employee.wallet.as_ref()],
        bump = employee.bump,
        has_one = business
    )]
    pub employee: Account<'info, Employee>,

    /// CHECK: Source token account (business vault Inco Token account)
    #[account(mut)]
    pub from_token_account: AccountInfo<'info>,

    /// CHECK: Destination token account (employee's Inco Token account)
    #[account(mut)]
    pub to_token_account: AccountInfo<'info>,

    /// CHECK: Inco Token Program
    #[account(address = INCO_TOKEN_PROGRAM_ID)]
    pub inco_token_program: AccountInfo<'info>,

    /// CHECK: Inco Lightning Program
    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// ============================================================
// State Structs
// ============================================================

#[account]
pub struct Business {
    /// Business owner (employer wallet)
    pub owner: Pubkey,

    /// Business's confidential token account (Inco Token account)
    pub token_account: Pubkey,

    /// Total deposits made (count, not amount for privacy)
    pub total_deposited: u64,

    /// Number of employees
    pub employee_count: u32,

    /// Is business active
    pub is_active: bool,

    /// Creation timestamp
    pub created_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl Business {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // token_account
        8 +  // total_deposited
        4 +  // employee_count
        1 +  // is_active
        8 +  // created_at
        1 +  // bump
        32;  // padding
}

#[account]
pub struct Employee {
    /// Parent business
    pub business: Pubkey,

    /// Employee wallet
    pub wallet: Pubkey,

    /// Employee's confidential token account (Inco Token account)
    pub token_account: Pubkey,

    /// Salary per payment period (in lamports)
    pub salary_per_period: u64,

    /// Last payment timestamp
    pub last_payment: i64,

    /// Total payments made (count, not amount for privacy)
    pub total_paid: u64,

    /// Is employee active
    pub is_active: bool,

    /// Creation timestamp
    pub created_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl Employee {
    pub const LEN: usize = 8 + // discriminator
        32 + // business
        32 + // wallet
        32 + // token_account
        8 +  // salary_per_period
        8 +  // last_payment
        8 +  // total_paid
        1 +  // is_active
        8 +  // created_at
        1 +  // bump
        32;  // padding
}

// ============================================================
// Events
// ============================================================

#[event]
pub struct BusinessRegistered {
    pub owner: Pubkey,
    pub token_account: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct FundsDeposited {
    pub business: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct EmployeeAdded {
    pub business: Pubkey,
    pub employee: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct EmployeePaid {
    pub business: Pubkey,
    pub employee: Pubkey,
    pub timestamp: i64,
}

// ============================================================
// Errors
// ============================================================

#[error_code]
pub enum PayrollError {
    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Employee is not active")]
    InactiveEmployee,

    #[msg("Insufficient funds")]
    InsufficientFunds,

    #[msg("Unauthorized")]
    Unauthorized,
}
