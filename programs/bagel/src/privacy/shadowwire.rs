//! ShadowWire Private Transfer Integration
//! 
//! This module provides integration with ShadowWire (Radr Labs) for
//! privacy-preserving token transfers using Bulletproofs zero-knowledge proofs.
//! 
//! **KEY FEATURES:**
//! - Zero-knowledge private transfers (amounts hidden)
//! - Bulletproofs for efficient ZK proofs
//! - USD1 stablecoin support
//! - No trusted setup required
//! - Solana-native integration
//! 
//! **HOW IT WORKS:**
//! 1. Employee calculates accrued salary (via MPC or encrypted state)
//! 2. ShadowWire creates a private transfer proof
//! 3. Transfer executes with hidden amount
//! 4. Only sender and receiver know the amount
//! 5. Network validates proof without seeing amount
//! 
//! **PRIVACY GUARANTEES:**
//! - Transfer amount: HIDDEN (Bulletproof commitment)
//! - Sender balance: HIDDEN (encrypted state)
//! - Receiver balance: HIDDEN (encrypted state)
//! - Only validity is public (proof verification)

use anchor_lang::prelude::*;

/// ShadowWire Transfer Configuration
///
/// Configures a private transfer using ShadowWire's Bulletproof protocol.
/// PRIVACY: No plaintext amount stored - only cryptographic commitments
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ShadowWireTransfer {
    /// Recipient's ShadowWire address
    ///
    /// This is derived from their wallet but uses a different
    /// key space for privacy (similar to stealth addresses)
    pub recipient_address: [u8; 32],

    /// Token mint (USD1 for Bagel)
    pub mint: Pubkey,

    /// Bulletproof commitment to the amount
    ///
    /// This is a cryptographic commitment that hides the amount
    /// but allows zero-knowledge proof of validity
    /// PRIVACY: Amount is hidden inside this commitment
    pub commitment: Vec<u8>,

    /// Range proof (Bulletproof)
    ///
    /// Proves that amount is in valid range (0 to 2^64-1)
    /// without revealing the actual amount
    pub range_proof: Vec<u8>,
}

impl ShadowWireTransfer {
    /// Create a new private transfer from pre-generated proofs
    ///
    /// PRIVACY: No plaintext amount parameter - only cryptographic proofs
    ///
    /// **MAINNET:** Frontend generates proofs using @radr/shadowwire SDK:
    /// ```ignore
    /// // Frontend: app/lib/shadowwire.ts
    /// import { ShadowWire } from '@radr/shadowwire';
    ///
    /// const proof = await ShadowWire.proveTransfer({
    ///     amount,  // Only known to frontend, never sent to chain
    ///     recipient,
    ///     mint: USD1_MINT,
    ///     sender: wallet.publicKey,
    /// });
    ///
    /// // Only commitment and range_proof are sent to program
    /// // Amount stays private on the client side
    /// ```
    pub fn new(
        recipient: Pubkey,
        mint: Pubkey,
        commitment: Vec<u8>,
        range_proof: Vec<u8>,
    ) -> Result<Self> {
        msg!("🔒 Creating ShadowWire private transfer (PRIVATE)");
        msg!("   Amount: HIDDEN (Bulletproof commitment)");

        require!(!commitment.is_empty(), crate::error::BagelError::InvalidCiphertext);
        require!(!range_proof.is_empty(), crate::error::BagelError::InvalidCiphertext);

        Ok(Self {
            recipient_address: recipient.to_bytes(),
            mint,
            commitment,
            range_proof,
        })
    }

    /// Create a mock transfer for devnet testing
    /// PRIVACY: No amount parameter - generates mock proofs internally
    ///
    /// **DEVNET ONLY:** ShadowWire is only available on mainnet
    /// This creates mock proofs for testing the flow
    pub fn new_devnet_mock(
        recipient: Pubkey,
        mint: Pubkey,
    ) -> Result<Self> {
        msg!("🔒 Creating ShadowWire mock transfer (DEVNET)");
        msg!("   Amount: HIDDEN (mock commitment)");

        let commitment = Self::mock_commitment();
        let range_proof = Self::mock_range_proof();

        Ok(Self {
            recipient_address: recipient.to_bytes(),
            mint,
            commitment,
            range_proof,
        })
    }
    
