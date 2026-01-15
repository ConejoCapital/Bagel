//! Privacy SDK Integration Layer
//! 
//! This module provides a unified interface for privacy operations.
//! 
//! **CURRENT STATUS: ARCIUM C-SPL PREPARATION**
//! 
//! Strategic pivot to Arcium for the $10,000 DeFi bounty!
//! 
//! Arcium provides:
//! - C-SPL (Confidential SPL) for encrypted token balances
//! - MPC (Multi-Party Computation) for private calculations
//! - Token-2022 integration for standard compatibility
//! 
//! This module provides the interface. Full C-SPL integration will be
//! added carefully to avoid stack size issues.
//! 
//! **SECURITY WARNING:** Currently using mocks for testing!
//! Real encryption will come from Arcium C-SPL + Token-2022.

use anchor_lang::prelude::*;

// Arcium C-SPL integration module
pub mod arcium;

// ShadowWire private transfers module
pub mod shadowwire;

// MagicBlock streaming payments module
pub mod magicblock;

// Privacy Cash yield generation module
pub mod privacycash;

// Kamino Finance yield integration module
pub mod kamino;

// MPC output types
pub mod mpc_output;

/// Encrypted u64 type using Arcium C-SPL
/// 
/// **RE-EXPORT:** Using Arcium's ConfidentialBalance type
/// 
/// In production, this will be Arcium's C-SPL encrypted balance which provides:
/// - Twisted ElGamal encryption
/// - Homomorphic operations
/// - MPC computations
pub use arcium::ConfidentialBalance as EncryptedU64;

// Implementation is in arcium.rs module

/// Privacy context (MOCK - placeholder for Inco SDK context)
/// 
/// **TODO:** Replace with actual Inco context when SDK is available
/// 
/// The real implementation will include:
/// - Inco program account
/// - Encryption context account
/// - Attestation account (for TEE)
#[derive(Accounts)]
pub struct PrivacyContext<'info> {
    /// Placeholder account
    /// 
    /// **PRODUCTION:** Will be replaced with:
    /// ```ignore
    /// /// Inco program
    /// pub inco_program: Program<'info, IncoProgram>,
    /// 
    /// /// Encryption context
    /// /// CHECK: Inco program will validate
    /// pub encryption_context: AccountInfo<'info>,
    /// ```
    pub system_program: Program<'info, System>,
}

// Re-export error codes from arcium module
pub use arcium::ErrorCode;

// Re-export Arcium functions
pub use arcium::{encrypt_salary, decrypt_for_transfer};

// Re-export ShadowWire functions
pub use shadowwire::{execute_private_payout, initialize_encrypted_balance, ShadowWireTransfer};

// Re-export MagicBlock functions
pub use magicblock::{delegate_payroll_jar, commit_and_undelegate, get_er_balance, ERConfig};

// Re-export Privacy Cash functions
pub use privacycash::{deposit_to_vault, calculate_employee_yield_bonus, YieldVaultPosition, YieldDistribution};

// Re-export Kamino functions
pub use kamino::{deposit_to_kamino_vault, KaminoVaultPosition};

/// Calculate accrued salary using Arcium MPC
/// 
/// **MOCK:** Uses local multiplication
/// **PRODUCTION:** Will use Arcium MPC circuit for distributed computation
pub fn calculate_accrued(
    encrypted_salary_per_second: &EncryptedU64,
    elapsed_seconds: u64,
) -> Result<EncryptedU64> {
    arcium::calculate_accrued_mpc(encrypted_salary_per_second, elapsed_seconds)
}

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
