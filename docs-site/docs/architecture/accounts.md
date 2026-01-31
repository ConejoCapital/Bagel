---
sidebar_position: 2
---

# Account Structures

Detailed documentation of all on-chain account structures.

## MasterVault

The global vault holding aggregate funds and encrypted counters.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              MasterVault                                      │
│                            Total Size: 162 bytes                              │
├──────────┬──────────┬───────────────────────────────┬────────────────────────┤
│  Offset  │  Size    │  Field                        │  Type                  │
├──────────┼──────────┼───────────────────────────────┼────────────────────────┤
│  0       │  8       │  discriminator                │  [u8; 8]               │
│  8       │  32      │  authority                    │  Pubkey                │
│  40      │  8       │  total_balance                │  u64                   │
│  48      │  16      │  encrypted_business_count     │  Euint128              │
│  64      │  16      │  encrypted_employee_count     │  Euint128              │
│  80      │  8       │  next_business_index          │  u64                   │
│  88      │  1       │  is_active                    │  bool                  │
│  89      │  1       │  bump                         │  u8                    │
│  90      │  32      │  confidential_mint            │  Pubkey                │
│  122     │  1       │  use_confidential_tokens      │  bool                  │
│  123     │  39      │  padding                      │  [u8; 39]              │
└──────────┴──────────┴───────────────────────────────┴────────────────────────┘
```

### Rust Definition

```rust
#[account]
pub struct MasterVault {
    /// Program authority
    pub authority: Pubkey,

    /// Total balance (PUBLIC - unavoidable)
    pub total_balance: u64,

    /// ENCRYPTED business count
    pub encrypted_business_count: Euint128,

    /// ENCRYPTED employee count
    pub encrypted_employee_count: Euint128,

    /// Next business index for PDA derivation
    pub next_business_index: u64,

    /// Is vault active
    pub is_active: bool,

    /// Bump seed
    pub bump: u8,

    /// Confidential token mint
    pub confidential_mint: Pubkey,

    /// Use confidential tokens flag
    pub use_confidential_tokens: bool,
}
```

### PDA Derivation

```rust
seeds = [b"master_vault"]
```

```typescript
const [masterVaultPda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from('master_vault')],
  BAGEL_PROGRAM_ID
);
```

---

## BusinessEntry

Represents a registered business with encrypted identity and balance.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BusinessEntry                                    │
│                            Total Size: 138 bytes                              │
├──────────┬──────────┬───────────────────────────────┬────────────────────────┤
│  Offset  │  Size    │  Field                        │  Type                  │
├──────────┼──────────┼───────────────────────────────┼────────────────────────┤
│  0       │  8       │  discriminator                │  [u8; 8]               │
│  8       │  32      │  master_vault                 │  Pubkey                │
│  40      │  8       │  entry_index                  │  u64                   │
│  48      │  16      │  encrypted_employer_id        │  Euint128              │
│  64      │  16      │  encrypted_balance            │  Euint128              │
│  80      │  16      │  encrypted_employee_count     │  Euint128              │
│  96      │  8       │  next_employee_index          │  u64                   │
│  104     │  1       │  is_active                    │  bool                  │
│  105     │  1       │  bump                         │  u8                    │
│  106     │  32      │  padding                      │  [u8; 32]              │
└──────────┴──────────┴───────────────────────────────┴────────────────────────┘
```

### Rust Definition

```rust
#[account]
pub struct BusinessEntry {
    /// Reference to master vault
    pub master_vault: Pubkey,

    /// Entry index (NOT employer pubkey!)
    pub entry_index: u64,

    /// ENCRYPTED employer ID (hash of pubkey)
    pub encrypted_employer_id: Euint128,

    /// ENCRYPTED balance
    pub encrypted_balance: Euint128,

    /// ENCRYPTED employee count
    pub encrypted_employee_count: Euint128,

    /// Next employee index
    pub next_employee_index: u64,

    /// Is active
    pub is_active: bool,

    /// Bump seed
    pub bump: u8,
}
```

### PDA Derivation

```rust
seeds = [b"entry", master_vault.key().as_ref(), &entry_index.to_le_bytes()]
```

```typescript
const [businessEntryPda, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('entry'),
    masterVaultPda.toBuffer(),
    new BN(entryIndex).toArrayLike(Buffer, 'le', 8),
  ],
  BAGEL_PROGRAM_ID
);
```

---

## EmployeeEntry

