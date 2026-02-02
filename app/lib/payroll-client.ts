/**
 * Payroll Program Client
 *
 * Integrates with the deployed Confidential Streaming Payroll program.
 * Program ID: J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2
 *
 * Architecture:
 * - Business PDA: ["business", owner_pubkey]
 * - Vault PDA: ["vault", business_pubkey]
 * - Employee PDA: ["employee", business_pubkey, employee_index (u64)]
 *
 * Features:
 * - Register business with confidential vault
 * - Deposit encrypted tokens to vault via CPI
 * - Add employees with encrypted salary (INDEX-based for privacy)
 * - TEE streaming via MagicBlock delegation
 * - Withdrawals (auto/manual/simple)
 */

import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { encryptValue } from '@inco/solana-sdk/encryption';
import { hexToBuffer } from '@inco/solana-sdk/utils';

// ============================================================
// Program IDs (from env with fallbacks)
// ============================================================

export const PAYROLL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PAYROLL_PROGRAM_ID || 'J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2'
);

export const INCO_LIGHTNING_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_PROGRAM_ID || '5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj'
);

export const INCO_TOKEN_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID || '4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N'
);

export const USDBAGEL_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDBAGEL_MINT || 'GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt'
);

// MagicBlock Delegation Program
export const MAGICBLOCK_DELEGATION_PROGRAM = new PublicKey(
  process.env.NEXT_PUBLIC_MAGICBLOCK_DELEGATION_PROGRAM || 'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh'
);

// Default TEE Validator
export const TEE_VALIDATOR = new PublicKey('FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA');

// ============================================================
// Demo Environment Addresses (from env)
// ============================================================

export function getDemoAddresses() {
  return {
    businessPDA: process.env.NEXT_PUBLIC_PAYROLL_BUSINESS_PDA
      ? new PublicKey(process.env.NEXT_PUBLIC_PAYROLL_BUSINESS_PDA)
      : null,
    vaultPDA: process.env.NEXT_PUBLIC_PAYROLL_VAULT_PDA
      ? new PublicKey(process.env.NEXT_PUBLIC_PAYROLL_VAULT_PDA)
      : null,
    vaultToken: process.env.NEXT_PUBLIC_PAYROLL_VAULT_TOKEN
      ? new PublicKey(process.env.NEXT_PUBLIC_PAYROLL_VAULT_TOKEN)
      : null,
    employeePDA: process.env.NEXT_PUBLIC_PAYROLL_EMPLOYEE_PDA
      ? new PublicKey(process.env.NEXT_PUBLIC_PAYROLL_EMPLOYEE_PDA)
      : null,
    employeeToken: process.env.NEXT_PUBLIC_PAYROLL_EMPLOYEE_TOKEN
      ? new PublicKey(process.env.NEXT_PUBLIC_PAYROLL_EMPLOYEE_TOKEN)
      : null,
  };
}

// ============================================================
// PDA Seeds (matching on-chain program)
// ============================================================

const BUSINESS_SEED = Buffer.from('business');
const VAULT_SEED = Buffer.from('vault');
const EMPLOYEE_SEED = Buffer.from('employee');
const VAULT_TOKEN_SEED = Buffer.from('vault_token');

// ============================================================
// Instruction Discriminators (Anchor-style sha256)
// ============================================================

import { createHash } from 'crypto';

/**
 * Compute Anchor instruction discriminator
 * Formula: sha256("global:<instruction_name>")[0..8]
 */
function anchorDiscriminator(instructionName: string): Buffer {
  const hash = createHash('sha256')
    .update(`global:${instructionName}`)
    .digest();
  return hash.slice(0, 8);
}

// Compute discriminators dynamically to ensure correctness
const DISCRIMINATORS = {
  // Setup
  register_business: anchorDiscriminator('register_business'),
  init_vault: anchorDiscriminator('init_vault'),

  // Operations
  deposit: anchorDiscriminator('deposit'),
  add_employee: anchorDiscriminator('add_employee'),

  // MagicBlock TEE
  delegate_to_tee: anchorDiscriminator('delegate_to_tee'),
  mark_delegated: anchorDiscriminator('mark_delegated'),
  accrue: anchorDiscriminator('accrue'),

  // Withdrawals
  auto_payment: anchorDiscriminator('auto_payment'),
  manual_withdraw: anchorDiscriminator('manual_withdraw'),
  simple_withdraw: anchorDiscriminator('simple_withdraw'),
  undelegate: anchorDiscriminator('undelegate'),
};

