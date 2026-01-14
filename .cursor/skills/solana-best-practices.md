# Solana Development Best Practices (Skill)

**Reference:** Comprehensive 2026 Solana ecosystem best practices.  
**Based on:** Official Solana docs, Anchor framework, and https://github.com/GuiBibeau/solana-dev-skill

## 📚 Related Skills
- `solana-installation.md` - Setup and tooling
- `solana-programs.md` - Program development patterns
- Refer to these for detailed guidance on specific topics

## 🛡️ Security & Anchor Standards
1. **PDA Validation:** ALWAYS use `#[account(seeds = [...], bump)]` validation in the struct. Never derive PDAs manually in the instruction logic if Anchor can do it.
2. **Mutability:** Only mark accounts as `#[account(mut)]` if you actually write to them.
3. **Arithmetic:** Use `checked_add`, `checked_sub`, etc., or ensure `overflow-checks = true` in `Cargo.toml`.
4. **Signer Checks:** Always verify that critical instructions (withdraw, admin settings) have a valid `#[account(signer)]`.
5. **Discriminators:** Anchor handles this, but if doing manual account parsing, ALWAYS check the 8-byte discriminator.
6. **Access Control:** Use `has_one` constraints for ownership validation.
7. **Close Guards:** When closing accounts, always transfer remaining lamports to a designated receiver.

## ⚡ Modern Solana Stack (2026)

### Client-Side Development
- **Recommended:** `@solana/kit` (v5.x) - Modern, typed, performant
- **React:** `@solana/react-hooks` - Official React integration  
- **Legacy Compat:** `@solana/web3-compat` - Bridge to old web3.js
- **Avoid:** `@solana/web3.js` for new projects (legacy, being phased out)

### Program Development
- **Default:** Anchor Framework (declarative, safe, batteries-included)
- **High Performance:** Pinocchio (zero-dependency, manual control)
- **Testing:** Mollusk or LiteSVM (unit), Surfpool (integration)

## 🔧 Installation & Setup
Refer to `solana-installation.md` for complete setup guide.

