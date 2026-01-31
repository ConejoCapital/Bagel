---
sidebar_position: 1
---

# Program API Reference

Complete API reference for the Bagel Solana program.

## Program Information

| Property | Value |
|----------|-------|
| Program ID | `AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj` |
| Framework | Anchor 0.29+ |
| Language | Rust |
| Network | Devnet |

## Instructions

### initialize_vault

Creates the global master vault (one-time setup).

```rust
pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()>
```

**Accounts:**

| Name | Type | Mutable | Signer | Description |
|------|------|---------|--------|-------------|
| authority | SystemAccount | Yes | Yes | Vault authority |
| master_vault | MasterVault | Yes | No | PDA: `["master_vault"]` |
| inco_lightning_program | AccountInfo | No | No | Inco Lightning ID |
| system_program | Program | No | No | System program |

**Events:** `VaultInitialized`

---

### register_business

Registers a new business with encrypted identity.

```rust
pub fn register_business(
    ctx: Context<RegisterBusiness>,
    encrypted_employer_id: Vec<u8>,
) -> Result<()>
```

**Arguments:**

| Name | Type | Description |
|------|------|-------------|
| encrypted_employer_id | Vec\<u8\> | E(hash(employer_pubkey)) |

**Accounts:**

| Name | Type | Mutable | Signer | Description |
|------|------|---------|--------|-------------|
| employer | SystemAccount | Yes | Yes | Employer wallet |
| master_vault | MasterVault | Yes | No | Master vault |
| business_entry | BusinessEntry | Yes | No | PDA to create |
| inco_lightning_program | AccountInfo | No | No | Inco Lightning |
| system_program | Program | No | No | System program |

**Events:** `BusinessRegistered`

---

### deposit

Deposits funds using confidential token transfer.

```rust
pub fn deposit(
    ctx: Context<Deposit>,
    encrypted_amount: Vec<u8>,
) -> Result<()>
```

**Arguments:**

| Name | Type | Description |
|------|------|-------------|
| encrypted_amount | Vec\<u8\> | Encrypted deposit amount |

**Accounts:**

| Name | Type | Mutable | Signer | Description |
|------|------|---------|--------|-------------|
| depositor | SystemAccount | Yes | Yes | Depositor wallet |
| master_vault | MasterVault | Yes | No | Master vault |
| business_entry | BusinessEntry | Yes | No | Business entry |
| inco_lightning_program | AccountInfo | No | No | Inco Lightning |
| inco_token_program | Option\<AccountInfo\> | No | No | Inco Tokens |
| depositor_token_account | Option\<AccountInfo\> | Yes | No | Source tokens |
| master_vault_token_account | Option\<AccountInfo\> | Yes | No | Vault tokens |
| system_program | Program | No | No | System program |

**Events:** `FundsDeposited`

---

### add_employee

Adds an employee with encrypted identity and salary.

```rust
pub fn add_employee(
    ctx: Context<AddEmployee>,
    encrypted_employee_id: Vec<u8>,
    encrypted_salary: Vec<u8>,
) -> Result<()>
```

**Arguments:**

| Name | Type | Description |
|------|------|-------------|
| encrypted_employee_id | Vec\<u8\> | E(hash(employee_pubkey)) |
| encrypted_salary | Vec\<u8\> | E(salary_per_period) |

**Accounts:**

| Name | Type | Mutable | Signer | Description |
|------|------|---------|--------|-------------|
| employer | SystemAccount | Yes | Yes | Employer wallet |
| master_vault | MasterVault | Yes | No | Master vault |
| business_entry | BusinessEntry | Yes | No | Business entry |
| employee_entry | EmployeeEntry | Yes | No | PDA to create |
| inco_lightning_program | AccountInfo | No | No | Inco Lightning |
| system_program | Program | No | No | System program |

**Events:** `EmployeeAdded`

---

### request_withdrawal

Processes employee withdrawal.

```rust
pub fn request_withdrawal(
    ctx: Context<RequestWithdrawal>,
    encrypted_amount: Vec<u8>,
    use_shadowwire: bool,
) -> Result<()>
```

**Arguments:**

| Name | Type | Description |
|------|------|-------------|
| encrypted_amount | Vec\<u8\> | Encrypted withdrawal amount |
| use_shadowwire | bool | Enable additional ZK privacy |

**Constraints:**

- `is_active` must be true
- Time since `last_action` >= 60 seconds

**Events:** `WithdrawalProcessed`

---

### configure_confidential_mint

Configures confidential token mint.

```rust
pub fn configure_confidential_mint(
    ctx: Context<ConfigureConfidentialMint>,
    mint: Pubkey,
    enable: bool,
) -> Result<()>
```