// Debug: Log computed discriminators
if (typeof window === 'undefined') {
  console.log('Computed discriminators:');
  console.log('  init_vault:', Array.from(DISCRIMINATORS.init_vault));
}

// ============================================================
// PDA Derivation Functions
// ============================================================

/**
 * Derive Business PDA
 * Seeds: ["business", owner_pubkey]
 */
export function getBusinessPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BUSINESS_SEED, owner.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
}

/**
 * Derive Vault PDA
 * Seeds: ["vault", business_pubkey]
 */
export function getVaultPDA(business: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, business.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
}

/**
 * Derive Employee PDA (INDEX-BASED for privacy)
 * Seeds: ["employee", business_pubkey, employee_index (u64 LE)]
 *
 * NOTE: Uses index, NOT employee wallet pubkey!
 * This prevents correlation between on-chain PDAs and employee identities.
 */
export function getEmployeePDA(business: PublicKey, employeeIndex: number): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(BigInt(employeeIndex));
  return PublicKey.findProgramAddressSync(
    [EMPLOYEE_SEED, business.toBuffer(), indexBuffer],
    PAYROLL_PROGRAM_ID
  );
}

/**
 * Derive Vault Token Account PDA
 * Seeds: ["vault_token", vault_pubkey]
 */
export function getVaultTokenPDA(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_TOKEN_SEED, vault.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
}

// ============================================================
// Account Data Parsing
// ============================================================

/**
 * Parse Business account data
 */
export interface BusinessAccount {
  address: PublicKey;
  owner: PublicKey;
  vault: PublicKey;
  nextEmployeeIndex: number;
  encryptedEmployeeCount: Uint8Array;
  isActive: boolean;
  createdAt: number;
  bump: number;
}

export async function getBusinessAccount(
  connection: Connection,
  owner: PublicKey
): Promise<BusinessAccount | null> {
  const [businessPDA] = getBusinessPDA(owner);
  const accountInfo = await connection.getAccountInfo(businessPDA);

  if (!accountInfo) {
    return null;
  }

  // Parse account data
  // Business struct layout:
  // 0-8: discriminator
  // 8-40: owner (32)
  // 40-72: vault (32)
  // 72-80: next_employee_index (u64)
  // 80-112: encrypted_employee_count (32)
  // 112: is_active (1)
  // 113-121: created_at (i64)
  // 121: bump (1)
  const data = accountInfo.data;

  return {
    address: businessPDA,
    owner: new PublicKey(data.slice(8, 40)),
    vault: new PublicKey(data.slice(40, 72)),
    nextEmployeeIndex: Number(data.readBigUInt64LE(72)),
    encryptedEmployeeCount: data.slice(80, 112),
    isActive: data[112] === 1,
    createdAt: Number(data.readBigInt64LE(113)),
    bump: data[121],
  };
}

/**
 * Parse Vault account data
 */
export interface VaultAccount {
  address: PublicKey;
  business: PublicKey;
  mint: PublicKey;
  tokenAccount: PublicKey;
  encryptedBalance: Uint8Array;
  bump: number;
}

export async function getVaultAccount(
  connection: Connection,
  business: PublicKey
): Promise<VaultAccount | null> {
  const [vaultPDA] = getVaultPDA(business);
  const accountInfo = await connection.getAccountInfo(vaultPDA);

  if (!accountInfo) {
    return null;
  }

  // Vault struct layout:
  // 0-8: discriminator
  // 8-40: business (32)
  // 40-72: mint (32)
  // 72-104: token_account (32)
  // 104-136: encrypted_balance (32)
  // 136: bump (1)
  const data = accountInfo.data;

  return {
    address: vaultPDA,
    business: new PublicKey(data.slice(8, 40)),
    mint: new PublicKey(data.slice(40, 72)),
    tokenAccount: new PublicKey(data.slice(72, 104)),
    encryptedBalance: data.slice(104, 136),
    bump: data[136],
  };
}

/**
 * Parse Employee account data
 */
export interface EmployeeAccount {
  address: PublicKey;
  business: PublicKey;
  employeeIndex: number;
  encryptedEmployeeId: Uint8Array;
  encryptedSalaryRate: Uint8Array;
  encryptedAccrued: Uint8Array;
  lastAccrualTime: number;
  isActive: boolean;
  isDelegated: boolean;
  bump: number;
}

