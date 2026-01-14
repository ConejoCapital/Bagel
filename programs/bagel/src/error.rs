use anchor_lang::prelude::*;

#[error_code]
pub enum BagelError {
    #[msg("The salary per second exceeds the maximum allowed amount")]
    SalaryTooHigh,
    
    #[msg("Arithmetic overflow occurred during calculation")]
    ArithmeticOverflow,
    
    #[msg("You must wait longer between withdrawals")]
    WithdrawTooSoon,
    
    #[msg("Insufficient funds in the BagelJar")]
    InsufficientFunds,
    
    #[msg("The payroll has not accrued any dough yet")]
    NoAccruedDough,
    
    #[msg("Only the employer can perform this action")]
    UnauthorizedEmployer,
    
    #[msg("Only the employee can perform this action")]
    UnauthorizedEmployee,
    
    #[msg("The BagelJar is paused for maintenance")]
    SystemPaused,
    
    #[msg("Encryption operation failed")]
    EncryptionFailed,
    
    #[msg("Decryption operation failed")]
    DecryptionFailed,
    
    #[msg("Invalid timestamp detected")]
    InvalidTimestamp,
    
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    
    #[msg("Arithmetic underflow occurred during calculation")]
    ArithmeticUnderflow,
}
