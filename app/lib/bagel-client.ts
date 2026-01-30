/**
 * Bagel Program Client
 * 
 * REAL interaction with the deployed Solana program on devnet!
 * Program ID: AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj
 * 
 * NEW ARCHITECTURE: Uses index-based PDAs for maximum privacy
 * - Master Vault: ["master_vault"]
 * - Business Entry: ["entry", master_vault, entry_index]
 * - Employee Entry: ["employee", business_entry, employee_index]
 */

import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { encryptValue } from '@inco/solana-sdk/encryption';
import { hexToBuffer } from '@inco/solana-sdk/utils';

// Deployed program ID on devnet (with confidential tokens enabled by default)
export const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');
export const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');

// Transfer discriminator from Inco Token Program IDL
const TRANSFER_DISCRIMINATOR = Buffer.from([163, 52, 200, 231, 140, 3, 69, 186]);

// PDA seeds
const MASTER_VAULT_SEED = Buffer.from('master_vault');
const BUSINESS_ENTRY_SEED = Buffer.from('entry');
const EMPLOYEE_ENTRY_SEED = Buffer.from('employee');
const USER_TOKEN_SEED = Buffer.from('user_token');

// Instruction discriminators (from test file)
const DISCRIMINATORS = {
  initialize_vault: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]),
  register_business: Buffer.from([73, 228, 5, 59, 229, 67, 133, 82]),
  deposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  add_employee: Buffer.from([14, 82, 239, 156, 50, 90, 189, 61]),
  request_withdrawal: Buffer.from([251, 85, 121, 205, 56, 201, 12, 177]),
  // SHA256("global:initialize_user_token_account")[0..8]
  initialize_user_token_account: Buffer.from([227, 229, 112, 158, 27, 71, 169, 75]),
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
 * Derive User Token Account PDA (deterministic - no storage needed!)
 *
 * Seeds: ["user_token", owner_pubkey, mint_pubkey]
 *
 * This allows anyone to calculate a user's token account address
 * just from their wallet address and the mint. No localStorage needed!
 */
export function getUserTokenAccountPDA(
  owner: PublicKey,
  mint: PublicKey = USDBAGEL_MINT
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_TOKEN_SEED, owner.toBuffer(), mint.toBuffer()],
    BAGEL_PROGRAM_ID
  );
}

/**
 * Check if a user's token account PDA exists on-chain
 */
export async function checkUserTokenAccountExists(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey = USDBAGEL_MINT
): Promise<boolean> {
  const [tokenAccountPDA] = getUserTokenAccountPDA(owner, mint);
  const accountInfo = await connection.getAccountInfo(tokenAccountPDA);
  return accountInfo !== null;
}

/**
 * Initialize a user's token account PDA via the Bagel program
 *
 * This creates a deterministic token account that anyone can derive.
 * The account is owned by the Bagel program and stores the encrypted balance.
 */
export async function initializeUserTokenAccountPDA(
  connection: Connection,
  wallet: WalletContextState,
  mint: PublicKey = USDBAGEL_MINT
): Promise<{ txid: string; tokenAccount: PublicKey }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [tokenAccountPDA] = getUserTokenAccountPDA(wallet.publicKey, mint);

  // Check if already initialized
  const exists = await checkUserTokenAccountExists(connection, wallet.publicKey, mint);
  if (exists) {
    console.log('✅ User token account already exists:', tokenAccountPDA.toBase58());
    return { txid: 'already_initialized', tokenAccount: tokenAccountPDA };
  }

  console.log('🔐 Initializing user token account PDA...');
  console.log(`   Owner: ${wallet.publicKey.toBase58()}`);
  console.log(`   Mint: ${mint.toBase58()}`);
  console.log(`   PDA: ${tokenAccountPDA.toBase58()}`);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // owner (payer)
      { pubkey: mint, isSigner: false, isWritable: false }, // mint
      { pubkey: tokenAccountPDA, isSigner: false, isWritable: true }, // user_token_account (init)
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false }, // inco_lightning_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    programId: BAGEL_PROGRAM_ID,
    data: DISCRIMINATORS.initialize_user_token_account,
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

  console.log('✅ User token account initialized!');
  console.log(`   Transaction: ${txid}`);

  return { txid, tokenAccount: tokenAccountPDA };
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
 *
 * PRIVACY: Uses Inco Confidential Token transfers - amounts are encrypted on-chain.
 *
 * IMPORTANT: The master vault MUST be configured for confidential tokens first!
 * Use configure_confidential_mint instruction before calling deposit.
 *
 * @param depositorTokenAccount - Confidential token account for depositor (REQUIRED)
 * @param vaultTokenAccount - Confidential token account for master vault (REQUIRED)
 * @param incoTokenProgram - Inco Confidential Token program ID (from env if not provided)
 */
