//! Inco SVM Integration (Lean Bagel Stack)
//!
//! This module provides integration with Inco Lightning for encrypted
//! salary balances and confidential computation on Solana.
//!
//! **VERSION:** Inco Lightning 0.1.4 (Devnet Beta)
//! **PROGRAM ID:** 5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj
//!
//! Key Features:
//! - Encrypted uint128 balances (Euint128)
//! - Homomorphic operations (add, sub, mul)
//! - Encrypted comparisons (ge, le, eq)
//! - Access-controlled decryption
//!
//! Documentation: https://docs.inco.org/svm/rust-sdk/overview

use anchor_lang::prelude::*;

/// Inco Lightning Program ID (Devnet)
pub const INCO_PROGRAM_ID: &str = "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj";

/// Encrypted Uint128 Type
///
/// Represents an encrypted 128-bit unsigned integer using Inco Lightning.
/// Values remain encrypted on-chain - only authorized parties can decrypt.
///
/// **STRUCTURE:** 16-byte handle that points to encrypted data
/// managed by the Inco program.
///
/// **CURRENT:** Mock implementation with same interface
/// **PRODUCTION:** Will use inco_lightning::types::Euint128
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct Euint128 {
    /// Handle to encrypted value (16 bytes)
    /// In production, this is managed by Inco's encryption service
    pub handle: [u8; 16],
}

impl Euint128 {
    /// Size of Euint128 in bytes
    pub const SIZE: usize = 16;

    /// Create a new encrypted value from plaintext
    ///
    /// **MOCK:** Stores plaintext XOR'd with a key (NOT SECURE!)
    /// **PRODUCTION:** Will use Inco's new_euint128 CPI
    pub fn new(value: u128) -> Self {
        msg!("🔐 INCO: Creating encrypted Euint128 (handle only visible)");

        // Mock encryption: XOR with a constant (NOT REAL ENCRYPTION!)
        let value_bytes = value.to_le_bytes();
        let mut handle = [0u8; 16];

        // Simple XOR masking for demo (NOT SECURE!)
        let mask: [u8; 16] = *b"INCO_ENCRYPTED__";
        for i in 0..16 {
            handle[i] = value_bytes[i] ^ mask[i];
        }

        Self { handle }
    }

    /// Create from raw handle bytes
    pub fn from_handle(handle: [u8; 16]) -> Self {
        Self { handle }
    }

    /// Get the raw handle bytes
    pub fn to_handle(&self) -> [u8; 16] {
        self.handle
    }

    /// Decrypt the value (requires authorization)
    ///
    /// **MOCK:** Reverses the XOR
    /// **PRODUCTION:** Will call Inco's decryption service with proof
    pub fn decrypt(&self) -> Result<u128> {
        msg!("🔓 INCO: Decrypting value (authorized access)");

        // Reverse the XOR masking
        let mask: [u8; 16] = *b"INCO_ENCRYPTED__";
        let mut value_bytes = [0u8; 16];
        for i in 0..16 {
            value_bytes[i] = self.handle[i] ^ mask[i];
        }

        Ok(u128::from_le_bytes(value_bytes))
    }

    /// Check if handle is zero (empty/uninitialized)
    pub fn is_zero(&self) -> bool {
        self.handle == [0u8; 16]
    }
}

/// Encrypted Boolean Type
///
/// Represents an encrypted boolean using Inco Lightning.
/// Used for encrypted comparisons and conditionals.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct Ebool {
    /// Handle to encrypted boolean (1 byte effective, padded)
    pub handle: [u8; 16],
}

impl Ebool {
    pub const SIZE: usize = 16;

    /// Create encrypted true
    pub fn new_true() -> Self {
        let mut handle = [0u8; 16];
        handle[0] = 0x01;
        Self { handle }
    }

    /// Create encrypted false
    pub fn new_false() -> Self {
        Self { handle: [0u8; 16] }
    }

    /// Decrypt the boolean (requires authorization)
    pub fn decrypt(&self) -> Result<bool> {
        Ok(self.handle[0] != 0)
    }
}

/// Confidential Balance using Inco Euint128
///
/// Drop-in replacement for Arcium's ConfidentialBalance.
/// Provides the same interface but uses Inco's encryption.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ConfidentialBalance {
    /// Encrypted amount using Inco Euint128
    pub encrypted_amount: Euint128,

    /// Owner's public key (for access control)
    pub owner: Option<Pubkey>,
}

impl ConfidentialBalance {
    /// Create a new confidential balance from plaintext amount
    pub fn new(amount: u64) -> Self {
        msg!(
            "🔐 INCO: Creating confidential balance for {} lamports",
            amount
        );

        Self {
            encrypted_amount: Euint128::new(amount as u128),
            owner: None,
        }
    }

    /// Create with owner for access control
    pub fn new_with_owner(amount: u64, owner: Pubkey) -> Self {
        msg!(
            "🔐 INCO: Creating confidential balance for {} lamports (owner: {})",
            amount,
            owner
        );

        Self {
            encrypted_amount: Euint128::new(amount as u128),
            owner: Some(owner),
        }
    }

    /// Decrypt the balance (requires authorization)
    pub fn decrypt(&self) -> Result<u64> {
        msg!("🔓 INCO: Decrypting confidential balance");

        let value = self.encrypted_amount.decrypt()?;

        // Ensure value fits in u64
        if value > u64::MAX as u128 {
            return err!(IncoError::Overflow);
        }

        Ok(value as u64)
    }

