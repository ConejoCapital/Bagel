/**
 * Bagel Program Client
 * 
 * REAL interaction with the deployed Solana program on devnet!
 * Program ID: J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE
 * 
 * NEW ARCHITECTURE: Uses index-based PDAs for maximum privacy
 * - Master Vault: ["master_vault"]
 * - Business Entry: ["entry", master_vault, entry_index]
 * - Employee Entry: ["employee", business_entry, employee_index]
 */

import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Deployed program ID on devnet
export const BAGEL_PROGRAM_ID = new PublicKey('J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE');
export const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');

// PDA seeds
const MASTER_VAULT_SEED = Buffer.from('master_vault');
const BUSINESS_ENTRY_SEED = Buffer.from('entry');
const EMPLOYEE_ENTRY_SEED = Buffer.from('employee');

// Instruction discriminators (from test file)
const DISCRIMINATORS = {
  initialize_vault: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]),
  register_business: Buffer.from([73, 228, 5, 59, 229, 67, 133, 82]),
  deposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  add_employee: Buffer.from([14, 82, 239, 156, 50, 90, 189, 61]),
  request_withdrawal: Buffer.from([251, 85, 121, 205, 56, 201, 12, 177]),
};

/**
 * Derive Master Vault PDA
 */
export function getMasterVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MASTER_VAULT_SEED],
    BAGEL_PROGRAM_ID
  );
}

/**
 * Derive Business Entry PDA
 */
export function getBusinessEntryPDA(masterVault: PublicKey, entryIndex: number): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(BigInt(entryIndex));
  return PublicKey.findProgramAddressSync(
    [BUSINESS_ENTRY_SEED, masterVault.toBuffer(), indexBuffer],
    BAGEL_PROGRAM_ID
  );
}

/**
 * Derive Employee Entry PDA
 */
export function getEmployeeEntryPDA(businessEntry: PublicKey, employeeIndex: number): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(BigInt(employeeIndex));
  return PublicKey.findProgramAddressSync(
    [EMPLOYEE_ENTRY_SEED, businessEntry.toBuffer(), indexBuffer],
    BAGEL_PROGRAM_ID
  );
}

/**
 * Get current business index from master vault
 * This reads the on-chain state to get next_business_index
 */
export async function getCurrentBusinessIndex(
  connection: Connection
): Promise<number> {
  const [masterVaultPDA] = getMasterVaultPDA();
  const accountInfo = await connection.getAccountInfo(masterVaultPDA);
  
  if (!accountInfo) {
    throw new Error('Master vault not initialized. Please initialize vault first.');
  }
  
  // Read next_business_index from account data
  // Offset: 8 (discriminator) + 32 (authority) + 8 (total_balance) + 16 (encrypted_business_count) + 16 (encrypted_employee_count) = 80
  // next_business_index is at offset 80 (u64 = 8 bytes)
  const data = accountInfo.data;
  const index = data.readBigUInt64LE(80);
  return Number(index);
}

/**
 * Get current employee index from business entry
 */
export async function getCurrentEmployeeIndex(
  connection: Connection,
  businessEntry: PublicKey
): Promise<number> {
  const accountInfo = await connection.getAccountInfo(businessEntry);
  
  if (!accountInfo) {
    throw new Error('Business entry not found');
  }
  
  // Read next_employee_index from account data
  // Offset: 8 (discriminator) + 32 (master_vault) + 8 (entry_index) + 16 (encrypted_employer_id) + 16 (encrypted_balance) + 16 (encrypted_employee_count) = 96
  // next_employee_index is at offset 96 (u64 = 8 bytes)
  const data = accountInfo.data;
  const index = data.readBigUInt64LE(96);
  return Number(index);
}

/**
 * Create encrypted value for Inco (mock encryption - in production use Inco SDK)
 */
