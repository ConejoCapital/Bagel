---
sidebar_position: 2
---

# Getting Started

This guide will help you set up and start using the Bagel Protocol in your application.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **Solana CLI** installed and configured for devnet
- A **Solana wallet** with devnet SOL
- Basic understanding of Solana development

## Quick Start

### 1. Install Dependencies

```bash
# Using npm
npm install @bagel/sdk @inco/sdk @solana/web3.js @coral-xyz/anchor

# Using yarn
yarn add @bagel/sdk @inco/sdk @solana/web3.js @coral-xyz/anchor

# Using bun
bun add @bagel/sdk @inco/sdk @solana/web3.js @coral-xyz/anchor
```

### 2. Configure Your Environment

Create a `.env.local` file:

```env
# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Bagel Program ID
NEXT_PUBLIC_BAGEL_PROGRAM_ID=AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj

# Inco Configuration
NEXT_PUBLIC_INCO_NETWORK=devnet

# USDBagel Token Mint
NEXT_PUBLIC_USDBAGEL_MINT=GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt
```

### 3. Initialize the SDK

```typescript
import { Connection } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { IncoClient } from '@inco/sdk';
import { BagelIDL, BAGEL_PROGRAM_ID } from '@bagel/sdk';

// Create connection
const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);

// Create provider (with wallet)
const provider = new AnchorProvider(connection, wallet, {
  commitment: 'confirmed',
});

// Initialize Bagel program
const program = new Program(BagelIDL, BAGEL_PROGRAM_ID, provider);

// Initialize Inco client for encryption
const incoClient = new IncoClient({
  network: 'devnet',
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
});
```

### 4. Register a Business

```typescript
import { PublicKey } from '@solana/web3.js';

// Derive Master Vault PDA
const [masterVaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('master_vault')],
  BAGEL_PROGRAM_ID
);

// Get vault to read next_business_index
const vault = await program.account.masterVault.fetch(masterVaultPda);

// Derive Business Entry PDA
const [businessEntryPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('entry'),
    masterVaultPda.toBuffer(),
    new BN(vault.nextBusinessIndex).toArrayLike(Buffer, 'le', 8),
  ],
  BAGEL_PROGRAM_ID
);

// Encrypt employer identity
const employerIdHash = await incoClient.hashPubkey(wallet.publicKey);
const encryptedEmployerId = await incoClient.encrypt(employerIdHash);

// Register business
await program.methods
  .registerBusiness(Buffer.from(encryptedEmployerId))
  .accounts({
    employer: wallet.publicKey,
    masterVault: masterVaultPda,
    businessEntry: businessEntryPda,
    incoLightningProgram: INCO_LIGHTNING_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log('Business registered at index:', vault.nextBusinessIndex.toString());
```

### 5. Add an Employee

```typescript
// Get business to read next_employee_index
const business = await program.account.businessEntry.fetch(businessEntryPda);

// Derive Employee Entry PDA
const [employeeEntryPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('employee'),
    businessEntryPda.toBuffer(),
    new BN(business.nextEmployeeIndex).toArrayLike(Buffer, 'le', 8),
  ],
  BAGEL_PROGRAM_ID
);

// Encrypt employee data
const employeeIdHash = await incoClient.hashPubkey(employeeWalletPubkey);
const encryptedEmployeeId = await incoClient.encrypt(employeeIdHash);
const encryptedSalary = await incoClient.encryptSalary(100_000_000); // 100 USDC

// Add employee
await program.methods
  .addEmployee(
    Buffer.from(encryptedEmployeeId),
    Buffer.from(encryptedSalary)
  )
  .accounts({
    employer: wallet.publicKey,
    masterVault: masterVaultPda,
    businessEntry: businessEntryPda,
    employeeEntry: employeeEntryPda,
    incoLightningProgram: INCO_LIGHTNING_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log('Employee added at index:', business.nextEmployeeIndex.toString());
```

### 6. Deposit Funds

```typescript
// Encrypt deposit amount
const encryptedAmount = await incoClient.encrypt(1_000_000_000); // 1000 USDC

// Deposit (confidential transfer)
await program.methods
  .deposit(Buffer.from(encryptedAmount))
  .accounts({
    depositor: wallet.publicKey,
    masterVault: masterVaultPda,
    businessEntry: businessEntryPda,
    incoLightningProgram: INCO_LIGHTNING_ID,
    incoTokenProgram: INCO_TOKEN_ID,
    depositorTokenAccount: depositorTokenPda,
    masterVaultTokenAccount: vaultTokenPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log('Deposit successful (amount encrypted)');
```

### 7. Request Withdrawal (Employee)

```typescript
// Employee encrypts withdrawal amount
const encryptedWithdrawal = await incoClient.encrypt(50_000_000); // 50 USDC

// Request withdrawal
await program.methods
  .requestWithdrawal(
    Buffer.from(encryptedWithdrawal),
    false // use_shadowwire
  )
  .accounts({
    withdrawer: employeeWallet.publicKey,
    masterVault: masterVaultPda,
    businessEntry: businessEntryPda,
    employeeEntry: employeeEntryPda,
    incoLightningProgram: INCO_LIGHTNING_ID,
    incoTokenProgram: INCO_TOKEN_ID,
    masterVaultTokenAccount: vaultTokenPda,
    employeeTokenAccount: employeeTokenPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log('Withdrawal processed (amount encrypted)');
```

## What's Next?

Now that you have the basics working:

1. [Learn about the privacy layer](./core-concepts/privacy-layer) - Understand how FHE protects your data
2. [Explore the architecture](./architecture/overview) - Deep dive into the system design
3. [Check the API reference](./reference/program-api) - Full documentation of all instructions
4. [Enable real-time streaming](./integration/magicblock-tee) - Set up MagicBlock TEE for streaming payments

## Example Repository

Check out our [example repository](https://github.com/ConejoCapital/Bagel-examples) for complete working examples including:

- React/Next.js integration
- Full payroll workflow
- TEE streaming setup
- Testing patterns