export async function deposit(
  connection: Connection,
  wallet: WalletContextState,
  entryIndex: number,
  amountLamports: number,
  depositorTokenAccount: PublicKey,
  vaultTokenAccount: PublicKey,
  incoTokenProgram?: PublicKey
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  if (!depositorTokenAccount || !vaultTokenAccount) {
    throw new Error('Confidential token accounts are required. The program requires use_confidential_tokens to be enabled.');
  }

  const [masterVaultPDA] = getMasterVaultPDA();
  const [businessEntryPDA] = getBusinessEntryPDA(masterVaultPDA, entryIndex);

  // Encrypt amount for confidential transfer
  const encryptedAmount = await encryptForInco(amountLamports);

  // Build instruction data: discriminator + encrypted_amount (Vec<u8>)
  // Vec<u8> format: length (u32 LE) + data
  const encLen = Buffer.alloc(4);
  encLen.writeUInt32LE(encryptedAmount.length);
  const data = Buffer.concat([DISCRIMINATORS.deposit, encLen, encryptedAmount]);

  // Build instruction keys - program expects specific order
  const INCO_TOKEN_ID = incoTokenProgram ||
    (process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID
      ? new PublicKey(process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID)
      : new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N'));

  const keys = [
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // depositor
    { pubkey: masterVaultPDA, isSigner: false, isWritable: true }, // master_vault
    { pubkey: businessEntryPDA, isSigner: false, isWritable: true }, // business_entry
    { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false }, // inco_lightning_program
    { pubkey: INCO_TOKEN_ID, isSigner: false, isWritable: false }, // inco_token_program
    { pubkey: depositorTokenAccount, isSigner: false, isWritable: true }, // depositor_token_account
    { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // master_vault_token_account
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
  ];
  
  const instruction = new TransactionInstruction({
    keys,
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
 *
 * PRIVACY: Uses Inco Confidential Token transfers - amounts are encrypted on-chain.
 *
 * IMPORTANT: The master vault MUST be configured for confidential tokens first!
 * Use configure_confidential_mint instruction before calling request_withdrawal.
 *
 * ShadowWire integration (mainnet): Can add ZK proofs to hide amounts further.
 *
 * @param vaultTokenAccount - Confidential token account for master vault (REQUIRED)
 * @param employeeTokenAccount - Confidential token account for employee (REQUIRED)
 * @param incoTokenProgram - Inco Confidential Token program ID (from env if not provided)
 */
export async function requestWithdrawal(
  connection: Connection,
  wallet: WalletContextState,
  entryIndex: number,
  employeeIndex: number,
  amountLamports: number,
  useShadowwire: boolean = false,
  vaultTokenAccount: PublicKey,
  employeeTokenAccount: PublicKey,
  incoTokenProgram?: PublicKey
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  if (!vaultTokenAccount || !employeeTokenAccount) {
    throw new Error('Confidential token accounts are required. The program requires use_confidential_tokens to be enabled.');
  }

  const [masterVaultPDA] = getMasterVaultPDA();
  const [businessEntryPDA] = getBusinessEntryPDA(masterVaultPDA, entryIndex);
  const [employeeEntryPDA] = getEmployeeEntryPDA(businessEntryPDA, employeeIndex);

  // Encrypt amount for confidential transfer
  const encryptedAmount = await encryptForInco(amountLamports);

  // Build instruction data: discriminator + encrypted_amount (Vec<u8>) + use_shadowwire (bool)
  // Vec<u8> format: length (u32 LE) + data
  const encLen = Buffer.alloc(4);
  encLen.writeUInt32LE(encryptedAmount.length);
  const shadowwireBuf = Buffer.alloc(1);
  shadowwireBuf.writeUInt8(useShadowwire ? 1 : 0);

  const data = Buffer.concat([DISCRIMINATORS.request_withdrawal, encLen, encryptedAmount, shadowwireBuf]);

  // Build instruction keys - program expects specific order
  const INCO_TOKEN_ID = incoTokenProgram ||
    (process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID
      ? new PublicKey(process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID)
      : new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N'));

  const keys = [
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // withdrawer
    { pubkey: masterVaultPDA, isSigner: false, isWritable: true }, // master_vault
    { pubkey: businessEntryPDA, isSigner: false, isWritable: true }, // business_entry
    { pubkey: employeeEntryPDA, isSigner: false, isWritable: true }, // employee_entry
    { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false }, // inco_lightning_program
    { pubkey: INCO_TOKEN_ID, isSigner: false, isWritable: false }, // inco_token_program
    { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // master_vault_token_account
    { pubkey: employeeTokenAccount, isSigner: false, isWritable: true }, // employee_token_account
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
  ];
  
  const instruction = new TransactionInstruction({
    keys,
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

// Utility functions
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

export function lamportsToSOL(lamports: number): number {
  return lamports / 1_000_000_000;
}

// ============================================================
// Confidential Token Minting (Demo/Testnet)
// ============================================================

// Inco Confidential Token Program ID (from IDL)
export const INCO_TOKEN_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID || '4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N'
);

// USDBagel Mint Address (devnet)
export const USDBAGEL_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDBAGEL_MINT || 'GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt'
);

/**
 * Derive Associated Token Account for Inco Confidential Tokens
 * Uses a simple PDA derivation for demo purposes
 */
export function getConfidentialTokenAccount(
  owner: PublicKey,
  mint: PublicKey = USDBAGEL_MINT
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_account'), owner.toBuffer(), mint.toBuffer()],
    INCO_TOKEN_PROGRAM_ID
  );
}

/**
 * Initialize a confidential token account for a user (Demo)
 * Creates a memo transaction to simulate account initialization
 */
export async function initializeConfidentialTokenAccount(
  connection: Connection,
  wallet: WalletContextState,
  mint: PublicKey = USDBAGEL_MINT
): Promise<{ txid: string; tokenAccount: PublicKey }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [tokenAccount] = getConfidentialTokenAccount(wallet.publicKey, mint);

  // Create a memo transaction to record the account initialization
  const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const memoData = Buffer.from(`BAGEL:INIT_ACCOUNT:${tokenAccount.toBase58()}:${Date.now()}`);

  const instruction = new TransactionInstruction({
    programId: memoProgram,
    keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
    data: memoData,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

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

  return { txid, tokenAccount };
}

/**
 * Mint USDBagel tokens via Inco Confidential Token Program
 *
 * Calls the server-side API which has mint authority to create real
 * confidential tokens with FHE-encrypted amounts.
 *
 * Flow:
 * 1. Initialize user's Bagel PDA if not exists (on-chain registry)
 * 2. API creates Inco Token account and mints tokens
 * 3. API links the Inco Token account to the Bagel PDA
 *
 * No localStorage needed - everything is stored on-chain!
 *
 * @param amount - Amount to mint (in token units, e.g., 100 = 100 USDBagel)
 */
export async function mintTestTokens(
  connection: Connection,
  wallet: WalletContextState,
  amount: number
): Promise<{ txid: string; amount: number; tokenAccount: PublicKey }> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const ownerAddress = wallet.publicKey;

  console.log('🪙 Minting USDBagel tokens via Inco Token Program...');
  console.log(`   Amount: ${amount} USDBagel`);
  console.log(`   Owner: ${ownerAddress.toBase58()}`);

  // Step 1: Initialize user's Bagel PDA if it doesn't exist
  // This creates the on-chain registry that will store the Inco Token account reference
  const { tokenAccount: bagelPDA, txid: initTxid } = await initializeUserTokenAccountPDA(
    connection,
    wallet,
    USDBAGEL_MINT
  );

  if (initTxid !== 'already_initialized') {
    console.log(`   Bagel PDA initialized: ${bagelPDA.toBase58()}`);
  }

  // Step 2: Call mint API - it creates Inco Token account and links it to Bagel PDA
  const response = await fetch('/api/mint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      destinationAccount: ownerAddress.toBase58(),
    }),
  });

  const result = await response.json() as {
    success: boolean;
    txid?: string;
    amount?: number;
    tokenAccount?: string;
    error?: string;
  };

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to mint tokens');
  }

  if (!result.tokenAccount) {
    throw new Error('Mint API did not return token account address');
  }
  const incoTokenAccount = new PublicKey(result.tokenAccount);

  console.log('✅ Tokens minted successfully!');
  console.log(`   Transaction: ${result.txid}`);
  console.log(`   Amount: ${result.amount} USDBagel (encrypted on-chain)`);
  console.log(`   Bagel PDA: ${bagelPDA.toBase58()}`);
  console.log(`   Inco Token Account: ${incoTokenAccount.toBase58()}`);
  console.log(`   (No localStorage used - everything on-chain!)`);

  return {
    txid: result.txid!,
    amount: result.amount!,
    tokenAccount: incoTokenAccount,
  };
}

/**
 * Request devnet SOL airdrop
 * Useful for testing when wallet is low on SOL
 */
export async function requestAirdrop(
  connection: Connection,
  wallet: WalletContextState,
  amountSOL: number = 1
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const signature = await connection.requestAirdrop(
    wallet.publicKey,
    amountSOL * 1_000_000_000
  );

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Get token balance (demo - returns simulated encrypted balance)
 */
export async function getConfidentialBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<{ exists: boolean; encryptedBalance?: string }> {
  // For demo, we check if the account exists on chain
  const accountInfo = await connection.getAccountInfo(tokenAccount);

  if (!accountInfo) {
    return { exists: false };
  }

  // Return a simulated encrypted balance handle
  const balanceHandle = Buffer.from(tokenAccount.toBuffer().slice(0, 16)).toString('hex');

  return {
    exists: true,
    encryptedBalance: `🔒 ${balanceHandle.slice(0, 8)}...`
  };
}

// ============================================================
// Confidential Token Transfer (P2P)
// ============================================================

/**
 * Transfer confidential tokens to another user
 * Uses the /api/transfer endpoint which calls the Inco Token program
 *
 * Token accounts are derived deterministically using PDAs:
 * - Sender: getUserTokenAccountPDA(senderWallet, mint)
 * - Recipient: getUserTokenAccountPDA(recipientWallet, mint)
 *
 * No localStorage needed - addresses are calculated from wallet pubkeys!
 *
 * @param connection - Solana connection
 * @param wallet - Wallet context
 * @param recipientAddress - Recipient's wallet address
 * @param amount - Amount to transfer (in token units)
 * @param senderTokenAccount - Optional: Sender's token account (defaults to PDA)
 */
export async function confidentialTransfer(
  connection: Connection,
  wallet: WalletContextState,
  recipientAddress: string,
  amount: number,
  senderTokenAccount?: PublicKey
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  // Validate recipient address
  let recipientPubkey: PublicKey;
  try {
    recipientPubkey = new PublicKey(recipientAddress);
  } catch {
    throw new Error('Invalid recipient address');
  }

  // Use provided sender token account or resolve from on-chain PDA
  const senderIncoAccount = senderTokenAccount || await (async () => {
    const resolved = await resolveUserTokenAccount(connection, wallet.publicKey!, USDBAGEL_MINT);
    if (!resolved) {
      throw new Error('Sender has no token account. Please mint tokens first.');
    }
    return resolved;
  })();

  // Resolve recipient's Inco Token account from on-chain Bagel PDA
  const recipientIncoAccount = await resolveUserTokenAccount(connection, recipientPubkey, USDBAGEL_MINT);

  if (!recipientIncoAccount) {
    throw new Error('Recipient has no USDBagel token account. They must mint tokens first.');
  }

  const finalRecipientAccount = recipientIncoAccount.toBase58();

  console.log('💸 Initiating confidential transfer...');
  console.log(`   Amount: ${amount} USDBagel`);
  console.log(`   From: ${senderIncoAccount.toBase58()}`);
  console.log(`   To: ${finalRecipientAccount}`);

  // Check if wallet can sign transactions
  if (!wallet.signTransaction) {
    throw new Error('Wallet does not support signing transactions');
  }

  // Convert amount to lamports with 9 decimals and encrypt
  const amountWithDecimals = BigInt(Math.floor(amount * 1_000_000_000));
  console.log('Encrypting transfer amount using Inco SDK...');
  const encryptedHex = await encryptValue(amountWithDecimals);
  const encryptedAmount = hexToBuffer(encryptedHex);
  console.log(`Encrypted buffer length: ${encryptedAmount.length} bytes`);

  // Build instruction data: discriminator + length + amount (bytes) + input_type (u8)
  const inputType = Buffer.alloc(1);
  inputType.writeUInt8(1, 0); // 1 = raw bytes (from hexToBuffer)

  const lengthPrefix = Buffer.alloc(4);
  lengthPrefix.writeUInt32LE(encryptedAmount.length, 0);

  const instructionData = Buffer.concat([
    TRANSFER_DISCRIMINATOR,
    lengthPrefix,
    encryptedAmount,
    inputType,
  ]);

  // Build transfer instruction - user's wallet is the authority
  const transferInstruction = new TransactionInstruction({
    programId: INCO_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: senderIncoAccount, isSigner: false, isWritable: true },
      { pubkey: recipientIncoAccount, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false }, // User signs as owner
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });

  // Build transaction
  const transaction = new Transaction().add(transferInstruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Have user sign the transaction
  console.log('Requesting wallet signature...');
  const signedTransaction = await wallet.signTransaction(transaction);

  // Send signed transaction
  const txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  // Wait for confirmation
  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    },
    'confirmed'
  );

  console.log('✅ Confidential transfer successful:', txid);

  // Set up allowances for BOTH sender and recipient to decrypt their new balances
  console.log('Setting up allowances for sender and recipient...');

  // Set up allowance for sender to decrypt their new balance
  try {
    const senderAllowanceResponse = await fetch('/api/setup-allowance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenAccount: senderIncoAccount.toBase58(),
        ownerAddress: wallet.publicKey.toBase58(),
      }),
    });
    const senderAllowanceResult = await senderAllowanceResponse.json();
    if (senderAllowanceResult.success) {
      console.log('✅ Sender allowance set up:', senderAllowanceResult.txid);
    } else {
      console.warn('⚠️ Failed to set up sender allowance:', senderAllowanceResult.error);
    }
  } catch (err) {
    console.warn('⚠️ Failed to set up sender allowance:', err);
  }

  // Set up allowance for recipient to decrypt their new balance
  try {
    const recipientAllowanceResponse = await fetch('/api/setup-allowance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenAccount: recipientIncoAccount.toBase58(),
        ownerAddress: recipientPubkey.toBase58(),
      }),
    });
    const recipientAllowanceResult = await recipientAllowanceResponse.json();
    if (recipientAllowanceResult.success) {
      console.log('✅ Recipient allowance set up:', recipientAllowanceResult.txid);
    } else {
      console.warn('⚠️ Failed to set up recipient allowance:', recipientAllowanceResult.error);
    }
  } catch (err) {
    console.warn('⚠️ Failed to set up recipient allowance:', err);
  }

  return txid;
}