async function encryptForInco(value: number): Promise<Buffer> {
  const buffer = Buffer.alloc(16);
  buffer.writeBigUInt64LE(BigInt(value), 0);
  // Add some entropy for uniqueness
  const timestamp = Buffer.from(Date.now().toString());
  const combined = Buffer.concat([buffer.slice(0, 8), timestamp]);
  // Convert Buffer to Uint8Array for crypto.subtle.digest
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(combined));
  const hash = Buffer.from(hashBuffer);
  hash.copy(buffer, 8, 0, 8);
  return buffer;
}

/**
 * Hash pubkey to create encrypted ID (using Web Crypto API)
 */
async function hashPubkey(pubkey: PublicKey): Promise<Buffer> {
  const pubkeyBuffer = pubkey.toBuffer();
  // Convert Buffer to Uint8Array for crypto.subtle.digest
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(pubkeyBuffer));
  return Buffer.from(hashBuffer).slice(0, 16);
}

/**
 * Register a new business
 * Returns the entry_index for tracking
 */
export async function registerBusiness(
  connection: Connection,
  wallet: WalletContextState
): Promise<{ txid: string; entryIndex: number }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [masterVaultPDA] = getMasterVaultPDA();
  const currentIndex = await getCurrentBusinessIndex(connection);
  const [businessEntryPDA] = getBusinessEntryPDA(masterVaultPDA, currentIndex);
  
  // Encrypt employer ID (hash of pubkey)
  const encryptedEmployerId = await hashPubkey(wallet.publicKey);
  
  // Build instruction data: discriminator + encrypted_employer_id (as Vec<u8>)
  const idLen = Buffer.alloc(4);
  idLen.writeUInt32LE(encryptedEmployerId.length);
  const data = Buffer.concat([DISCRIMINATORS.register_business, idLen, encryptedEmployerId]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // employer
      { pubkey: masterVaultPDA, isSigner: false, isWritable: true }, // master_vault
      { pubkey: businessEntryPDA, isSigner: false, isWritable: true }, // business_entry (init)
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false }, // inco_lightning_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  });

  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature: txid,
  }, 'confirmed');

  return { txid, entryIndex: currentIndex };
}

/**
 * Deposit funds to business
 */
export async function deposit(
  connection: Connection,
  wallet: WalletContextState,
  entryIndex: number,
  amountLamports: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [masterVaultPDA] = getMasterVaultPDA();
  const [businessEntryPDA] = getBusinessEntryPDA(masterVaultPDA, entryIndex);
  
  // Encrypt amount
  const encryptedAmount = await encryptForInco(amountLamports);
  
  // Build instruction data: discriminator + amount (u64) + encrypted_amount (Vec<u8>)
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(BigInt(amountLamports));
  const encLen = Buffer.alloc(4);
  encLen.writeUInt32LE(encryptedAmount.length);
  const data = Buffer.concat([DISCRIMINATORS.deposit, amountBuf, encLen, encryptedAmount]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // depositor
      { pubkey: masterVaultPDA, isSigner: false, isWritable: true }, // master_vault
      { pubkey: businessEntryPDA, isSigner: false, isWritable: true }, // business_entry
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false }, // inco_lightning_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  });

  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature: txid,
  }, 'confirmed');

  return txid;
}

/**
 * Add an employee to a business
 * Returns the employee_index for tracking
 */
export async function addEmployee(
  connection: Connection,
  wallet: WalletContextState,
  entryIndex: number,
  employeePubkey: PublicKey,
  salaryPerSecond: number
): Promise<{ txid: string; employeeIndex: number }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [masterVaultPDA] = getMasterVaultPDA();
  const [businessEntryPDA] = getBusinessEntryPDA(masterVaultPDA, entryIndex);
  const currentEmployeeIndex = await getCurrentEmployeeIndex(connection, businessEntryPDA);
  const [employeeEntryPDA] = getEmployeeEntryPDA(businessEntryPDA, currentEmployeeIndex);
  
  // Encrypt employee ID and salary
  const encryptedEmployeeId = await hashPubkey(employeePubkey);
  const encryptedSalary = await encryptForInco(salaryPerSecond);
  
  // Build instruction data: discriminator + encrypted_employee_id (Vec<u8>) + encrypted_salary (Vec<u8>)
  const idLen = Buffer.alloc(4);
  idLen.writeUInt32LE(encryptedEmployeeId.length);
  const salaryLen = Buffer.alloc(4);
  salaryLen.writeUInt32LE(encryptedSalary.length);
  const data = Buffer.concat([
    DISCRIMINATORS.add_employee,
    idLen, encryptedEmployeeId,
    salaryLen, encryptedSalary
  ]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // employer
      { pubkey: masterVaultPDA, isSigner: false, isWritable: true }, // master_vault
      { pubkey: businessEntryPDA, isSigner: false, isWritable: true }, // business_entry
      { pubkey: employeeEntryPDA, isSigner: false, isWritable: true }, // employee_entry (init)
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false }, // inco_lightning_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  });

  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature: txid,
  }, 'confirmed');

  return { txid, employeeIndex: currentEmployeeIndex };
}

