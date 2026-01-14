use anchor_lang::prelude::*;

/// Seed for the BagelJar PDA
pub const BAGEL_JAR_SEED: &[u8] = b"bagel_jar";

/// Seed for the global state PDA
pub const GLOBAL_STATE_SEED: &[u8] = b"global_state";

/// Seed for the dough vault (Privacy Cash integration)
pub const DOUGH_VAULT_SEED: &[u8] = b"dough_vault";

/// Maximum salary per second (anti-overflow protection)
/// ~$1,000,000/year = ~$31.7/second = 31_700_000 lamports/second
pub const MAX_SALARY_PER_SECOND: u64 = 50_000_000; // ~$50/second max

/// Minimum time between withdrawals (anti-spam)
pub const MIN_WITHDRAW_INTERVAL: i64 = 60; // 1 minute

/// Program IDs for integrations (to be updated with actual addresses)
/// TODO: Update these with real program IDs from privacy providers
pub mod program_ids {
    use anchor_lang::prelude::*;
    
    // Placeholder for ShadowWire program ID
    // TODO: Replace with actual ShadowWire program ID
    pub const SHADOWWIRE_PROGRAM_ID: &str = "11111111111111111111111111111111";
    
    // Placeholder for USD1 token mint
    // TODO: Replace with actual USD1 mint address
    pub const USD1_MINT: &str = "11111111111111111111111111111111";
}
