---
sidebar_position: 2
---

# TypeScript SDK Reference

Complete TypeScript SDK reference for Bagel Protocol.

## Installation

```bash
npm install @bagel/sdk @inco/sdk @solana/web3.js @coral-xyz/anchor
```

## Quick Start

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { IncoClient } from '@inco/sdk';

// Program ID
const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');

// Initialize
const connection = new Connection(RPC_URL);
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(BagelIDL, BAGEL_PROGRAM_ID, provider);
const incoClient = new IncoClient({ network: 'devnet' });
```

## PDA Derivation

### masterVaultPda

```typescript
export function getMasterVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('master_vault')],
    BAGEL_PROGRAM_ID
  );
}
```

### businessEntryPda

```typescript
export function getBusinessEntryPda(
  masterVault: PublicKey,
  entryIndex: number | BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('entry'),
      masterVault.toBuffer(),
      new BN(entryIndex).toArrayLike(Buffer, 'le', 8),
    ],
    BAGEL_PROGRAM_ID
  );
}
```

### employeeEntryPda

```typescript
export function getEmployeeEntryPda(
  businessEntry: PublicKey,
  employeeIndex: number | BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('employee'),
      businessEntry.toBuffer(),
      new BN(employeeIndex).toArrayLike(Buffer, 'le', 8),
    ],
    BAGEL_PROGRAM_ID
  );
}
```

### userTokenPda

```typescript
export function getUserTokenPda(
  owner: PublicKey,
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('user_token'),
      owner.toBuffer(),
      mint.toBuffer(),
    ],
    BAGEL_PROGRAM_ID
  );
}
```

## Instructions

### initializeVault

```typescript
async function initializeVault(
  program: Program,
  authority: PublicKey
): Promise<string> {
  const [masterVaultPda] = getMasterVaultPda();

  return program.methods
    .initializeVault()
    .accounts({
      authority,
      masterVault: masterVaultPda,
      incoLightningProgram: INCO_LIGHTNING_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
```

### registerBusiness

```typescript
async function registerBusiness(
  program: Program,
  incoClient: IncoClient,
  employer: PublicKey
): Promise<string> {
  const [masterVaultPda] = getMasterVaultPda();
  const vault = await program.account.masterVault.fetch(masterVaultPda);

  const [businessEntryPda] = getBusinessEntryPda(
    masterVaultPda,
    vault.nextBusinessIndex
  );

  // Encrypt employer identity
  const employerHash = await incoClient.hashPubkey(employer);
  const encryptedEmployerId = await incoClient.encrypt(employerHash);

  return program.methods
    .registerBusiness(Buffer.from(encryptedEmployerId))
    .accounts({
      employer,
      masterVault: masterVaultPda,
      businessEntry: businessEntryPda,
      incoLightningProgram: INCO_LIGHTNING_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
```

### deposit

```typescript
async function deposit(
  program: Program,
  incoClient: IncoClient,
  depositor: PublicKey,
  businessEntryPda: PublicKey,
  amount: bigint
): Promise<string> {
  const [masterVaultPda] = getMasterVaultPda();

  // Encrypt amount
  const encryptedAmount = await incoClient.encrypt(amount);

  return program.methods
    .deposit(Buffer.from(encryptedAmount))
    .accounts({
      depositor,
      masterVault: masterVaultPda,
      businessEntry: businessEntryPda,
      incoLightningProgram: INCO_LIGHTNING_ID,
      incoTokenProgram: INCO_TOKEN_ID,
      depositorTokenAccount: await getUserTokenPda(depositor, USDBAGEL_MINT)[0],
      masterVaultTokenAccount: await getVaultTokenPda(),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
```

### addEmployee

```typescript
async function addEmployee(
  program: Program,
  incoClient: IncoClient,
  employer: PublicKey,
  businessEntryPda: PublicKey,
  employeePubkey: PublicKey,
  salaryPerPeriod: bigint
): Promise<string> {
  const [masterVaultPda] = getMasterVaultPda();
  const business = await program.account.businessEntry.fetch(businessEntryPda);

  const [employeeEntryPda] = getEmployeeEntryPda(
    businessEntryPda,
    business.nextEmployeeIndex
  );

  // Encrypt employee data
  const employeeHash = await incoClient.hashPubkey(employeePubkey);
  const encryptedEmployeeId = await incoClient.encrypt(employeeHash);
  const encryptedSalary = await incoClient.encrypt(salaryPerPeriod);

  return program.methods
    .addEmployee(
      Buffer.from(encryptedEmployeeId),
      Buffer.from(encryptedSalary)
    )
    .accounts({
      employer,
      masterVault: masterVaultPda,
      businessEntry: businessEntryPda,
      employeeEntry: employeeEntryPda,
      incoLightningProgram: INCO_LIGHTNING_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
```

### requestWithdrawal

```typescript
async function requestWithdrawal(
  program: Program,
  incoClient: IncoClient,
  withdrawer: PublicKey,
  businessEntryPda: PublicKey,
  employeeEntryPda: PublicKey,
  amount: bigint,
  useShadowwire: boolean = false
): Promise<string> {
  const [masterVaultPda] = getMasterVaultPda();

  // Encrypt amount
  const encryptedAmount = await incoClient.encrypt(amount);

  return program.methods
    .requestWithdrawal(Buffer.from(encryptedAmount), useShadowwire)
    .accounts({
      withdrawer,
      masterVault: masterVaultPda,
      businessEntry: businessEntryPda,
      employeeEntry: employeeEntryPda,
      incoLightningProgram: INCO_LIGHTNING_ID,
      incoTokenProgram: INCO_TOKEN_ID,
      masterVaultTokenAccount: await getVaultTokenPda(),
      employeeTokenAccount: await getUserTokenPda(withdrawer, USDBAGEL_MINT)[0],
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
```

## Account Fetching

### fetchMasterVault

```typescript
async function fetchMasterVault(program: Program) {
  const [masterVaultPda] = getMasterVaultPda();
  return program.account.masterVault.fetch(masterVaultPda);
}
```

### fetchBusinessEntry

```typescript
async function fetchBusinessEntry(
  program: Program,
  entryIndex: number
) {
  const [masterVaultPda] = getMasterVaultPda();
  const [businessEntryPda] = getBusinessEntryPda(masterVaultPda, entryIndex);
  return program.account.businessEntry.fetch(businessEntryPda);
}
```

### fetchEmployeeEntry

```typescript
async function fetchEmployeeEntry(
  program: Program,
  businessEntryPda: PublicKey,
  employeeIndex: number
) {
  const [employeeEntryPda] = getEmployeeEntryPda(businessEntryPda, employeeIndex);
  return program.account.employeeEntry.fetch(employeeEntryPda);
}
```

## Decryption

### decryptBalance

```typescript
async function decryptBalance(
  incoClient: IncoClient,
  encryptedBalance: Uint8Array
): Promise<bigint> {
  return incoClient.decrypt(encryptedBalance);
}
```

### decryptSalary

```typescript
async function decryptSalary(
  incoClient: IncoClient,
  employee: EmployeeEntry
): Promise<number> {
  const salary = await incoClient.decrypt(employee.encryptedSalary);
  return Number(salary) / 1_000_000; // Convert to USDC
}
```

## React Hooks

### useProgram

```typescript
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;

    const provider = new AnchorProvider(connection, wallet, {});
    return new Program(BagelIDL, BAGEL_PROGRAM_ID, provider);
  }, [connection, wallet]);
}
```

### useMasterVault

```typescript
import { useQuery } from '@tanstack/react-query';

export function useMasterVault() {
  const program = useProgram();

  return useQuery({
    queryKey: ['masterVault'],
    queryFn: () => fetchMasterVault(program!),
    enabled: !!program,
  });
}
```

### useEmployeeAccrued

```typescript
export function useEmployeeAccrued(
  businessEntryPda: PublicKey,
  employeeIndex: number
) {
  const program = useProgram();
  const incoClient = useIncoClient();

  return useQuery({
    queryKey: ['employee', businessEntryPda.toBase58(), employeeIndex],
    queryFn: async () => {
      const employee = await fetchEmployeeEntry(
        program!,
        businessEntryPda,
        employeeIndex
      );
      const accrued = await incoClient.decrypt(employee.encryptedAccrued);
      return Number(accrued) / 1_000_000;
    },
    enabled: !!program && !!incoClient,
    refetchInterval: 5000,
  });
}
```

## Types

```typescript
interface MasterVault {
  authority: PublicKey;
  totalBalance: BN;
  encryptedBusinessCount: Uint8Array;
  encryptedEmployeeCount: Uint8Array;
  nextBusinessIndex: BN;
  isActive: boolean;
  bump: number;
  confidentialMint: PublicKey;
  useConfidentialTokens: boolean;
}

interface BusinessEntry {
  masterVault: PublicKey;
  entryIndex: BN;
  encryptedEmployerId: Uint8Array;
  encryptedBalance: Uint8Array;
  encryptedEmployeeCount: Uint8Array;
  nextEmployeeIndex: BN;
  isActive: boolean;
  bump: number;
}

interface EmployeeEntry {
  businessEntry: PublicKey;
  employeeIndex: BN;
  encryptedEmployeeId: Uint8Array;
  encryptedSalary: Uint8Array;
  encryptedAccrued: Uint8Array;
  lastAction: BN;
  isActive: boolean;
  bump: number;
}
```

## Constants

```typescript
export const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');
export const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
export const INCO_TOKEN_ID = new PublicKey('HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22');
export const MAGICBLOCK_ID = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh');
export const USDBAGEL_MINT = new PublicKey('A3G2NBGL7xH9T6BYwVkwRGsSYxtFPdg4HSThfTmV94ht');
export const MIN_WITHDRAW_INTERVAL = 60; // seconds
```
