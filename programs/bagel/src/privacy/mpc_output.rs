//! MPC Computation Output Type
//! 
//! This module defines the output type for Arcium MPC computations.
//! The output must implement HasSize for Arcium's SignedComputationOutputs.

use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

/// Output size for MPC computation (encrypted accrued amount)
/// 
/// This matches the size of the encrypted result from the Arcium circuit.
/// The circuit returns encrypted ciphertext bytes of this exact length.
pub const DOUGH_OUT_SIZE: usize = 32; // Encrypted u64 result (padded to 32 bytes)

/// MPC computation output for queue_get_dough_mpc
/// 
/// **Naming Requirement:** Must be named `{InstructionName}Output` where InstructionName
/// matches the encrypted_ix name in #[queue_computation_accounts].
/// Arcium macros generate this type name automatically.
/// 
/// This struct represents the encrypted accrued amount returned by the Arcium MPC circuit.
/// It must implement HasSize so Arcium can deserialize exactly DOUGH_OUT_SIZE bytes.
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub struct QueueGetDoughMpcOutput {
    /// Encrypted accrued amount (32 bytes)
    /// 
    /// This is the result of: encrypted_salary_per_second * elapsed_seconds
    /// The computation happens on Arcium's MXE cluster, keeping the salary private.
    pub bytes: [u8; DOUGH_OUT_SIZE],
}

impl HasSize for QueueGetDoughMpcOutput {
    const SIZE: usize = DOUGH_OUT_SIZE;
}

// Keep old name for backwards compatibility during migration
pub type GetDoughMpcOut = QueueGetDoughMpcOutput;
