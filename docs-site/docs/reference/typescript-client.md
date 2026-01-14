---
sidebar_position: 2
title: TypeScript Client
---

# TypeScript Client Reference

Complete reference for Bagel's TypeScript SDK clients.

## Overview

Bagel provides several TypeScript clients:

| Client | File | Purpose |
|--------|------|---------|
| **BagelClient** | `app/lib/bagel-client.ts` | Core program interaction |
| **ArciumClient** | `app/lib/arcium.ts` | Encryption/decryption |
| **ShadowWireClient** | `app/lib/shadowwire.ts` | Private transfers |
| **MagicBlockClient** | `app/lib/magicblock.ts` | Real-time streaming |
| **PrivacyCashClient** | `app/lib/privacycash.ts` | Yield operations |

## Installation

```bash
cd app
npm install
```

## BagelClient

### Constants

```typescript
import { BAGEL_PROGRAM_ID } from './lib/bagel-client';

// Program ID: 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
console.log(BAGEL_PROGRAM_ID.toBase58());
```

### getPayrollJarPDA

Derives the PayrollJar PDA for an employer-employee pair.

```typescript
function getPayrollJarPDA(
  employee: PublicKey,
  employer: PublicKey
): [PublicKey, number]
```

**Parameters:**
- `employee`: Employee's public key
- `employer`: Employer's public key

**Returns:** `[PDA address, bump seed]`

**Example:**

```typescript
import { getPayrollJarPDA } from './lib/bagel-client';
import { PublicKey } from '@solana/web3.js';

const employee = new PublicKey('...');
const employer = new PublicKey('...');

const [pda, bump] = getPayrollJarPDA(employee, employer);
console.log('PayrollJar:', pda.toBase58());
console.log('Bump:', bump);
```

---

### createPayroll

Creates a new payroll for an employee.

```typescript
async function createPayroll(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey,
  salaryPerSecond: number
): Promise<string>
```

**Parameters:**
- `connection`: Solana RPC connection
- `wallet`: Connected wallet (from `useWallet()`)
- `employee`: Employee's public key
- `salaryPerSecond`: Salary rate in lamports/second

**Returns:** Transaction signature

**Example:**

```typescript
import { createPayroll } from './lib/bagel-client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

const { connection } = useConnection();
const wallet = useWallet();

const txId = await createPayroll(
  connection,
  wallet,
  new PublicKey('EMPLOYEE_ADDRESS'),
  3_170_000  // ~$100k/year
);

console.log('Transaction:', txId);
```

---

### depositDough

Deposits funds into a payroll.

```typescript
async function depositDough(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey,
  amountLamports: number
): Promise<string>
```

**Parameters:**
- `connection`: Solana RPC connection
- `wallet`: Connected wallet (employer)
- `employee`: Employee's public key
- `amountLamports`: Amount in lamports

**Example:**

```typescript
const txId = await depositDough(
  connection,
  wallet,
  employeePublicKey,
  10_000_000_000  // 10 SOL
);
```

---

### withdrawDough

Withdraws accrued salary for an employee.

```typescript
async function withdrawDough(
  connection: Connection,
  wallet: WalletContextState,
  employer: PublicKey
): Promise<string>
```

**Parameters:**
- `connection`: Solana RPC connection
- `wallet`: Connected wallet (employee)
- `employer`: Employer's public key

**Example:**

```typescript
const txId = await withdrawDough(
  connection,
  wallet,
  employerPublicKey
);
```

---

### closePayroll

Closes a payroll and returns remaining funds.

```typescript
async function closePayroll(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey
): Promise<string>
```

---

### fetchPayrollJar

Fetches and deserializes a PayrollJar account.

```typescript
async function fetchPayrollJar(
  connection: Connection,
  employee: PublicKey,
  employer: PublicKey
): Promise<PayrollJarData | null>

interface PayrollJarData {
  employer: PublicKey;
  employee: PublicKey;
  encryptedSalary: Uint8Array;
  lastWithdraw: number;
  totalAccrued: number;
  doughVault: PublicKey;
  bump: number;
  isActive: boolean;
}
```

**Example:**

