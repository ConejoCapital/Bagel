# Solana Development Best Practices (Skill)

## 🛡️ Security & Anchor Standards
1. **PDA Validation:** ALWAYS use `#[account(seeds = [...], bump)]` validation in the struct. Never derive PDAs manually in the instruction logic if Anchor can do it.
2. **Mutability:** Only mark accounts as `#[account(mut)]` if you actually write to them.
3. **Arithmetic:** Use `checked_add`, `checked_sub`, etc., or ensure `overflow-checks = true` in `Cargo.toml`.
4. **Signer Checks:** Always verify that critical instructions (withdraw, admin settings) have a valid `#[account(signer)]`.
5. **Discriminators:** Anchor handles this, but if doing manual account parsing, ALWAYS check the 8-byte discriminator.

## ⚡ Helius Optimization
1. **DAS API:** For fetching assets/NFTs, use Helius Digital Asset Standard (DAS) API instead of `getProgramAccounts`.
2. **Priority Fees:** Always implement a priority fee check using Helius `getPriorityFeeEstimate` before sending transactions.
3. **Webhooks:** Prefer Helius Webhooks over `connection.onAccountChange` for backend reliability.

## 🏗️ Program Structure
1. **Instructions:** One file per instruction (e.g., `instructions/deposit.rs`, `instructions/withdraw.rs`).
2. **State:** Keep state definitions in `state/mod.rs` or distinct files.
3. **Errors:** Use a custom `error.rs` file with descriptive `#[error_code]` enums.

## 🔐 Privacy Integration Standards
1. **Arcium/Inco:** Use encrypted types (`euint64`) for sensitive data like salaries.
2. **ShadowWire:** Use CPI calls for private transfers. Never log decrypted amounts.
3. **Range:** Implement ZK proofs for compliance without revealing underlying data.

## 🚀 MagicBlock Ephemeral Rollups
1. **Ephemeral Accounts:** Mark high-frequency update accounts with `#[ephemeral]` attribute.
2. **Settlement:** Only commit to L1 when necessary (e.g., withdrawals).
3. **State Management:** Keep temporary state off-chain for real-time updates.

## ✅ Testing Standards
1. **Unit Tests:** Test each instruction independently.
2. **Integration Tests:** Test full flows (deposit → stream → withdraw).
3. **Mock Privacy:** Use mock versions of privacy SDKs for faster local testing.
4. **Devnet First:** Always test on devnet before mainnet.

## 📊 Best Practices for Payroll
1. **Time Precision:** Use `Clock::get()?.unix_timestamp` for accurate time tracking.
2. **Overflow Protection:** Salary calculations MUST use checked arithmetic.
3. **Access Control:** Employers can only modify their own payrolls.
4. **Emergency Stops:** Implement pause functionality for security incidents.