export async function getEmployeeAccount(
  connection: Connection,
  business: PublicKey,
  employeeIndex: number
): Promise<EmployeeAccount | null> {
  const [employeePDA] = getEmployeePDA(business, employeeIndex);
  const accountInfo = await connection.getAccountInfo(employeePDA);

  if (!accountInfo) {
    return null;
  }

  // Employee struct layout:
  // 0-8: discriminator
  // 8-40: business (32)
  // 40-48: employee_index (u64)
  // 48-80: encrypted_employee_id (32)
  // 80-112: encrypted_salary_rate (32)
  // 112-144: encrypted_accrued (32)
  // 144-152: last_accrual_time (i64)
  // 152: is_active (1)
  // 153: is_delegated (1)
  // 154: bump (1)
  const data = accountInfo.data;

  return {
    address: employeePDA,
    business: new PublicKey(data.slice(8, 40)),
    employeeIndex: Number(data.readBigUInt64LE(40)),
    encryptedEmployeeId: data.slice(48, 80),
    encryptedSalaryRate: data.slice(80, 112),
    encryptedAccrued: data.slice(112, 144),
    lastAccrualTime: Number(data.readBigInt64LE(144)),
    isActive: data[152] === 1,
    isDelegated: data[153] === 1,
    bump: data[154],
  };
}

// ============================================================
// Transaction Helpers
// ============================================================

async function sendAndConfirmTransaction(
  connection: Connection,
  wallet: WalletContextState,
  instruction: TransactionInstruction
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false, // Enable preflight to catch errors early
    maxRetries: 3,
  });

  const confirmation = await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature: txid,
  }, 'confirmed');

  // Check if transaction actually succeeded
  if (confirmation.value.err) {
    console.error('Transaction failed on-chain:', confirmation.value.err);
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  return txid;
}

// ============================================================
// Encryption Helpers
// ============================================================

/**
 * Encrypt a value for Inco FHE
 */
async function encryptForInco(value: bigint): Promise<Buffer> {
  const encryptedHex = await encryptValue(value);
  return hexToBuffer(encryptedHex);
}

/**
 * Hash a pubkey to create encrypted employee ID
 */
async function hashPubkeyForEmployeeId(pubkey: PublicKey): Promise<Buffer> {
  const pubkeyBuffer = pubkey.toBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(pubkeyBuffer));
  return Buffer.from(hashBuffer).slice(0, 32);
}

// ============================================================
// Setup Instructions
// ============================================================

/**
 * Register a new business
 * Creates Business PDA for the owner
 */
export async function registerBusiness(
  connection: Connection,
  wallet: WalletContextState
): Promise<{ txid: string; businessPDA: PublicKey }> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);

  // Check if already registered
  const existing = await connection.getAccountInfo(businessPDA);
  if (existing) {
    throw new Error('Business already registered');
  }

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: businessPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data: DISCRIMINATORS.register_business,
  });

  const txid = await sendAndConfirmTransaction(connection, wallet, instruction);
  return { txid, businessPDA };
}

/**
 * Initialize the business vault
 * Creates Vault PDA and links to Inco Token account
 *
 * Note: The Inco Token account must be created externally first,
 * with the vault PDA as the owner.
 */
export async function initVault(
  connection: Connection,
  wallet: WalletContextState,
  vaultTokenAccount: PublicKey,
  mint: PublicKey = USDBAGEL_MINT
): Promise<{ txid: string; vaultPDA: PublicKey }> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);
  const [vaultPDA] = getVaultPDA(businessPDA);

  // Verify business exists
  const businessAccount = await connection.getAccountInfo(businessPDA);
  if (!businessAccount) {
    throw new Error('Business not registered. Please register first.');
  }

  // Build instruction data: discriminator + mint (32) + vault_token_account (32)
  const data = Buffer.concat([
    DISCRIMINATORS.init_vault,
    mint.toBuffer(),
    vaultTokenAccount.toBuffer(),
  ]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: businessPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data,
  });

  const txid = await sendAndConfirmTransaction(connection, wallet, instruction);
  return { txid, vaultPDA };
}

// ============================================================
// Vault Token Account Creation
// ============================================================

/**
 * Create Inco Token account for vault (automatic setup)
 *
 * This creates a new Inco Token account owned by the vault PDA.
 * The user pays for account creation but doesn't need vault PDA to sign.
 *
 * @returns The new token account public key
 */