```typescript
const payrollJar = await fetchPayrollJar(
  connection,
  employeePublicKey,
  employerPublicKey
);

if (payrollJar) {
  console.log('Active:', payrollJar.isActive);
  console.log('Liquid balance:', payrollJar.totalAccrued / 1e9, 'SOL');
}
```

---

### calculateAccrued

Calculates accrued salary (client-side for display).

```typescript
function calculateAccrued(
  lastWithdraw: number,
  salaryPerSecond: number,
  currentTime: number
): number
```

**Example:**

```typescript
const accrued = calculateAccrued(
  payrollJar.lastWithdraw,
  decryptedSalary,
  Math.floor(Date.now() / 1000)
);

console.log('Accrued:', lamportsToSOL(accrued), 'SOL');
```

---

### Utility Functions

```typescript
// Convert lamports to SOL
function lamportsToSOL(lamports: number): number

// Convert SOL to lamports
function solToLamports(sol: number): number
```

---

## ArciumClient

### Configuration

```typescript
interface ArciumConfig {
  solanaRpcUrl: string;
  network: 'devnet' | 'mainnet-beta';
  mpcProgramId?: string;
  circuitId?: string;
  priorityFeeMicroLamports?: number;  // Default: 1000
}
```

### Creating the Client

```typescript
import { createArciumClient, ArciumClient } from './lib/arcium';

const arciumClient = createArciumClient();

// Or with custom config
const arciumClient = new ArciumClient({
  solanaRpcUrl: 'https://api.devnet.solana.com',
  network: 'devnet',
  circuitId: process.env.NEXT_PUBLIC_ARCIUM_CIRCUIT_ID,
});
```

### encryptSalary

Encrypts a salary amount using RescueCipher.

```typescript
async function encryptSalary(
  amount: number,
  recipientPubkey: Uint8Array
): Promise<EncryptedPayload>

interface EncryptedPayload {
  ciphertext: Uint8Array;
  encryptionPubkey: Uint8Array;
  nonce?: Uint8Array;
}
```

**Example:**

```typescript
const encrypted = await arciumClient.encryptSalary(
  3_170_000,  // lamports/second
  employeeEncryptionPubkey
);

console.log('Ciphertext:', encrypted.ciphertext);
```

---

### decryptAmount

Decrypts an encrypted amount.

```typescript
async function decryptAmount(
  encrypted: EncryptedPayload,
  privateKey: Uint8Array
): Promise<number>
```

---

### calculateAccruedMPC

Calls MPC circuit for payroll calculation.

```typescript
async function calculateAccruedMPC(
  encryptedSalary: EncryptedPayload,
  elapsedSeconds: number
): Promise<EncryptedPayload>
```

**Example:**

```typescript
const encryptedAccrued = await arciumClient.calculateAccruedMPC(
  encryptedSalary,
  30 * 24 * 60 * 60  // 30 days in seconds
);
```

---

### generateEncryptionKeypair

Generates x25519 keypair for encryption.

```typescript
async function generateEncryptionKeypair(
  walletPublicKey: PublicKey
): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }>
```

---

### RescueCipher Class

```typescript
class RescueCipher {
  constructor(sharedSecret: Uint8Array);

  encrypt(data: Uint8Array): Uint8Array;
  decrypt(ciphertext: Uint8Array): Uint8Array;
}
```

---

### x25519KeyExchange

```typescript
const x25519KeyExchange = {
  getSharedSecret(
    privateKey: Uint8Array,
    publicKey: Uint8Array
  ): Uint8Array
}
```

---

## ShadowWireClient

### Configuration

```typescript
interface ShadowWireConfig {
  solanaRpcUrl: string;
  network: 'devnet' | 'mainnet-beta';
  programId?: string;
}
```

### Creating the Client

```typescript
import { createShadowWireClient } from './lib/shadowwire';

const shadowwire = createShadowWireClient();
```

### createCommitment

Creates a Bulletproof commitment to an amount.

```typescript
async function createCommitment(
  amount: number
): Promise<BulletproofCommitment>

interface BulletproofCommitment {
  commitment: Uint8Array;
  blindingFactor?: Uint8Array;
}
```

---

### createRangeProof

Creates a Bulletproof range proof.

