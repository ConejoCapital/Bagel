---
description: Privacy implementation using Arcium and Anchor
globs: ["programs/bagel/src/**/*.rs"]
---

# 👩‍🍳 The Secret Kitchen (Privacy Agent)

You handle the "Secret Recipe" (Encrypted Data).

## 📚 Tools
- **Arcium SDK:** `arcium_client` crate
- **Types:** `euint32` (Encrypted u32), `euint64` (Encrypted u64)
- **Alternative:** Inco Lightning for fast confidential computing

## 📝 Coding Patterns

### Deposit (Public to Encrypted)
```rust
pub fn bake_payroll(
    ctx: Context<BakePayroll>,
    salary_per_second: u64,  // Public input
) -> Result<()> {
    let payroll = &mut ctx.accounts.payroll_jar;
    
    // Encrypt the salary using Arcium
    let encrypted_salary = arcium::encrypt(salary_per_second)?;
    
    payroll.encrypted_salary_per_second = encrypted_salary;
    payroll.employer = ctx.accounts.employer.key();
    payroll.employee = ctx.accounts.employee.key();
    payroll.last_withdraw = Clock::get()?.unix_timestamp;
    
    Ok(())
}
```

### Calculate Accrued (On Encrypted Data)
```rust
pub fn calculate_accrued(
    encrypted_salary: &[u8],
    seconds_elapsed: i64,
) -> Result<Vec<u8>> {
    // This calculation happens in the Arcium TEE
    // Returns encrypted result
    let encrypted_accrued = arcium::multiply_encrypted(
        encrypted_salary,
        seconds_elapsed as u64,
    )?;
    
    Ok(encrypted_accrued)
}
```

### Withdraw (Decrypt Only for Transfer)
```rust
pub fn get_dough(
    ctx: Context<GetDough>,
) -> Result<()> {
    let payroll = &ctx.accounts.payroll_jar;
    let now = Clock::get()?.unix_timestamp;
    let seconds_elapsed = now.checked_sub(payroll.last_withdraw).unwrap();
    
    // Calculate in encrypted space
    let encrypted_amount = calculate_accrued(
        &payroll.encrypted_salary_per_second,
        seconds_elapsed,
    )?;
    
    // Decrypt ONLY for the CPI call (happens in secure context)
    let amount = arcium::decrypt_for_transfer(&encrypted_amount)?;
    
    // CPI to ShadowWire (private transfer)
    shadow_wire::cpi::private_transfer(
        ctx.accounts.shadow_wire_program.to_account_info(),
        amount,
        ctx.accounts.employee.key(),
    )?;
    
    // NEVER log the decrypted amount!
    msg!("Dough delivered 🥯");
    
    Ok(())
}
```

## ⚠️ Security Rules
1. **NEVER log decrypted values** - Use generic messages like "Dough delivered"
2. **Access Control** - Only employer can update salary, only employee can withdraw
3. **Decrypt Only When Necessary** - Keep data encrypted as long as possible
4. **Use TEE Context** - All sensitive operations should happen in Arcium's Trusted Execution Environment

## 🧪 Testing with Mock Encryption
For local tests, create a mock encryption module:
```rust
#[cfg(test)]
pub mod mock_arcium {
    pub fn encrypt(value: u64) -> Vec<u8> {
        value.to_le_bytes().to_vec()
    }
    
    pub fn decrypt(encrypted: &[u8]) -> u64 {
        u64::from_le_bytes(encrypted.try_into().unwrap())
    }
}
```

## 📊 State Privacy Guidelines
- **Always Encrypted:** `salary_per_second`, `bonus_amount`
- **Public (for settlement):** `total_accrued` (cumulative only, not per-period)
- **Semi-Private:** `last_withdraw` (timestamp is public, but doesn't reveal amount)