Represents an employee with encrypted salary and accrued balance.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              EmployeeEntry                                    │
│                            Total Size: 138 bytes                              │
├──────────┬──────────┬───────────────────────────────┬────────────────────────┤
│  Offset  │  Size    │  Field                        │  Type                  │
├──────────┼──────────┼───────────────────────────────┼────────────────────────┤
│  0       │  8       │  discriminator                │  [u8; 8]               │
│  8       │  32      │  business_entry               │  Pubkey                │
│  40      │  8       │  employee_index               │  u64                   │
│  48      │  16      │  encrypted_employee_id        │  Euint128              │
│  64      │  16      │  encrypted_salary             │  Euint128              │
│  80      │  16      │  encrypted_accrued            │  Euint128              │
│  96      │  8       │  last_action                  │  i64                   │
│  104     │  1       │  is_active                    │  bool                  │
│  105     │  1       │  bump                         │  u8                    │
│  106     │  32      │  padding                      │  [u8; 32]              │
└──────────┴──────────┴───────────────────────────────┴────────────────────────┘
```

### Rust Definition

```rust
#[account]
pub struct EmployeeEntry {
    /// Reference to business entry
    pub business_entry: Pubkey,

    /// Employee index (NOT employee pubkey!)
    pub employee_index: u64,

    /// ENCRYPTED employee ID (hash of pubkey)
    pub encrypted_employee_id: Euint128,

    /// ENCRYPTED salary
    pub encrypted_salary: Euint128,

    /// ENCRYPTED accrued amount
    pub encrypted_accrued: Euint128,

    /// Last action timestamp
    pub last_action: i64,

    /// Is active
    pub is_active: bool,

    /// Bump seed
    pub bump: u8,
}
```

### PDA Derivation

```rust
seeds = [b"employee", business_entry.key().as_ref(), &employee_index.to_le_bytes()]
```

```typescript
const [employeeEntryPda, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('employee'),
    businessEntryPda.toBuffer(),
    new BN(employeeIndex).toArrayLike(Buffer, 'le', 8),
  ],
  BAGEL_PROGRAM_ID
);
```

---

## UserTokenAccount

PDA-based registry for deterministic token account lookup.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            UserTokenAccount                                   │
│                            Total Size: 160 bytes                              │
├──────────┬──────────┬───────────────────────────────┬────────────────────────┤
│  Offset  │  Size    │  Field                        │  Type                  │
├──────────┼──────────┼───────────────────────────────┼────────────────────────┤
│  0       │  8       │  discriminator                │  [u8; 8]               │
│  8       │  32      │  owner                        │  Pubkey                │
│  40      │  32      │  mint                         │  Pubkey                │
│  72      │  32      │  inco_token_account           │  Pubkey                │
│  104     │  16      │  balance                      │  Euint128              │
│  120     │  8       │  initialized_at               │  i64                   │
│  128     │  1       │  bump                         │  u8                    │
│  129     │  31      │  padding                      │  [u8; 31]              │
└──────────┴──────────┴───────────────────────────────┴────────────────────────┘
```

### Rust Definition

```rust
#[account]
pub struct UserTokenAccount {
    /// The wallet that owns this token account
    pub owner: Pubkey,

    /// The mint this token account is for
    pub mint: Pubkey,

    /// Reference to the actual Inco Token account
    pub inco_token_account: Pubkey,

    /// ENCRYPTED balance (cached from Inco)
    pub balance: Euint128,

    /// Timestamp when initialized
    pub initialized_at: i64,

    /// Bump seed for PDA derivation
    pub bump: u8,
}
```

### PDA Derivation

```rust
seeds = [b"user_token", owner.key().as_ref(), mint.key().as_ref()]
```

```typescript
const [userTokenPda, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('user_token'),
    ownerPubkey.toBuffer(),
    mintPubkey.toBuffer(),
  ],
  BAGEL_PROGRAM_ID
);
```

---

## Privacy Analysis

| Account | Encrypted Fields | Public Fields |
|---------|------------------|---------------|
| MasterVault | business_count, employee_count | authority, total_balance |
| BusinessEntry | employer_id, balance, employee_count | entry_index |
| EmployeeEntry | employee_id, salary, accrued | employee_index, last_action |
| UserTokenAccount | balance | owner, mint |

## Size Constants

```rust
impl MasterVault {
    pub const LEN: usize = 8 + 32 + 8 + 16 + 16 + 8 + 1 + 1 + 32 + 1 + 39;
    // = 162 bytes
}

impl BusinessEntry {
    pub const LEN: usize = 8 + 32 + 8 + 16 + 16 + 16 + 8 + 1 + 1 + 32;
    // = 138 bytes
}

impl EmployeeEntry {
    pub const LEN: usize = 8 + 32 + 8 + 16 + 16 + 16 + 8 + 1 + 1 + 32;
    // = 138 bytes
}

impl UserTokenAccount {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 16 + 8 + 1 + 31;
    // = 160 bytes
}
```