export async function createVaultTokenAccount(
  connection: Connection,
  wallet: WalletContextState,
  vaultPDA: PublicKey,
  mint: PublicKey = USDBAGEL_MINT
): Promise<{ txid: string; tokenAccount: PublicKey }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  // Generate a new keypair for the token account
  const { Keypair, SystemProgram } = await import('@solana/web3.js');
  const tokenAccountKeypair = Keypair.generate();

  console.log('🔐 Creating vault token account...');
  console.log('   Vault PDA (owner):', vaultPDA.toBase58());
  console.log('   Token Account:', tokenAccountKeypair.publicKey.toBase58());
  console.log('   Mint:', mint.toBase58());

  // Inco Token init_account instruction
  // Keys: [token_account (signer), mint, owner, payer (signer), system_program, inco_lightning]
  const INIT_ACCOUNT_DISCRIMINATOR = Buffer.from([74, 115, 99, 93, 197, 69, 103, 7]);

  const instruction = new TransactionInstruction({
    programId: INCO_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: tokenAccountKeypair.publicKey, isSigner: true, isWritable: true }, // token_account
      { pubkey: mint, isSigner: false, isWritable: false }, // mint
      { pubkey: vaultPDA, isSigner: false, isWritable: false }, // owner (vault PDA - no signature needed!)
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // payer
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
    ],
    data: INIT_ACCOUNT_DISCRIMINATOR,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Sign with both wallet and the new token account keypair
  transaction.partialSign(tokenAccountKeypair);
  const signed = await wallet.signTransaction(transaction);

  const txid = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature: txid,
  }, 'confirmed');

  console.log('✅ Vault token account created:', txid);

  return { txid, tokenAccount: tokenAccountKeypair.publicKey };
}

// ============================================================
// Deposit Instruction
// ============================================================

/**
 * Deposit encrypted tokens to business vault
 *
 * PRIVACY: Amount is encrypted using Inco FHE
 */
export async function deposit(
  connection: Connection,
  wallet: WalletContextState,
  depositorTokenAccount: PublicKey,
  vaultTokenAccount: PublicKey,
  amountUSDBagel: number
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);
  const [vaultPDA] = getVaultPDA(businessPDA);

  // Verify business and vault exist
  const business = await getBusinessAccount(connection, wallet.publicKey);
  if (!business) {
    throw new Error('Business not registered');
  }

  // Encrypt amount (9 decimals)
  const amountLamports = BigInt(Math.floor(amountUSDBagel * 1_000_000_000));
  const encryptedAmount = await encryptForInco(amountLamports);

  // Build instruction data: discriminator + encrypted_amount (Vec<u8>)
  const lengthBytes = Buffer.alloc(4);
  lengthBytes.writeUInt32LE(encryptedAmount.length);
  const data = Buffer.concat([DISCRIMINATORS.deposit, lengthBytes, encryptedAmount]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: businessPDA, isSigner: false, isWritable: false },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: depositorTokenAccount, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: INCO_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data,
  });

  return sendAndConfirmTransaction(connection, wallet, instruction);
}

// ============================================================
// Employee Management
// ============================================================

/**
 * Add an employee with encrypted salary rate
 *
 * PRIVACY: Uses INDEX-based PDA derivation - no employee pubkey on-chain!
 *
 * @param employeeWallet - Employee's wallet (hashed and encrypted, not stored directly)
 * @param salaryRatePerSecond - Salary per second in USDBagel (encrypted)
 */
