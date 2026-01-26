use anchor_lang::prelude::*;

/// Minimum time between withdrawals (anti-spam)
pub const MIN_WITHDRAW_INTERVAL: i64 = 60; // 1 minute


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

/// Privacy Provider Program IDs
pub mod program_ids {
    use anchor_lang::prelude::*;
    
    // MagicBlock Ephemeral Rollups Program ID
    // Delegation Program ID: DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh
    // Source: https://docs.magicblock.gg/pages/ephemeral-rollups-ers/introduction/ephemeral-rollup
    // Devnet Endpoint: https://devnet.magicblock.app/
    pub const MAGICBLOCK_PROGRAM_ID: &str = "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";
    
    // ShadowWire Private Transfers Program ID
    // Mainnet Program ID: GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD
    // Source: https://www.radr.fun/docs/shadowpay
    pub const SHADOWWIRE_PROGRAM_ID: &str = "GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD";
}
