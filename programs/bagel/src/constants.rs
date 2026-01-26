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

/// Kamino Finance Lend V2 (Devnet & Mainnet)
/// Program ID: KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
/// Main Market: 7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF
/// SOL Reserve: d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q
/// USDC Reserve: D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59
pub const KAMINO_LENDING_PROGRAM: &str = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";
pub const KAMINO_MAIN_MARKET: &str = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";
pub const KAMINO_SOL_RESERVE: &str = "d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q";
pub const KAMINO_USDC_RESERVE: &str = "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59";

/// ═══════════════════════════════════════════════════════════════
/// LEAN BAGEL STACK - Privacy Hackathon 2026
/// ═══════════════════════════════════════════════════════════════

/// Inco SVM (Encrypted Ledger) - Devnet Beta
/// Program ID: 5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj
/// Documentation: https://docs.inco.org/svm/home
pub const INCO_PROGRAM_ID: &str = "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj";

/// MagicBlock PER (Real-Time Streaming) - Devnet
/// Delegation Program: DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh
/// Permission Program: ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1
/// TEE Endpoint: https://tee.magicblock.app
/// Documentation: https://docs.magicblock.gg
pub const MAGICBLOCK_DELEGATION_PROGRAM: &str = "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";
pub const MAGICBLOCK_PERMISSION_PROGRAM: &str = "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1";
pub const MAGICBLOCK_TEE_VALIDATOR: &str = "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA";
pub const MAGICBLOCK_TEE_URL: &str = "https://tee.magicblock.app";

/// MagicBlock Regional Validators
pub const MAGICBLOCK_VALIDATOR_ASIA: &str = "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57";
pub const MAGICBLOCK_VALIDATOR_EU: &str = "MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e";
pub const MAGICBLOCK_VALIDATOR_US: &str = "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd";

/// ShadowWire (Private Payouts) - Mainnet Ready
/// Mainnet Program: GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD
/// Documentation: https://github.com/Radrdotfun/ShadowWire
pub const SHADOWWIRE_PROGRAM_ID: &str = "GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD";

/// ═══════════════════════════════════════════════════════════════
/// LEGACY: Arcium MPC Configuration (Devnet) - Not used in Lean Bagel
/// ═══════════════════════════════════════════════════════════════
/// Cluster Offset: 1078779259
/// Cluster Account: pEtraPDXjE9SJzENgzgsN2RGvyXzxr3Bdj7vbBCt8sciLK2z81JGweokhFq7qYjA6SV8vWnF7LsFT6vKkt5hiYd
/// MXE Account: 5nGzD7hUHyWQR24rDHiZv7mvKFfvWmomUNNzjzt6XEWuCv58DyiyyRUviSWvGNzkRj4TaoAAUDk3Q4MQuHB8eCY
/// Deployed: 2026-01-14 (DEPRECATED in Lean Bagel)
pub const ARCIUM_CLUSTER_OFFSET: u64 = 1078779259;
pub const ARCIUM_CLUSTER_ACCOUNT: &str = "pEtraPDXjE9SJzENgzgsN2RGvyXzxr3Bdj7vbBCt8sciLK2z81JGweokhFq7qYjA6SV8vWnF7LsFT6vKkt5hiYd";
pub const ARCIUM_MXE_ACCOUNT: &str = "5nGzD7hUHyWQR24rDHiZv7mvKFfvWmomUNNzjzt6XEWuCv58DyiyyRUviSWvGNzkRj4TaoAAUDk3Q4MQuHB8eCY";

/// Privacy Provider Program IDs
/// 
/// These will be updated with actual program IDs from each team.
/// Contact information:
/// - MagicBlock: Discord server
/// - ShadowWire: https://github.com/Radrdotfun/ShadowWire
/// - Arcium: Discord #arcium channel
pub mod program_ids {
    use anchor_lang::prelude::*;
    
    // MagicBlock Ephemeral Rollups Program ID
    // Delegation Program ID: DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh
    // Source: https://docs.magicblock.gg/pages/ephemeral-rollups-ers/introduction/ephemeral-rollup
    // Devnet Endpoint: https://devnet.magicblock.app/
    // SDK: ephemeral-rollups-sdk v0.7.2
    pub const MAGICBLOCK_PROGRAM_ID: &str = "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";
    
    // ShadowWire Private Transfers Program ID
    // Mainnet Program ID: GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD
    // Source: https://www.radr.fun/docs/shadowpay
    // Note: This is mainnet ID - devnet may differ, check ShadowWire docs
    pub const SHADOWWIRE_PROGRAM_ID: &str = "GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD";
    
    // USD1 Token Mint (for ShadowWire private transfers)
    // TODO: Get from ShadowWire team or their documentation
    pub const USD1_MINT: &str = "11111111111111111111111111111111";
}