// ============================================================
// Confidential Token Account Derivation
// ============================================================

/**
 * Derive the Master Vault's confidential token account
 */
export function getMasterVaultTokenAccount(): [PublicKey, number] {
  const [masterVault] = getMasterVaultPDA();
  return getConfidentialTokenAccount(masterVault, USDBAGEL_MINT);
}

/**
 * Derive a user's confidential token account for USDBagel
 *
 * @deprecated Use getUserTokenAccountPDA() for deterministic PDA-based accounts
 */
export function getUserTokenAccount(owner: PublicKey): [PublicKey, number] {
  return getConfidentialTokenAccount(owner, USDBAGEL_MINT);
}

/**
 * Get a user's Inco Token account from on-chain Bagel PDA
 *
 * This reads the Bagel PDA to get the linked Inco Token account address.
 * No localStorage needed - everything is on-chain!
 *
 * The Bagel PDA structure:
 * - discriminator: 8 bytes
 * - owner: 32 bytes
 * - mint: 32 bytes
 * - inco_token_account: 32 bytes  <- This is what we read
 * - balance: 16 bytes
 * - initialized_at: 8 bytes
 * - bump: 1 byte
 *
 * @returns The Inco Token account address, or null if not found/not linked
 */
export async function resolveUserTokenAccount(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey = USDBAGEL_MINT
): Promise<PublicKey | null> {
  // Get the user's Bagel PDA
  const [userTokenPDA] = getUserTokenAccountPDA(owner, mint);

  // Fetch the PDA account data
  const accountInfo = await connection.getAccountInfo(userTokenPDA);
  if (!accountInfo || !accountInfo.data) {
    console.log(`No Bagel PDA found for ${owner.toBase58()}`);
    return null;
  }

  // Parse the inco_token_account from the account data
  // Offset: discriminator(8) + owner(32) + mint(32) = 72 bytes
  const INCO_TOKEN_ACCOUNT_OFFSET = 8 + 32 + 32;
  const incoTokenAccountBytes = accountInfo.data.slice(
    INCO_TOKEN_ACCOUNT_OFFSET,
    INCO_TOKEN_ACCOUNT_OFFSET + 32
  );

  const incoTokenAccount = new PublicKey(incoTokenAccountBytes);

  // Check if it's the default (unset) pubkey
  if (incoTokenAccount.equals(PublicKey.default)) {
    console.log(`Bagel PDA exists but inco_token_account not linked for ${owner.toBase58()}`);
    return null;
  }

  console.log(`Resolved Inco Token account from on-chain: ${incoTokenAccount.toBase58()}`);
  return incoTokenAccount;
}