/**
 * Request withdrawal (employee withdraws accrued salary)
 */
export async function requestWithdrawal(
  connection: Connection,
  wallet: WalletContextState,
  entryIndex: number,
  employeeIndex: number,
  amountLamports: number,
  useShadowwire: boolean = false
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [masterVaultPDA] = getMasterVaultPDA();
  const [businessEntryPDA] = getBusinessEntryPDA(masterVaultPDA, entryIndex);
  const [employeeEntryPDA] = getEmployeeEntryPDA(businessEntryPDA, employeeIndex);
  
  // Encrypt amount
  const encryptedAmount = await encryptForInco(amountLamports);
  
  // Build instruction data: discriminator + amount (u64) + encrypted_amount (Vec<u8>) + use_shadowwire (bool)
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(BigInt(amountLamports));
  const encLen = Buffer.alloc(4);
  encLen.writeUInt32LE(encryptedAmount.length);
  const shadowwireBuf = Buffer.alloc(1);
  shadowwireBuf.writeUInt8(useShadowwire ? 1 : 0);
  const data = Buffer.concat([DISCRIMINATORS.request_withdrawal, amountBuf, encLen, encryptedAmount, shadowwireBuf]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // withdrawer
      { pubkey: masterVaultPDA, isSigner: false, isWritable: true }, // master_vault
      { pubkey: businessEntryPDA, isSigner: false, isWritable: true }, // business_entry
      { pubkey: employeeEntryPDA, isSigner: false, isWritable: true }, // employee_entry
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false }, // inco_lightning_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  });

  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature: txid,
  }, 'confirmed');

  return txid;
}

// Legacy function names for backward compatibility (deprecated)
export async function createPayroll(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey,
  salaryPerSecond: number
): Promise<string> {
  console.warn('createPayroll is deprecated. Use registerBusiness + addEmployee instead.');
  // For backward compatibility, register business first, then add employee
  const { entryIndex } = await registerBusiness(connection, wallet);
  const { txid } = await addEmployee(connection, wallet, entryIndex, employee, salaryPerSecond);
  return txid;
}

export async function depositDough(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey,
  amountLamports: number
): Promise<string> {
  console.warn('depositDough is deprecated. Use deposit with entryIndex instead.');
  throw new Error('Please use deposit() with entryIndex. You need to track your business entry index.');
}

export async function withdrawDough(
  connection: Connection,
  wallet: WalletContextState,
  employer: PublicKey
): Promise<string> {
  console.warn('withdrawDough is deprecated. Use requestWithdrawal with entryIndex and employeeIndex instead.');
  throw new Error('Please use requestWithdrawal() with entryIndex and employeeIndex. You need to track these indices.');
}

// Utility functions
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

export function lamportsToSOL(lamports: number): number {
  return lamports / 1_000_000_000;
}

// Legacy PDA function (deprecated)
export function getPayrollJarPDA(
  employee: PublicKey,
  employer: PublicKey
): [PublicKey, number] {
  console.warn('getPayrollJarPDA is deprecated. Use index-based PDAs instead.');
  // Return a dummy PDA - this won't work with new architecture
  return PublicKey.findProgramAddressSync(
    [Buffer.from('deprecated')],
    BAGEL_PROGRAM_ID
  );
}