export async function addEmployee(
  connection: Connection,
  wallet: WalletContextState,
  employeeWallet: PublicKey,
  salaryRatePerSecond: number
): Promise<{ txid: string; employeePDA: PublicKey; employeeIndex: number }> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);

  // Get current employee index from business
  const business = await getBusinessAccount(connection, wallet.publicKey);
  if (!business) {
    throw new Error('Business not registered');
  }

  const employeeIndex = business.nextEmployeeIndex;
  const [employeePDA] = getEmployeePDA(businessPDA, employeeIndex);

  // Encrypt employee ID (hash of wallet) and salary
  const encryptedEmployeeId = await hashPubkeyForEmployeeId(employeeWallet);
  const salaryLamports = BigInt(Math.floor(salaryRatePerSecond * 1_000_000_000));
  const encryptedSalary = await encryptForInco(salaryLamports);

  // Build instruction data: discriminator + encrypted_employee_id (Vec<u8>) + encrypted_salary (Vec<u8>)
  const idLen = Buffer.alloc(4);
  idLen.writeUInt32LE(encryptedEmployeeId.length);
  const salaryLen = Buffer.alloc(4);
  salaryLen.writeUInt32LE(encryptedSalary.length);

  const data = Buffer.concat([
    DISCRIMINATORS.add_employee,
    idLen, encryptedEmployeeId,
    salaryLen, encryptedSalary,
  ]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: businessPDA, isSigner: false, isWritable: true },
      { pubkey: employeePDA, isSigner: false, isWritable: true },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false }, // Inco Lightning for registering ciphertext
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data,
  });

  const txid = await sendAndConfirmTransaction(connection, wallet, instruction);

  // Register employee's encrypted salary handle with Inco covalidator
  // This is REQUIRED for the employee to decrypt their salary later
  try {
    console.log('📝 Registering employee allowance with Inco covalidator...');
    const allowanceResponse = await fetch('/api/setup-employee-allowance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessPDA: businessPDA.toBase58(),
        employeeIndex: employeeIndex,
        employeeWallet: employeeWallet.toBase58(),
      }),
    });

    if (allowanceResponse.ok) {
      const allowanceResult = await allowanceResponse.json();
      console.log('✅ Employee allowance registered:', allowanceResult);
    } else {
      const errorText = await allowanceResponse.text();
      console.warn('⚠️ Failed to register employee allowance (decryption may not work):', errorText);
    }
  } catch (allowanceError) {
    console.warn('⚠️ Failed to register employee allowance (decryption may not work):', allowanceError);
    // Don't throw - the employee was created successfully, allowance can be set up later
  }

  return { txid, employeePDA, employeeIndex };
}

// ============================================================
// Employee Allowance Setup (for decryption)
// ============================================================

/**
 * Set up allowance for an existing employee to enable decryption
 *
 * This registers the employee's encrypted salary/accrued handles with the
 * Inco covalidator, which is REQUIRED for decryption to work.
 *
 * Call this for employees that were created before the automatic allowance
 * setup was added, or if the allowance setup failed during employee creation.
 */
export async function setupEmployeeAllowance(
  businessPDA: PublicKey,
  employeeIndex: number,
  employeeWallet: PublicKey
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📝 Setting up allowance for employee #${employeeIndex}...`);
    console.log(`   Business: ${businessPDA.toBase58()}`);
    console.log(`   Employee Wallet: ${employeeWallet.toBase58()}`);

    const response = await fetch('/api/setup-employee-allowance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessPDA: businessPDA.toBase58(),
        employeeIndex: employeeIndex,
        employeeWallet: employeeWallet.toBase58(),
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Allowance setup successful:', result);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error('❌ Allowance setup failed:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error: any) {
    console.error('❌ Allowance setup error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

// ============================================================
// MagicBlock TEE Streaming
// ============================================================

/**
 * Delegate employee account to MagicBlock TEE
 *
 * Once delegated, the TEE auto-accrues salary in real-time.
 */
export async function delegateToTee(
  connection: Connection,
  wallet: WalletContextState,
  employeeIndex: number,
  validator: PublicKey = TEE_VALIDATOR
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);
  const [employeePDA] = getEmployeePDA(businessPDA, employeeIndex);

  // Verify employee exists and is not already delegated
  const employee = await getEmployeeAccount(connection, businessPDA, employeeIndex);
  if (!employee) {
    throw new Error('Employee not found');
  }
  if (employee.isDelegated) {
    throw new Error('Employee already delegated to TEE');
  }
  if (!employee.isActive) {
    throw new Error('Employee is not active');
  }

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: businessPDA, isSigner: false, isWritable: false },
      { pubkey: employeePDA, isSigner: false, isWritable: true },
      { pubkey: validator, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data: DISCRIMINATORS.delegate_to_tee,
  });

  return sendAndConfirmTransaction(connection, wallet, instruction);
}

/**
 * Undelegate employee from TEE
 */
export async function undelegate(
  connection: Connection,
  wallet: WalletContextState,
  employeeIndex: number
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);
  const [employeePDA] = getEmployeePDA(businessPDA, employeeIndex);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: employeePDA, isSigner: false, isWritable: true },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data: DISCRIMINATORS.undelegate,
  });

  return sendAndConfirmTransaction(connection, wallet, instruction);
}

