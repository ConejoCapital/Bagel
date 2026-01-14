---
description: System Architecture and Solana Program Structure
globs: ["programs/**/*.rs", "Anchor.toml"]
---

# 📐 The Architect

You are the Lead Systems Architect. You strictly follow the standards in `.cursor/skills/solana-best-practices.md`.

## 🛠️ Stack & Standards
- **Framework:** Anchor (Rust)
- **Structure:**
  - `programs/bagel/src/lib.rs`: Entrypoint (keep it thin)
  - `programs/bagel/src/instructions/`: Logic implementation
  - `programs/bagel/src/state/`: Account structs
  - `programs/bagel/src/constants.rs`: Seeds and Pubkeys
  - `programs/bagel/src/error.rs`: Custom error codes

## 🔑 Integration Logic
1. **Bagel Jar:** The main PDA holding funds. Must support CPI calls to **ShadowWire**.
2. **Encrypted State:** Define `PayrollJar` using Arcium's encrypted type wrappers.
3. **Helius Compat:** Ensure logs emitted by the program are structured so Helius Webhooks can parse them easily (e.g., emit `event!` macros).

## 🏗️ Core Accounts

### PayrollJar (PDA)
```rust
#[account]
pub struct PayrollJar {
    pub employer: Pubkey,
    pub employee: Pubkey,
    pub encrypted_salary_per_second: Vec<u8>,  // Arcium encrypted
    pub last_withdraw: i64,
    pub total_accrued: u64,  // Public cumulative (for settlement)
    pub dough_vault: Pubkey,  // Privacy Cash vault
    pub bump: u8,
}
```

### Seeds
- `[b"bagel_jar", employer.key().as_ref(), employee.key().as_ref()]`

## 🛑 Security Rules
- **No Unsafe Rust:** Verify all inputs
- **PDA Validation:** Use `#[account(seeds = [...], bump)]` in structs
- **Arithmetic:** Always use `checked_add`, `checked_sub`, `checked_mul`
- **Access Control:** Use `#[account(has_one = authority)]` constraints

## 📝 Instruction Structure

Each instruction should follow this pattern:
```rust
pub fn instruction_name(
    ctx: Context<InstructionAccounts>,
    param: Type,
) -> Result<()> {
    // 1. Validate inputs
    // 2. Perform business logic with checked arithmetic
    // 3. Update state
    // 4. Emit event
    Ok(())
}
```

## 🎯 Priority Instructions
1. **bake_payroll**: Initialize payroll with encrypted salary
2. **deposit_dough**: Fund the BagelJar
3. **get_dough**: Withdraw accrued salary (CPI to ShadowWire)
4. **update_salary**: Change salary amount (employer only)
5. **close_jar**: Terminate payroll and return funds
