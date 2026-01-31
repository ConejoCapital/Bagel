---
sidebar_position: 4
---

# Events

Complete list of Bagel program events.

## Event Reference

### VaultInitialized

Emitted when the master vault is created.

```rust
#[event]
pub struct VaultInitialized {
    pub authority: Pubkey,
    pub timestamp: i64,
}
```

| Field | Type | Description |
|-------|------|-------------|
| authority | Pubkey | Vault authority wallet |
| timestamp | i64 | Unix timestamp |

### BusinessRegistered

Emitted when a business is registered.

```rust
#[event]
pub struct BusinessRegistered {
    pub entry_index: u64,
    pub timestamp: i64,
}
```

| Field | Type | Description |
|-------|------|-------------|
| entry_index | u64 | Business index (not employer pubkey!) |
| timestamp | i64 | Unix timestamp |

**Privacy Note:** Employer pubkey is NOT included.

### FundsDeposited

Emitted when funds are deposited.

```rust
#[event]
pub struct FundsDeposited {
    pub entry_index: u64,
    pub timestamp: i64,
}
```

| Field | Type | Description |
|-------|------|-------------|
| entry_index | u64 | Business index |
| timestamp | i64 | Unix timestamp |

**Privacy Note:** Amount is NOT included.

### EmployeeAdded

Emitted when an employee is added.

```rust
#[event]
pub struct EmployeeAdded {
    pub business_index: u64,
    pub employee_index: u64,
    pub timestamp: i64,
}
```

| Field | Type | Description |
|-------|------|-------------|
| business_index | u64 | Business index |
| employee_index | u64 | Employee index |
| timestamp | i64 | Unix timestamp |

**Privacy Note:** No pubkeys included.

### WithdrawalProcessed

Emitted when a withdrawal is processed.

```rust
#[event]
pub struct WithdrawalProcessed {
    pub business_index: u64,
    pub employee_index: u64,
    pub timestamp: i64,
    pub shadowwire_enabled: bool,
}
```

| Field | Type | Description |
|-------|------|-------------|
| business_index | u64 | Business index |
| employee_index | u64 | Employee index |
| timestamp | i64 | Unix timestamp |
| shadowwire_enabled | bool | ZK privacy flag |

**Privacy Note:** Amount is NOT included.

### DelegatedToTee

Emitted when account is delegated to TEE.

```rust
#[event]
pub struct DelegatedToTee {
    pub business_index: u64,
    pub employee_index: u64,
    pub validator: Pubkey,
    pub timestamp: i64,
}
```

| Field | Type | Description |
|-------|------|-------------|
| business_index | u64 | Business index |
| employee_index | u64 | Employee index |
| validator | Pubkey | TEE validator |
| timestamp | i64 | Unix timestamp |

### CommittedFromTee

Emitted when TEE state is committed.

```rust
#[event]
pub struct CommittedFromTee {
    pub business_index: u64,
    pub employee_index: u64,
    pub timestamp: i64,
}
```

| Field | Type | Description |
|-------|------|-------------|
| business_index | u64 | Business index |
| employee_index | u64 | Employee index |
| timestamp | i64 | Unix timestamp |

### ConfidentialMintConfigured

Emitted when confidential mint is configured.

```rust
#[event]
pub struct ConfidentialMintConfigured {
    pub mint: Pubkey,
    pub enabled: bool,
    pub timestamp: i64,
}
```

| Field | Type | Description |
|-------|------|-------------|
| mint | Pubkey | Token mint address |
| enabled | bool | Feature enabled |
| timestamp | i64 | Unix timestamp |

### UserTokenAccountInitialized

Emitted when user token account is created.

```rust
#[event]
pub struct UserTokenAccountInitialized {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub token_account_pda: Pubkey,
    pub timestamp: i64,
}
```

| Field | Type | Description |
|-------|------|-------------|
| owner | Pubkey | Account owner |
| mint | Pubkey | Token mint |
| token_account_pda | Pubkey | PDA address |
| timestamp | i64 | Unix timestamp |

### IncoTokenAccountLinked

Emitted when Inco token account is linked.

```rust
#[event]
pub struct IncoTokenAccountLinked {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub inco_token_account: Pubkey,
    pub timestamp: i64,
}
```

| Field | Type | Description |
|-------|------|-------------|
| owner | Pubkey | Account owner |
| mint | Pubkey | Token mint |
| inco_token_account | Pubkey | Inco account |
| timestamp | i64 | Unix timestamp |

## Listening to Events

### Using Anchor

```typescript
program.addEventListener('BusinessRegistered', (event, slot) => {
  console.log('Business registered:', event.entryIndex.toString());
  console.log('At slot:', slot);
});

program.addEventListener('WithdrawalProcessed', (event, slot) => {
  console.log('Withdrawal for employee:', event.employeeIndex.toString());
});
```

### Using Helius

```typescript
const ws = new WebSocket(heliusWsUrl);

ws.send(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'logsSubscribe',
  params: [
    { mentions: [BAGEL_PROGRAM_ID.toBase58()] },
    { commitment: 'confirmed' }
  ]
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Parse logs for events
};
```

## Privacy Design

Events are designed to minimize information leakage:

| Event | Public Data | Hidden Data |
|-------|-------------|-------------|
| VaultInitialized | authority | - |
| BusinessRegistered | index | employer pubkey |
| FundsDeposited | index | amount |
| EmployeeAdded | indices | pubkeys, salary |
| WithdrawalProcessed | indices | amount |
| DelegatedToTee | indices, validator | - |
| CommittedFromTee | indices | state changes |