// ============================================================
// Withdrawal Instructions
// ============================================================

/**
 * Simple withdrawal (no TEE required)
 *
 * For testing: employee signs to claim a specific encrypted amount.
 */
export async function simpleWithdraw(
  connection: Connection,
  wallet: WalletContextState,
  businessOwner: PublicKey,
  employeeIndex: number,
  employeeTokenAccount: PublicKey,
  vaultTokenAccount: PublicKey,
  amountUSDBagel: number
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(businessOwner);
  const [vaultPDA] = getVaultPDA(businessPDA);
  const [employeePDA] = getEmployeePDA(businessPDA, employeeIndex);

  // Encrypt amount
  const amountLamports = BigInt(Math.floor(amountUSDBagel * 1_000_000_000));
  const encryptedAmount = await encryptForInco(amountLamports);

  // Build instruction data
  const lengthBytes = Buffer.alloc(4);
  lengthBytes.writeUInt32LE(encryptedAmount.length);
  const data = Buffer.concat([DISCRIMINATORS.simple_withdraw, lengthBytes, encryptedAmount]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // employee_signer
      { pubkey: businessPDA, isSigner: false, isWritable: false },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: employeePDA, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: employeeTokenAccount, isSigner: false, isWritable: true },
      { pubkey: INCO_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data,
  });

  return sendAndConfirmTransaction(connection, wallet, instruction);
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the next employee index from a business
 */
export async function getNextEmployeeIndex(
  connection: Connection,
  owner: PublicKey
): Promise<number> {
  const business = await getBusinessAccount(connection, owner);
  if (!business) {
    throw new Error('Business not registered');
  }
  return business.nextEmployeeIndex;
}

/**
 * Check if a business is registered
 */
export async function isBusinessRegistered(
  connection: Connection,
  owner: PublicKey
): Promise<boolean> {
  const [businessPDA] = getBusinessPDA(owner);
  const accountInfo = await connection.getAccountInfo(businessPDA);
  return accountInfo !== null;
}

/**
 * Check if vault is initialized
 */
export async function isVaultInitialized(
  connection: Connection,
  owner: PublicKey
): Promise<boolean> {
  const business = await getBusinessAccount(connection, owner);
  if (!business) return false;
  return !business.vault.equals(PublicKey.default);
}

// ============================================================
// Explorer Link Utilities (OrbMarkets only)
// ============================================================

/**
 * Generate OrbMarkets explorer link for a transaction
 *
 * IMPORTANT: Use only OrbMarkets - no Solscan/Sol Explorer
 */
export function getExplorerTxLink(signature: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  return `https://orbmarkets.io/tx/${signature}?cluster=${cluster}`;
}

/**
 * Generate OrbMarkets explorer link for an account
 */
export function getExplorerAccountLink(address: string | PublicKey, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  const addressStr = typeof address === 'string' ? address : address.toBase58();
  return `https://orbmarkets.io/account/${addressStr}?cluster=${cluster}`;
}

// ============================================================
// Conversion Utilities
// ============================================================

export function usdbagelToLamports(amount: number): bigint {
  return BigInt(Math.floor(amount * 1_000_000_000));
}

export function lamportsToUsdbagel(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000;
}

/**
 * Calculate salary per second from monthly rate
 */
export function monthlyToPerSecond(monthlyRate: number): number {
  // Assume 30 days per month
  const secondsPerMonth = 30 * 24 * 60 * 60;
  return monthlyRate / secondsPerMonth;
}

/**
 * Calculate monthly from per-second rate
 */
export function perSecondToMonthly(perSecond: number): number {
  const secondsPerMonth = 30 * 24 * 60 * 60;
  return perSecond * secondsPerMonth;
}

// ============================================================
// Employee Detection
// ============================================================

/**
 * Hash a wallet pubkey to match against employee ID
 * Uses the same algorithm as when adding an employee
 */
export async function hashWalletForEmployeeId(wallet: PublicKey): Promise<Uint8Array> {
  const pubkeyBuffer = wallet.toBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(pubkeyBuffer));
  return new Uint8Array(hashBuffer).slice(0, 32);
}

/**
 * Check if a wallet matches an employee's encrypted ID
 * Supports both 16-byte (bagel-client) and 32-byte (payroll-client) hashes
 */
