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
#[cfg(not(feature = "devnet"))]
pub mod mainnet {
    use solana_program::declare_id;
    
    // ShadowWire program ID (mainnet)
    declare_id!("SHAD0W1111111111111111111111111111111111111");
    
    // USD1 token mint (mainnet)
    pub const USD1_MINT: &str = "USD1111111111111111111111111111111111111111";
}

#[cfg(feature = "devnet")]
pub mod devnet {
    use solana_program::declare_id;
    
    // ShadowWire program ID (devnet)
    declare_id!("SHAD0W1111111111111111111111111111111111111");
    
    // USD1 token mint (devnet)
    pub const USD1_MINT: &str = "USD1111111111111111111111111111111111111111";
}
