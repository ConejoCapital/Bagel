---
sidebar_position: 5
---

# Vault Integration

Guide to vault token custody and transfer mechanics in the Payroll Program.

## Vault Architecture

The Payroll Program uses a per-business vault model where each business has isolated token custody.

```mermaid
graph TB
    subgraph Business1["Business 1"]
        B1[Business PDA]
        V1[BusinessVault PDA]
        T1[Inco Token Account 1]
    end

    subgraph Business2["Business 2"]
        B2[Business PDA]
        V2[BusinessVault PDA]
        T2[Inco Token Account 2]
    end

    B1 --> V1
    V1 -->|owns| T1
    B2 --> V2
    V2 -->|owns| T2

    T1 -->|transfer| E1[Employee Tokens]
    T2 -->|transfer| E2[Employee Tokens]
```

## Token Account Setup

### Step 1: Create Vault Token Account

The vault token account must be created via the Inco Token Program **before** initializing the vault:

```typescript
import { Keypair } from '@solana/web3.js';

// Generate keypair for vault token account
const vaultTokenAccountKeypair = Keypair.generate();

// Derive vault PDA (will be owner of token account)
const [vaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('vault'), businessPda.toBuffer()],
  PAYROLL_PROGRAM_ID
);

// Create Inco Token Account with vault PDA as owner
const INCO_TOKEN_PROGRAM_ID = new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N');

const initAccountIx = new TransactionInstruction({
  keys: [
    { pubkey: vaultTokenAccountKeypair.publicKey, isSigner: true, isWritable: true },
    { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
    { pubkey: vaultPda, isSigner: false, isWritable: false },  // Owner = Vault PDA
    { pubkey: payerWallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  programId: INCO_TOKEN_PROGRAM_ID,
  data: Buffer.from([/* initialize_account discriminator */]),
});

await sendAndConfirmTransaction(
  connection,
  new Transaction().add(initAccountIx),
  [payerWallet, vaultTokenAccountKeypair]
);
```

### Step 2: Initialize BusinessVault

```typescript
await program.methods
  .initVault(USDBAGEL_MINT, vaultTokenAccount)
  .accounts({
    owner: wallet.publicKey,
    business: businessPda,
    vault: vaultPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Deposit Flow

```mermaid
sequenceDiagram
    participant E as Employer
    participant P as Payroll Program
    participant IT as Inco Token Program
    participant VT as Vault Token Account

    E->>P: deposit(encrypted_amount)
    P->>IT: CPI transfer instruction
    IT->>VT: Credit encrypted amount
    IT-->>P: Success
    P-->>E: FundsDeposited event
```

```typescript
const encryptedAmount = await incoClient.encrypt(1_000_000_000n);

await program.methods
  .deposit(Buffer.from(encryptedAmount))
  .accounts({
    owner: wallet.publicKey,
    business: businessPda,
    vault: vaultPda,
    depositorTokenAccount: ownerTokenAccount,
    vaultTokenAccount: vaultTokenAccount,
    incoTokenProgram: INCO_TOKEN_PROGRAM_ID,
    incoLightningProgram: INCO_LIGHTNING_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Withdrawal Flow

The vault PDA signs withdrawal transfers using `invoke_signed`:

```rust
let vault_seeds: &[&[&[u8]]] = &[&[
    b"vault",
    business.key().as_ref(),
    &[vault.bump],
]];

invoke_signed(&transfer_ix, &[/* accounts */], vault_seeds)?;
```

```mermaid
sequenceDiagram
    participant E as Employee
    participant P as Payroll Program
    participant VP as Vault PDA
    participant IT as Inco Token Program

    E->>P: simple_withdraw(encrypted_amount)
    P->>VP: Sign via invoke_signed
    VP->>IT: CPI transfer
    IT-->>P: Success
    P-->>E: PaymentProcessed event
```

## Token Configuration

### USDBagel Token

| Attribute | Value |
|-----------|-------|
| Mint Address | `GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt` |
| Decimals | 9 |

For employee token account setup, see [Employee Lifecycle - Token Account Setup](./employee-lifecycle#token-account-setup).

## Balance Management

All balance updates use homomorphic operations:

```
Deposit:  vault.balance = e_add(vault.balance, encrypted_deposit)
Withdraw: vault.balance = e_sub(vault.balance, encrypted_withdrawal)
```

### Checking Vault Balance

```typescript
const vault = await program.account.businessVault.fetch(vaultPda);
const balance = await incoClient.decrypt(vault.encryptedBalance, authorizedWallet);
console.log(`Vault balance: ${balance / 1_000_000_000n} USDBagel`);
```

## Security

| Operation | Signer | Authorization |
|-----------|--------|---------------|
| Deposit | Owner wallet | Must own depositor token account |
| Withdrawal | Vault PDA | Program-controlled via `invoke_signed` |

### Confidential Token Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| Amount privacy | All amounts encrypted via FHE |
| Transfer integrity | Inco Token Program verification |
| Balance consistency | Homomorphic arithmetic |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Invalid token account owner | Ensure vault PDA is set as owner during creation |
| Insufficient funds | Check vault balance, deposit more funds |
| CPI transfer failed | Verify token accounts exist and signer authorities |

## Next Steps

- [Employee Lifecycle](./employee-lifecycle) - Employee management flows
- [Instructions Reference](./instructions) - Complete instruction documentation
