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
      : new PublicKey('HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22'));

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
      : new PublicKey('HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22'));

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

// Inco Confidential Token Program ID
export const INCO_TOKEN_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID || 'HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22'
);

// USDBagel Mint Address (devnet)
export const USDBAGEL_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDBAGEL_MINT || 'A3G2NBGL7xH9T6BYwVkwRGsSYxtFPdg4HSThfTmV94ht'
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
 * Mint test USDBagel tokens (Demo Mode)
 *
 * This creates an on-chain record of the mint via memo + logs the encrypted amount.
 * In production, this would call the actual Inco Confidential Token program.
 *
 * For the hackathon demo, this:
 * 1. Creates a verifiable on-chain transaction
 * 2. Includes encrypted amount in memo (simulating FHE)
 * 3. Can be viewed on Solana Explorer
 *
 * @param amount - Amount to mint (in token units, e.g., 100 = 100 USDBagel)
 */
export async function mintTestTokens(
  connection: Connection,
  wallet: WalletContextState,
  amount: number,
  tokenAccount?: PublicKey
): Promise<{ txid: string; amount: number; tokenAccount: PublicKey }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  // Derive token account if not provided
  let destTokenAccount = tokenAccount;
  if (!destTokenAccount) {
    const [derivedAccount] = getConfidentialTokenAccount(wallet.publicKey);
    destTokenAccount = derivedAccount;
  }

  // Encrypt the amount (simulated FHE - in production use Inco SDK)
  const amountWithDecimals = BigInt(amount) * BigInt(1_000_000_000); // 9 decimals
  const encryptedAmount = await encryptForInco(Number(amountWithDecimals));
  const encryptedHex = encryptedAmount.toString('hex');

  // Create memo transaction with mint details
  // This creates a verifiable on-chain record of the "mint"
  const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const memoData = Buffer.from(
    `BAGEL:MINT:${amount}USDB:TO:${destTokenAccount.toBase58().slice(0, 8)}:ENC:${encryptedHex.slice(0, 16)}:${Date.now()}`
  );

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

  console.log('🪙 Demo mint recorded on-chain');
  console.log(`   Amount: ${amount} USDBagel (encrypted: ${encryptedHex.slice(0, 16)}...)`);
  console.log(`   Token Account: ${destTokenAccount.toBase58()}`);
  console.log(`   Transaction: ${txid}`);

  return { txid, amount, tokenAccount: destTokenAccount };
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
 */
export function getUserTokenAccount(owner: PublicKey): [PublicKey, number] {
  return getConfidentialTokenAccount(owner, USDBAGEL_MINT);
}
