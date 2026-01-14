use anchor_lang::prelude::*;

/// The BagelJar - Main payroll account (PDA)
/// Stores encrypted salary data and tracks accrued payments
#[account]
pub struct PayrollJar {
    /// The employer who funds this payroll
    pub employer: Pubkey,
    
    /// The employee receiving payments
    pub employee: Pubkey,
    
    /// Encrypted salary per second (Arcium encrypted)
    /// This keeps the salary amount private on-chain
    pub encrypted_salary_per_second: Vec<u8>,
    
    /// Timestamp of last withdrawal
    pub last_withdraw: i64,
    
    /// Total accrued since last withdraw (public for settlement)
    /// This is NOT the salary amount, just cumulative time-based accrual
    pub total_accrued: u64,
    
    /// Associated Privacy Cash vault for yield generation
    pub dough_vault: Pubkey,
    
    /// Bump seed for PDA
    pub bump: u8,
    
    /// Is this payroll currently active?
    pub is_active: bool,
}

impl PayrollJar {
    /// Calculate space needed for account
    pub const LEN: usize = 8 // discriminator
        + 32 // employer
        + 32 // employee
        + (4 + 32) // encrypted_salary_per_second (Vec<u8> with ~32 bytes)
        + 8 // last_withdraw
        + 8 // total_accrued
        + 32 // dough_vault
        + 1 // bump
        + 1 // is_active
        + 64; // padding for future fields
}

/// Global state for admin controls
#[account]
pub struct GlobalState {
    /// The admin who can pause the system
    pub admin: Pubkey,
    
    /// Is the system paused?
    pub is_paused: bool,
    
    /// Bump seed for PDA
    pub bump: u8,
    
    /// Total number of active payrolls
    pub total_payrolls: u64,
    
    /// Total volume processed (for stats)
    pub total_volume: u64,
}

impl GlobalState {
    pub const LEN: usize = 8 // discriminator
        + 32 // admin
        + 1 // is_paused
        + 1 // bump
        + 8 // total_payrolls
        + 8 // total_volume
        + 32; // padding
}

/// Event emitted when payroll is initialized
#[event]
pub struct PayrollBaked {
    pub employer: Pubkey,
    pub employee: Pubkey,
    pub bagel_jar: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when dough is delivered (withdraw)
#[event]
pub struct DoughDelivered {
    pub employee: Pubkey,
    pub bagel_jar: Pubkey,
    // NOTE: We do NOT include the amount here (privacy!)
    pub timestamp: i64,
}

/// Event emitted when funds are deposited
#[event]
pub struct DoughAdded {
    pub employer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

/// Event emitted when yield is claimed
#[event]
pub struct YieldClaimed {
    pub employer: Pubkey,
    pub bagel_jar: Pubkey,
    pub yield_amount: u64,
    pub timestamp: i64,
}
