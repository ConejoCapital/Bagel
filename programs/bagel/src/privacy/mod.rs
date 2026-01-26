//! Privacy SDK Integration Layer - Lean Bagel Stack
//!
//! This module provides a unified interface for privacy operations.
//!
//! **LEAN BAGEL STACK (Privacy Hackathon 2026)**
//!
//! Primary encryption: Inco SVM (Devnet)
//! Private transfers: ShadowWire (Mainnet)
//! Real-time streaming: MagicBlock PER (Devnet)
//! Compliance: Range API
//!
//! **SECURITY WARNING:** Using mock encryption for demo!
//! Production will use real Inco Lightning encryption.

use anchor_lang::prelude::*;

// Inco SVM integration module (PRIMARY - Lean Bagel)
pub mod inco;

// ShadowWire private transfers module
pub mod shadowwire;

// MagicBlock streaming payments module
pub mod magicblock;

/// Encrypted u64 type using Inco SVM
///
/// **LEAN BAGEL:** Using Inco's ConfidentialBalance type
///
/// Provides:
/// - Encrypted Euint128 storage
/// - Homomorphic operations (add, sub, mul)
/// - Access-controlled decryption
pub use inco::ConfidentialBalance as EncryptedU64;

// Re-export Inco types for direct access
pub use inco::{Euint128, Ebool};

/// Privacy context for Inco operations
///
/// **PRODUCTION:** Will include:
/// - Inco Lightning program account
/// - Encryption context account
/// - Owner authority for decryption
#[derive(Accounts)]
pub struct PrivacyContext<'info> {
    /// System program (placeholder)
    pub system_program: Program<'info, System>,
}

/// Inco Privacy Context with full accounts
#[derive(Accounts)]
pub struct IncoPrivacyContext<'info> {
    /// Authority who can perform encrypted operations
    #[account(mut)]
    pub authority: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

// Re-export error codes from Inco module
pub use inco::ErrorCode;

// Re-export Inco functions (PRIMARY)
pub use inco::{encrypt_salary, decrypt_for_transfer, calculate_accrued_mpc};

// Re-export ShadowWire functions
pub use shadowwire::{execute_private_payout, initialize_encrypted_balance, ShadowWireTransfer};

// Re-export MagicBlock functions
pub use magicblock::{delegate_payroll_jar, commit_and_undelegate, get_er_balance, ERConfig};

/// Calculate accrued salary using Inco encrypted computation
///
/// **LEAN BAGEL:** Uses Inco's homomorphic multiplication
///
/// In production, this calls Inco's e_mul CPI for encrypted computation.
/// The salary amount stays encrypted throughout the calculation!
pub fn calculate_accrued(
    encrypted_salary_per_second: &EncryptedU64,
    elapsed_seconds: u64,
) -> Result<EncryptedU64> {
    inco::calculate_accrued_mpc(encrypted_salary_per_second, elapsed_seconds)
}

/// Inco Program ID constant
pub const INCO_PROGRAM_ID: &str = "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj";

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_encrypt_decrypt() {
        let original = 1_000_000; // $1/second in lamports
        let encrypted = EncryptedU64::new(original);
        let decrypted = encrypted.decrypt().unwrap();
        assert_eq!(original, decrypted);
    }
    
    #[test]
    fn test_multiply_scalar() {
        let salary_per_second = 1_000_000; // $1/second
        let elapsed_seconds = 3600; // 1 hour
        
        let encrypted_salary = EncryptedU64::new(salary_per_second);
        let encrypted_accrued = encrypted_salary.multiply_scalar(elapsed_seconds).unwrap();
        let accrued = encrypted_accrued.decrypt().unwrap();
        
        assert_eq!(accrued, 3_600_000_000); // $3600 in lamports
    }
    
    #[test]
    fn test_overflow_protection() {
        let huge_salary = u64::MAX / 2;
        let huge_time = 10;
        
        let encrypted = EncryptedU64::new(huge_salary);
        let result = encrypted.multiply_scalar(huge_time);
        
        // Should handle overflow gracefully
        assert!(result.is_err());
    }
}