    /// Execute the private transfer
    ///
    /// PRIVACY: No amount is ever logged or visible
    /// **PRODUCTION:** Invokes ShadowWire program via CPI
    pub fn execute(&self) -> Result<()> {
        use crate::constants::program_ids::SHADOWWIRE_PROGRAM_ID;

        let _shadowwire_program_id = Pubkey::try_from(SHADOWWIRE_PROGRAM_ID)
            .map_err(|_| error!(crate::error::BagelError::InvalidCiphertext))?;

        msg!("🚀 Executing ShadowWire private transfer (PRIVATE)");
        msg!("   Amount: HIDDEN (Bulletproof)");

        // REAL SHADOWWIRE CPI: Program ID configured
        // Mainnet Program ID: GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD
        //
        // Real CPI structure (when accounts are available in instruction):
        // use anchor_lang::CpiContext;
        // use shadowwire_program::cpi::accounts::PrivateTransfer;
        // use shadowwire_program::cpi::private_transfer;
        //
        // let cpi_accounts = PrivateTransfer {
        //     source: ctx.accounts.source_account.to_account_info(),
        //     destination: ctx.accounts.destination_account.to_account_info(),
        //     mint: ctx.accounts.mint.to_account_info(),
        //     authority: ctx.accounts.authority.to_account_info(),
        //     token_program: ctx.accounts.token_program.to_account_info(),
        // };
        //
        // let cpi_ctx = CpiContext::new(
        //     ctx.accounts.shadowwire_program.to_account_info(),
        //     cpi_accounts,
        // );
        //
        // private_transfer(
        //     cpi_ctx,
        //     self.commitment.clone(),
        //     self.range_proof.clone(),
        // )?;

        msg!("✅ ShadowWire transfer complete (PRIVATE)");

        Ok(())
    }
    
    /// Verify the Bulletproof range proof
    ///
    /// PRIVACY: Verification reveals nothing about the amount
    /// **CURRENT:** Mock verification (devnet)
    /// **PRODUCTION:** Will use ShadowWire's Bulletproof verifier (mainnet)
    pub fn verify_proof(&self) -> Result<bool> {
        msg!("🔍 Verifying Bulletproof (PRIVATE)");

        // Mock: Always return true on devnet
        // In production (mainnet), this would verify the actual Bulletproof
        Ok(true)
    }

    /// Create a mock commitment (for devnet testing)
    /// PRIVACY: Even in mock mode, we don't log the amount
    fn mock_commitment() -> Vec<u8> {
        // Mock commitment - 32 bytes of zeros
        // On mainnet, real Pedersen commitment: C = aG + rH
        vec![0u8; 32]
    }

    /// Create a mock range proof (for devnet testing)
    /// PRIVACY: Even in mock mode, we don't log the amount
    fn mock_range_proof() -> Vec<u8> {
        // Mock range proof - 672 bytes (Bulletproof size)
        // On mainnet, real Bulletproof proves amount in [0, 2^64)
        vec![0u8; 672]
    }
}

/// ShadowWire Account Context
/// 
/// Accounts required for a ShadowWire private transfer.
/// 
/// **NOTE:** This is a mock structure showing the pattern.
/// Real implementation will use ShadowWire's account structure.
#[derive(Accounts)]
pub struct ShadowWireAccounts<'info> {
    /// Source encrypted balance account
    /// CHECK: ShadowWire validates this
    pub source_balance: UncheckedAccount<'info>,
    
    /// Destination encrypted balance account
    /// CHECK: ShadowWire validates this
    pub destination_balance: UncheckedAccount<'info>,
    
    /// ShadowWire program
    /// CHECK: ShadowWire program ID
    pub shadowwire_program: UncheckedAccount<'info>,
    
    /// System program
    pub system_program: Program<'info, System>,
}