**Key Points:**
- Use official Solana installer (NOT Homebrew - it's deprecated)
- Install Anchor via AVM (Anchor Version Manager)
- Always test on devnet first

## ⚡ Helius Optimization
1. **DAS API:** For fetching assets/NFTs, use Helius Digital Asset Standard (DAS) API instead of `getProgramAccounts`.
2. **Priority Fees:** Always implement a priority fee check using Helius `getPriorityFeeEstimate` before sending transactions.
3. **Webhooks:** Prefer Helius Webhooks over `connection.onAccountChange` for backend reliability.
4. **Enhanced RPC:** Use Helius for better performance, caching, and features.

## 🏗️ Program Structure
1. **Instructions:** One file per instruction (e.g., `instructions/deposit.rs`, `instructions/withdraw.rs`).
2. **State:** Keep state definitions in `state/mod.rs` or distinct files.
3. **Errors:** Use a custom `error.rs` file with descriptive `#[error_code]` enums.
4. **Constants:** Store seeds, limits, and magic numbers in `constants.rs`.
5. **Separation:** Keep handler logic separate from account validation.

## 🔐 Privacy Integration Standards
1. **Arcium/Inco:** Use encrypted types (`euint64`) for sensitive data like salaries.
2. **ShadowWire:** Use CPI calls for private transfers. Never log decrypted amounts.
3. **Range:** Implement ZK proofs for compliance without revealing underlying data.
4. **Event Privacy:** Never emit sensitive data in events (for Helius webhooks).

## 🚀 MagicBlock Ephemeral Rollups
1. **Ephemeral Accounts:** Mark high-frequency update accounts with `#[ephemeral]` attribute.
2. **Settlement:** Only commit to L1 when necessary (e.g., withdrawals).
3. **State Management:** Keep temporary state off-chain for real-time updates.
4. **Real-Time:** Use for gaming, streaming payments, or high-frequency updates.

## ✅ Testing Standards
1. **Unit Tests:** Test each instruction independently using Mollusk or LiteSVM.
2. **Integration Tests:** Test full flows (deposit → stream → withdraw) with Anchor.
3. **Mock Privacy:** Use mock versions of privacy SDKs for faster local testing.
4. **Devnet First:** Always test on devnet before mainnet.
5. **Mainnet Forks:** Use Surfpool to test against real mainnet state.

## 📊 Best Practices for Payroll (Bagel-Specific)
1. **Time Precision:** Use `Clock::get()?.unix_timestamp` for accurate time tracking.
2. **Overflow Protection:** Salary calculations MUST use checked arithmetic.
3. **Access Control:** Employers can only modify their own payrolls.
4. **Emergency Stops:** Implement pause functionality for security incidents.
5. **Rate Limiting:** Prevent spam withdrawals with minimum time intervals.

## 🌐 Network & RPC Best Practices
1. **Development:** Use devnet (free SOL from faucet)
2. **Production RPC:** Use Helius (not public endpoints)
3. **Commitment:** Use `confirmed` for most operations, `finalized` for critical ones
4. **Rate Limits:** Public endpoints have strict rate limits - use Helius/Quicknode
5. **Websockets:** For real-time updates, use Helius websockets

## 💰 Transaction Best Practices
1. **Priority Fees:** Always set dynamic priority fees (via Helius)
2. **Compute Budget:** Set appropriate compute unit limits
3. **Retry Logic:** Implement exponential backoff for failed transactions
4. **Confirmation:** Wait for `confirmed` commitment before showing success
5. **Simulation:** Simulate transactions before sending to catch errors

## 🔗 Essential Resources

### Official Documentation
- **Main Docs:** https://solana.com/docs
- **Quick Start:** https://solana.com/docs/intro/quick-start
- **Cookbook:** https://solana.com/developers/cookbook
- **RPC API:** https://solana.com/docs/rpc
- **Core Concepts:** https://solana.com/docs/core

### Installation & Setup
- **Installation:** https://solana.com/docs/intro/installation
- **Solana CLI:** https://solana.com/docs/intro/installation/solana-cli-basics
- **Anchor CLI:** https://solana.com/docs/intro/installation/anchor-cli-basics

### Program Development
- **Programs:** https://solana.com/docs/programs/rust
- **Program Structure:** https://solana.com/docs/programs/rust/program-structure
- **Deploying:** https://solana.com/docs/programs/deploying
- **Testing (Mollusk):** https://solana.com/docs/programs/testing/mollusk

### Client Development
- **Rust SDK:** https://solana.com/docs/clients/official/rust
- **JavaScript SDK:** https://solana.com/docs/clients/official/javascript

### Quick Start Guides
- **Reading from Network:** https://solana.com/docs/intro/quick-start/reading-from-network
- **Writing to Network:** https://solana.com/docs/intro/quick-start/writing-to-network
- **Deploying Programs:** https://solana.com/docs/intro/quick-start/deploying-programs
- **PDAs:** https://solana.com/docs/intro/quick-start/program-derived-address
- **CPIs:** https://solana.com/docs/intro/quick-start/cross-program-invocation

### References
- **Clusters:** https://solana.com/docs/references/clusters
- **Terminology:** https://solana.com/docs/references/terminology

### Community Resources
- **Modern Dev Skill:** https://github.com/GuiBibeau/solana-dev-skill
- **Anchor Book:** https://book.anchor-lang.com/
- **Solana Cookbook:** https://solanacookbook.com/

## 🎯 Quick Decision Matrix

| Need                    | Use This                     |
| ----------------------- | ---------------------------- |
| New Frontend            | @solana/kit                  |
| React App               | @solana/react-hooks          |
| New Program             | Anchor Framework             |
| High-Performance        | Pinocchio                    |
| Unit Tests              | Mollusk or LiteSVM           |
| Integration Tests       | Surfpool or Anchor test      |
| RPC                     | Helius (devnet/mainnet)      |
| Client Generation       | Codama (from Anchor IDL)     |
| Real-time Updates       | MagicBlock PERs              |
| Private Transfers       | ShadowWire                   |
| Encrypted State         | Arcium or Inco               |
| Compliance              | Range                        |

## ⚠️ Common Pitfalls to Avoid
1. **Don't** use Homebrew to install Solana (use official installer)
2. **Don't** use `@solana/web3.js` for new projects (legacy)
3. **Don't** use public RPC endpoints in production (rate limits)
4. **Don't** forget priority fees (transactions will be slow/fail)
5. **Don't** use unchecked arithmetic (overflow vulnerabilities)
6. **Don't** skip PDA seed validation (security risk)
7. **Don't** emit sensitive data in events (privacy leak)
8. **Don't** deploy to mainnet without thorough devnet testing