**Arguments:**

| Name | Type | Description |
|------|------|-------------|
| mint | Pubkey | Token mint address |
| enable | bool | Enable/disable feature |

**Events:** `ConfidentialMintConfigured`

---

### delegate_to_tee

Delegates employee entry to MagicBlock TEE.

```rust
pub fn delegate_to_tee(ctx: Context<DelegateToTee>) -> Result<()>
```

**Events:** `DelegatedToTee`

---

### commit_from_tee

Commits TEE state to L1.

```rust
pub fn commit_from_tee(ctx: Context<CommitFromTee>) -> Result<()>
```

**Events:** `CommittedFromTee`

---

### migrate_vault

Upgrades vault schema.

```rust
pub fn migrate_vault(ctx: Context<MigrateVault>) -> Result<()>
```

---

### close_vault

Closes vault (testing only).

```rust
pub fn close_vault(ctx: Context<CloseVault>) -> Result<()>
```

**Constraints:**

- Caller must be authority
- `total_balance` must be 0

---

### initialize_user_token_account

Creates PDA-based token account.

```rust
pub fn initialize_user_token_account(
    ctx: Context<InitializeUserTokenAccount>,
) -> Result<()>
```

**Events:** `UserTokenAccountInitialized`

---

### set_inco_token_account

Links Inco token account to PDA.

```rust
pub fn set_inco_token_account(
    ctx: Context<SetIncoTokenAccount>,
    inco_token_account: Pubkey,
) -> Result<()>
```

**Events:** `IncoTokenAccountLinked`

## Account Types

### MasterVault

```rust
pub struct MasterVault {
    pub authority: Pubkey,                      // 32
    pub total_balance: u64,                     // 8
    pub encrypted_business_count: Euint128,     // 16
    pub encrypted_employee_count: Euint128,     // 16
    pub next_business_index: u64,               // 8
    pub is_active: bool,                        // 1
    pub bump: u8,                               // 1
    pub confidential_mint: Pubkey,              // 32
    pub use_confidential_tokens: bool,          // 1
}
// Total: 162 bytes
```

### BusinessEntry

```rust
pub struct BusinessEntry {
    pub master_vault: Pubkey,                   // 32
    pub entry_index: u64,                       // 8
    pub encrypted_employer_id: Euint128,        // 16
    pub encrypted_balance: Euint128,            // 16
    pub encrypted_employee_count: Euint128,     // 16
    pub next_employee_index: u64,               // 8
    pub is_active: bool,                        // 1
    pub bump: u8,                               // 1
}
// Total: 138 bytes
```

### EmployeeEntry

```rust
pub struct EmployeeEntry {
    pub business_entry: Pubkey,                 // 32
    pub employee_index: u64,                    // 8
    pub encrypted_employee_id: Euint128,        // 16
    pub encrypted_salary: Euint128,             // 16
    pub encrypted_accrued: Euint128,            // 16
    pub last_action: i64,                       // 8
    pub is_active: bool,                        // 1
    pub bump: u8,                               // 1
}
// Total: 138 bytes
```

### UserTokenAccount

```rust
pub struct UserTokenAccount {
    pub owner: Pubkey,                          // 32
    pub mint: Pubkey,                           // 32
    pub inco_token_account: Pubkey,             // 32
    pub balance: Euint128,                      // 16
    pub initialized_at: i64,                    // 8
    pub bump: u8,                               // 1
}
// Total: 160 bytes
```

## PDA Seeds

| Account | Seeds |
|---------|-------|
| MasterVault | `["master_vault"]` |
| BusinessEntry | `["entry", master_vault, entry_index]` |
| EmployeeEntry | `["employee", business_entry, employee_index]` |
| UserTokenAccount | `["user_token", owner, mint]` |

## Error Codes

| Code | Name | Message |
|------|------|---------|
| 6000 | InvalidCiphertext | Invalid ciphertext provided |
| 6001 | InvalidAmount | Amount must be greater than zero |
| 6002 | Overflow | Arithmetic overflow |
| 6003 | Underflow | Arithmetic underflow |
| 6004 | InvalidTimestamp | Invalid timestamp |
| 6005 | WithdrawTooSoon | Must wait at least 60 seconds |
| 6006 | NoAccruedDough | No accrued balance to withdraw |
| 6007 | InsufficientFunds | Insufficient funds in vault |
| 6008 | Unauthorized | Unauthorized |
| 6009 | PayrollInactive | Entry is not active |
| 6010 | InvalidState | Invalid state for operation |
| 6011 | IdentityVerificationFailed | Identity verification failed |