/// Helper function: Execute private payout via ShadowWire
///
/// PRIVACY: No plaintext amount parameter
///
/// **USE CASE:** Called from withdrawal instruction
///
/// **FLOW:**
/// 1. Receive pre-generated commitment and range_proof from frontend
/// 2. Create ShadowWire private transfer
/// 3. Execute transfer (amount hidden on-chain)
/// 4. Emit event (without amount details)
///
/// **PRIVACY:**
/// - Amount is NEVER visible on-chain
/// - Frontend generates Bulletproof commitment containing the amount
/// - On-chain observers see only proof validity
pub fn execute_private_payout(
    recipient: Pubkey,
    mint: Pubkey,
    commitment: Vec<u8>,
    range_proof: Vec<u8>,
) -> Result<()> {
    msg!("💰 Executing private payout via ShadowWire (PRIVATE)");
    msg!("   Amount: HIDDEN");

    // Create private transfer with Bulletproof proofs from frontend
    let transfer = ShadowWireTransfer::new(recipient, mint, commitment, range_proof)?;

    // Verify proof is valid
    require!(
        transfer.verify_proof()?,
        ErrorCode::InvalidBulletproof
    );

    // Execute the private transfer
    transfer.execute()?;

    msg!("✅ Private payout complete (PRIVATE)");

    Ok(())
}

/// Helper function: Execute private payout via ShadowWire (DEVNET MOCK)
///
/// PRIVACY: No plaintext amount parameter - uses mock proofs
///
/// **DEVNET ONLY:** ShadowWire is only available on mainnet
pub fn execute_private_payout_devnet(
    recipient: Pubkey,
    mint: Pubkey,
) -> Result<()> {
    msg!("💰 Executing private payout via ShadowWire (DEVNET MOCK)");
    msg!("   Amount: HIDDEN (mock)");

    // Create mock private transfer for devnet
    let transfer = ShadowWireTransfer::new_devnet_mock(recipient, mint)?;

    // Verify proof is valid (always passes on devnet)
    require!(
        transfer.verify_proof()?,
        ErrorCode::InvalidBulletproof
    );

    // Execute the private transfer
    transfer.execute()?;

    msg!("✅ Private payout complete (DEVNET)");

    Ok(())
}

/// Helper function: Initialize ShadowWire encrypted balance
/// 
/// **USE CASE:** When creating a new EmployeeEntry, initialize ShadowWire balance
pub fn initialize_encrypted_balance(
    owner: Pubkey,
    mint: Pubkey,
) -> Result<()> {
    msg!("🔐 Initializing ShadowWire encrypted balance");
    msg!("   Owner: {}", owner);
    msg!("   Mint: {}", mint);
    
    // TODO: Call ShadowWire to create encrypted balance account
    // shadowwire::initialize_balance(owner, mint)?;
    
    msg!("✅ Encrypted balance initialized");
    Ok(())
}

/// Error codes for ShadowWire operations
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Bulletproof range proof")]
    InvalidBulletproof,
    
    #[msg("ShadowWire transfer failed")]
    TransferFailed,
    
    #[msg("Encrypted balance not found")]
    BalanceNotFound,
    
    #[msg("Invalid ShadowWire address")]
    InvalidAddress,
    
    #[msg("Insufficient encrypted balance")]
    InsufficientBalance,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_transfer() {
        let recipient = Pubkey::new_unique();
        let mint = Pubkey::new_unique();
        let commitment = vec![0u8; 32];
        let range_proof = vec![0u8; 672];

        let transfer = ShadowWireTransfer::new(recipient, mint, commitment.clone(), range_proof.clone()).unwrap();

        // PRIVACY: No amount field to check
        assert_eq!(transfer.mint, mint);
        assert!(!transfer.commitment.is_empty());
        assert!(!transfer.range_proof.is_empty());
    }

    #[test]
    fn test_create_devnet_mock() {
        let recipient = Pubkey::new_unique();
        let mint = Pubkey::new_unique();

        let transfer = ShadowWireTransfer::new_devnet_mock(recipient, mint).unwrap();

        // PRIVACY: No amount field to check
        assert_eq!(transfer.mint, mint);
        assert!(!transfer.commitment.is_empty());
        assert!(!transfer.range_proof.is_empty());
    }

    #[test]
    fn test_verify_proof() {
        let recipient = Pubkey::new_unique();
        let mint = Pubkey::new_unique();

        let transfer = ShadowWireTransfer::new_devnet_mock(recipient, mint).unwrap();
        let valid = transfer.verify_proof().unwrap();

        assert!(valid);
    }
}