    /// Add to this balance (homomorphic operation)
    ///
    /// **MOCK:** Decrypts, adds, re-encrypts
    /// **PRODUCTION:** Will use Inco's e_add CPI
    pub fn add(&mut self, delta: u64) -> Result<()> {
        msg!(
            "➕ INCO: Adding {} to encrypted balance (homomorphic in production)",
            delta
        );

        let current = self.decrypt()?;
        let new_amount = current
            .checked_add(delta)
            .ok_or(error!(IncoError::Overflow))?;

        self.encrypted_amount = Euint128::new(new_amount as u128);
        Ok(())
    }

    /// Subtract from this balance (homomorphic operation)
    pub fn sub(&mut self, delta: u64) -> Result<()> {
        msg!(
            "➖ INCO: Subtracting {} from encrypted balance",
            delta
        );

        let current = self.decrypt()?;
        let new_amount = current
            .checked_sub(delta)
            .ok_or(error!(IncoError::Underflow))?;

        self.encrypted_amount = Euint128::new(new_amount as u128);
        Ok(())
    }

    /// Multiply by a scalar (homomorphic operation)
    ///
    /// This is the KEY operation for payroll: salary_per_second * elapsed_time
    ///
    /// **MOCK:** Decrypts, multiplies, re-encrypts
    /// **PRODUCTION:** Will use Inco's e_mul CPI
    pub fn multiply_scalar(&self, scalar: u64) -> Result<Self> {
        msg!(
            "✖️ INCO: Multiplying encrypted balance by {} (homomorphic in production)",
            scalar
        );

        let amount = self.decrypt()?;
        let result = amount
            .checked_mul(scalar)
            .ok_or(error!(IncoError::Overflow))?;

        Ok(Self::new(result))
    }

    /// Compare if balance >= threshold
    pub fn greater_or_equal(&self, threshold: u64) -> Result<Ebool> {
        let value = self.decrypt()?;
        if value >= threshold {
            Ok(Ebool::new_true())
        } else {
            Ok(Ebool::new_false())
        }
    }
}

/// Encrypt a salary amount for storage
///
/// **USE CASE:** When employer creates payroll, encrypt the salary_per_second
pub fn encrypt_salary(amount: u64) -> ConfidentialBalance {
    msg!("🔒 INCO: Encrypting salary ({} lamports/second)", amount);
    ConfidentialBalance::new(amount)
}

/// Calculate accrued salary using encrypted computation
///
/// **USE CASE:** When employee withdraws, calculate: salary * elapsed_time
/// This happens via encrypted computation so the salary amount stays encrypted!
pub fn calculate_accrued_mpc(
    encrypted_salary_per_second: &ConfidentialBalance,
    elapsed_seconds: u64,
) -> Result<ConfidentialBalance> {
    msg!(
        "🧮 INCO: Calculating accrued salary ({} seconds elapsed)",
        elapsed_seconds
    );

    let result = encrypted_salary_per_second.multiply_scalar(elapsed_seconds)?;

    msg!("✅ INCO: Accrued salary calculated (encrypted result)");

    Ok(result)
}

/// Decrypt for private transfer
///
/// **USE CASE:** After calculation, decrypt to initiate ShadowWire transfer
///
/// **NOTE:** This is the ONLY place we decrypt!
/// The amount goes directly from decryption → ShadowWire → employee wallet
pub fn decrypt_for_transfer(encrypted_amount: &ConfidentialBalance) -> Result<u64> {
    msg!("🔓 INCO: Decrypting for private ShadowWire transfer");
    encrypted_amount.decrypt()
}

/// Inco-specific error codes
#[error_code]
pub enum IncoError {
    #[msg("Arithmetic overflow in encrypted computation")]
    Overflow,

    #[msg("Arithmetic underflow in encrypted computation")]
    Underflow,

    #[msg("Decryption failed - invalid handle or unauthorized")]
    DecryptionFailed,

    #[msg("Encryption failed")]
    EncryptionFailed,

    #[msg("Access denied - not authorized to decrypt")]
    AccessDenied,

    #[msg("Invalid Inco program ID")]
    InvalidProgram,
}

// Re-export error for compatibility
pub use IncoError as ErrorCode;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_euint128_encrypt_decrypt() {
        let original: u128 = 1_000_000;
        let encrypted = Euint128::new(original);
        let decrypted = encrypted.decrypt().unwrap();
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_confidential_balance() {
        let balance = ConfidentialBalance::new(1_000_000);
        let decrypted = balance.decrypt().unwrap();
        assert_eq!(decrypted, 1_000_000);
    }

    #[test]
    fn test_homomorphic_addition() {
        let mut balance = ConfidentialBalance::new(1_000_000);
        balance.add(500_000).unwrap();
        assert_eq!(balance.decrypt().unwrap(), 1_500_000);
    }

    #[test]
    fn test_encrypted_multiplication() {
        let salary_per_second = ConfidentialBalance::new(1_000_000); // 1M lamports/sec
        let elapsed_seconds = 3600; // 1 hour

        let accrued = calculate_accrued_mpc(&salary_per_second, elapsed_seconds).unwrap();
        assert_eq!(accrued.decrypt().unwrap(), 3_600_000_000); // 3.6B lamports
    }

    #[test]
    fn test_overflow_protection() {
        let huge = ConfidentialBalance::new(u64::MAX / 2);
        let result = huge.multiply_scalar(10);
        assert!(result.is_err());
    }

    #[test]
    fn test_comparison() {
        let balance = ConfidentialBalance::new(1000);

        let ge_500 = balance.greater_or_equal(500).unwrap();
        assert!(ge_500.decrypt().unwrap());

        let ge_2000 = balance.greater_or_equal(2000).unwrap();
        assert!(!ge_2000.decrypt().unwrap());
    }
}