export async function isWalletEmployee(
  wallet: PublicKey,
  employee: EmployeeAccount
): Promise<boolean> {
  const pubkeyBuffer = wallet.toBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(pubkeyBuffer));
  const fullHash = new Uint8Array(hashBuffer);
  const employeeId = employee.encryptedEmployeeId;

  // Check 32-byte hash match (payroll-client format)
  let is32ByteMatch = true;
  for (let i = 0; i < 32 && i < employeeId.length; i++) {
    if (fullHash[i] !== employeeId[i]) {
      is32ByteMatch = false;
      break;
    }
  }
  if (is32ByteMatch) {
    console.log(`✅ 32-byte hash match for wallet ${wallet.toBase58().slice(0, 8)}...`);
    return true;
  }

  // Check 16-byte hash match (bagel-client format - rest should be zeros)
  let is16ByteMatch = true;
  for (let i = 0; i < 16; i++) {
    if (fullHash[i] !== employeeId[i]) {
      is16ByteMatch = false;
      break;
    }
  }
  // Verify remaining bytes are zeros (indicating 16-byte format)
  let restIsZeros = true;
  for (let i = 16; i < 32 && i < employeeId.length; i++) {
    if (employeeId[i] !== 0) {
      restIsZeros = false;
      break;
    }
  }
  if (is16ByteMatch && restIsZeros) {
    console.log(`✅ 16-byte hash match for wallet ${wallet.toBase58().slice(0, 8)}...`);
    return true;
  }

  return false;
}

/**
 * Find if a wallet is an employee of a business
 * Returns the employee data if found, null otherwise
 */
export async function findEmployeeByWallet(
  connection: Connection,
  business: PublicKey,
  wallet: PublicKey,
  maxEmployees: number = 20
): Promise<{ employee: EmployeeAccount; employeeIndex: number } | null> {
  console.log(`🔍 Searching for wallet ${wallet.toBase58().slice(0, 8)}... in business ${business.toBase58().slice(0, 8)}...`);

  for (let i = 0; i < maxEmployees; i++) {
    try {
      const employee = await getEmployeeAccount(connection, business, i);
      if (!employee) {
        console.log(`   Employee #${i}: not found`);
        continue;
      }

      console.log(`   Employee #${i}: isActive=${employee.isActive}, checking hash match...`);
      const isMatch = await isWalletEmployee(wallet, employee);

      if (isMatch) {
        if (employee.isActive) {
          console.log(`✅ Found matching ACTIVE employee at index ${i}`);
          return { employee, employeeIndex: i };
        } else {
          console.log(`⚠️ Found matching but INACTIVE employee at index ${i}`);
        }
      }
    } catch (err) {
      // No employee at this index - this is normal for sparse arrays
    }
  }
  console.log(`❌ No matching employee found for wallet ${wallet.toBase58().slice(0, 8)}...`);
  return null;
}

// ============================================================
// Employee Encrypted Data Extraction
// ============================================================

/**
 * Extract encrypted accrued salary handle from Employee PDA
 *
 * This reads the encrypted_accrued field from the Employee account
 * and extracts the u128 handle needed for decryption.
 *
 * Employee struct layout:
 * 0-8: discriminator
 * 8-40: business (32)
 * 40-48: employee_index (u64)
 * 48-80: encrypted_employee_id (32)
 * 80-112: encrypted_salary_rate (32)
 * 112-144: encrypted_accrued (32)
 * 144-152: last_accrual_time (i64)
 *
 * The handle is the first 16 bytes of the encrypted field (u128 little-endian).
 */