```typescript
async function createRangeProof(
  amount: number,
  commitment: BulletproofCommitment
): Promise<RangeProof>

interface RangeProof {
  proof: Uint8Array;  // ~672 bytes
  min: number;
  max: bigint;
}
```

---

### executePrivateTransfer

Executes a zero-knowledge private transfer.

```typescript
async function executePrivateTransfer(
  params: PrivateTransferParams,
  wallet: WalletContextState
): Promise<string>

interface PrivateTransferParams {
  amount: number;
  recipient: PublicKey;
  mint: PublicKey;
  memo?: string;
}
```

**Example:**

```typescript
const txId = await shadowwire.executePrivateTransfer({
  amount: 8_300_000_000,  // 8.3 SOL (hidden!)
  recipient: employeePublicKey,
  mint: SOL_MINT,
}, wallet);
```

---

## MagicBlockClient

### Configuration

```typescript
interface MagicBlockConfig {
  solanaRpcUrl: string;
  network: 'devnet' | 'mainnet-beta';
  erRpcUrl?: string;  // Ephemeral Rollup endpoint
}
```

### initializeStreamingSession

Creates a real-time streaming session.

```typescript
async function initializeStreamingSession(
  employer: PublicKey,
  employee: PublicKey,
  salaryPerSecond: number
): Promise<StreamingSession>

interface StreamingSession {
  sessionId: string;
  startTime: number;
  ratePerSecond: number;
}
```

---

### subscribeToStream

Subscribes to real-time balance updates.

```typescript
function subscribeToStream(
  sessionId: string,
  callback: (balance: number) => void
): void
```

**Example:**

```typescript
magicblock.subscribeToStream(session.sessionId, (balance) => {
  // Fires every ~100ms!
  setDisplayBalance(balance / 1e9);
});
```

---

### claimStreamedBalance

Claims accumulated balance and settles to L1.

```typescript
async function claimStreamedBalance(
  sessionId: string
): Promise<string>
```

---

## PrivacyCashClient

### depositToVault

Deposits funds to yield vault.

```typescript
async function depositToVault(
  amount: number,
  vaultAccount: PublicKey,
  apyBps: number  // 500 = 5%
): Promise<VaultPosition>
```

---

### calculateYield

Calculates current yield for a position.

```typescript
function calculateYield(
  principal: number,
  apyBps: number,
  elapsedSeconds: number
): number
```

---

### getEmployeeBonus

Calculates employee's yield bonus.

```typescript
function calculateEmployeeBonus(
  vaultPosition: VaultPosition,
  employeeSalaryShare: number,
  totalVaultBalance: number
): number
```

---

## React Hooks Usage

### Complete Example

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createPayroll, fetchPayrollJar } from './lib/bagel-client';

function EmployerDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [payrolls, setPayrolls] = useState([]);

  const handleCreatePayroll = async (employee: string, salary: number) => {
    try {
      const txId = await createPayroll(
        connection,
        wallet,
        new PublicKey(employee),
        salary
      );
      console.log('Created:', txId);
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  // ...
}
```

---

## Error Handling

```typescript
try {
  const txId = await createPayroll(connection, wallet, employee, salary);
} catch (error) {
  if (error.message?.includes('insufficient funds')) {
    // Get devnet SOL
  }
  if (error.message?.includes('0x1')) {
    // Payroll already exists
  }
  if (error.name === 'WalletSendTransactionError') {
    // Wallet network mismatch
  }
}
```

---

## TypeScript Types

```typescript
// Re-exported from clients
export type { ArciumConfig, EncryptedPayload } from './lib/arcium';
export type { ShadowWireConfig, BulletproofCommitment, RangeProof } from './lib/shadowwire';
export type { MagicBlockConfig, StreamingSession } from './lib/magicblock';
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=your_circuit_id
NEXT_PUBLIC_ARCIUM_MPC_PROGRAM_ID=program_id
NEXT_PUBLIC_SHADOWWIRE_PROGRAM_ID=program_id
NEXT_PUBLIC_HELIUS_API_KEY=your_key
```

---

## Related Documentation

- [Program Reference](./program) - On-chain program documentation
- [Usage Basics](../usage-basics) - Common workflows
- [Getting Started](../getting-started) - Setup guide