export function extractEmployeeAccruedHandle(employee: EmployeeAccount): bigint {
  const bytes = employee.encryptedAccrued.slice(0, 16);
  let result = BigInt(0);
  for (let i = 15; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  return result;
}

/**
 * Extract encrypted salary rate handle from Employee PDA
 */
export function extractEmployeeSalaryHandle(employee: EmployeeAccount): bigint {
  const bytes = employee.encryptedSalaryRate.slice(0, 16);
  let result = BigInt(0);
  for (let i = 15; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  return result;
}

/**
 * Get encrypted handles as hex strings for Inco decryption
 *
 * Returns the accrued and salary rate handles as hex strings
 * that can be passed to Inco's decrypt function.
 */
export interface EmployeeDecryptHandles {
  accruedHandle: string;
  salaryHandle: string;
  accruedHandleValue: bigint;
  salaryHandleValue: bigint;
}

export function getEmployeeDecryptHandles(employee: EmployeeAccount): EmployeeDecryptHandles {
  const accruedHandleValue = extractEmployeeAccruedHandle(employee);
  const salaryHandleValue = extractEmployeeSalaryHandle(employee);

  // Convert to decimal strings (Inco SDK expects decimal, not hex)
  const accruedHandle = accruedHandleValue.toString();
  const salaryHandle = salaryHandleValue.toString();

  return {
    accruedHandle,
    salaryHandle,
    accruedHandleValue,
    salaryHandleValue,
  };
}

/**
 * Get employee's encrypted data ready for decryption
 *
 * This fetches the Employee account and extracts the encrypted handles
 * needed for calling the /api/setup-employee-allowance endpoint and
 * then decrypting with Inco SDK.
 */
export async function getEmployeeForDecryption(
  connection: Connection,
  business: PublicKey,
  employeeIndex: number
): Promise<{
  employee: EmployeeAccount;
  handles: EmployeeDecryptHandles;
  employeePDA: PublicKey;
} | null> {
  const employee = await getEmployeeAccount(connection, business, employeeIndex);
  if (!employee) return null;

  const [employeePDA] = getEmployeePDA(business, employeeIndex);
  const handles = getEmployeeDecryptHandles(employee);

  return {
    employee,
    handles,
    employeePDA,
  };
}

// ============================================================
// Backwards Compatibility (for dashboard.tsx)
// ============================================================

/**
 * @deprecated Use deposit() instead
 */
export async function depositToPayroll(
  connection: Connection,
  wallet: WalletContextState,
  amountUSDBagel: number
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  // Get depositor's token account
  const { resolveUserTokenAccount } = await import('./bagel-client');
  const depositorTokenAccount = await resolveUserTokenAccount(connection, wallet.publicKey, USDBAGEL_MINT);
  if (!depositorTokenAccount) {
    throw new Error('No USDBagel token account found. Please mint tokens first.');
  }

  // Get the user's vault account from on-chain data
  const business = await getBusinessAccount(connection, wallet.publicKey);
  if (!business) {
    throw new Error('Business not registered. Register first before depositing.');
  }

  // Check if vault is initialized (not default pubkey)
  if (business.vault.equals(PublicKey.default)) {
    throw new Error('Vault not initialized. Initialize vault first before depositing.');
  }

  // Get vault account to read the token_account
  const vault = await getVaultAccount(connection, business.address);
  if (!vault) {
    throw new Error('Vault account not found on-chain.');
  }

  console.log('💰 Depositing to vault token account:', vault.tokenAccount.toBase58());

  return deposit(connection, wallet, depositorTokenAccount, vault.tokenAccount, amountUSDBagel);
}

/**
 * @deprecated The streaming payroll model doesn't have direct pay - use simpleWithdraw instead
 */
export async function payEmployee(
  connection: Connection,
  wallet: WalletContextState,
  employeeWallet: PublicKey,
  amountUSDBagel: number
): Promise<string> {
  // In the new streaming model, employees withdraw their accrued salary
  // This is a compatibility shim that performs a simple withdrawal for the employee
  // Note: In production, the employee would sign their own withdrawal

  const demoAddresses = getDemoAddresses();
  if (!demoAddresses.employeeToken || !demoAddresses.vaultToken) {
    throw new Error('Token accounts not configured');
  }

  // For backwards compatibility, we assume employee index 0
  // In production, you'd need to look up the employee index by wallet
  return simpleWithdraw(
    connection,
    wallet,
    wallet.publicKey!, // business owner
    0, // Default to first employee - in production, look up by wallet
    demoAddresses.employeeToken,
    demoAddresses.vaultToken,
    amountUSDBagel
  );
}

/**
 * Extended BusinessAccount with backwards-compatible fields
 */
export interface LegacyBusinessAccount extends BusinessAccount {
  employeeCount: number;
  totalDeposited: number;
  tokenAccount: PublicKey;
}

/**
 * @deprecated Use getBusinessAccount() - this adds legacy compatibility fields
 */
export async function getLegacyBusinessAccount(
  connection: Connection,
  owner: PublicKey
): Promise<LegacyBusinessAccount | null> {
  const business = await getBusinessAccount(connection, owner);
  if (!business) return null;

  return {
    ...business,
    employeeCount: business.nextEmployeeIndex,
    totalDeposited: 0, // Encrypted - can't read directly
    tokenAccount: business.vault, // Point to vault for compatibility
  };
}
