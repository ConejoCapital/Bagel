/**
 * Payroll Program Client
 *
 * Integrates with deployed payroll program for confidential payroll operations.
 * Program ID: J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2
 *
 * Features:
 * - Register business with confidential token account
 * - Deposit encrypted funds via CPI to Inco Token Program
 * - Add employees with encrypted salary
 * - Pay employees with encrypted transfers
 */

import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { encryptValue } from '@inco/solana-sdk/encryption';
import { hexToBuffer } from '@inco/solana-sdk/utils';

// Program IDs
export const PAYROLL_PROGRAM_ID = new PublicKey('J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2');
export const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');
export const INCO_TOKEN_PROGRAM_ID = new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N');
export const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
export const USDBAGEL_MINT = new PublicKey('GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt');

// PDA Seeds
const BUSINESS_SEED = Buffer.from('business');
const EMPLOYEE_SEED = Buffer.from('employee');
const USER_TOKEN_SEED = Buffer.from('user_token');

// Instruction discriminators (from program IDL)
const DISCRIMINATORS = {
  register_business: Buffer.from([73, 228, 5, 59, 229, 67, 133, 82]),
  deposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  add_employee: Buffer.from([14, 82, 239, 156, 50, 90, 189, 61]),
  pay_employee: Buffer.from([202, 231, 86, 72, 42, 110, 167, 118]),
};

/**
 * Derive Business PDA
 */
export function getBusinessPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BUSINESS_SEED, owner.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
}

/**
 * Derive Employee PDA
 */
export function getEmployeePDA(business: PublicKey, employeeWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [EMPLOYEE_SEED, business.toBuffer(), employeeWallet.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
}

/**
 * Get user's Bagel PDA for token account resolution
 */
export function getUserTokenPDA(owner: PublicKey, mint: PublicKey = USDBAGEL_MINT): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_TOKEN_SEED, owner.toBuffer(), mint.toBuffer()],
    BAGEL_PROGRAM_ID
  );
}

/**
 * Resolve Inco Token account from Bagel PDA registry
 */
export async function resolveUserTokenAccount(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey = USDBAGEL_MINT
): Promise<PublicKey | null> {
  const [userTokenPDA] = getUserTokenPDA(owner, mint);

  try {
    const accountInfo = await connection.getAccountInfo(userTokenPDA);
    if (!accountInfo || !accountInfo.data) {
      console.log(`No Bagel PDA found for ${owner.toBase58()}`);
      return null;
    }

    // Parse inco_token_account from account data
    // Offset: discriminator(8) + owner(32) + mint(32) = 72
    const INCO_TOKEN_ACCOUNT_OFFSET = 72;
    const incoTokenAccountBytes = accountInfo.data.slice(
      INCO_TOKEN_ACCOUNT_OFFSET,
      INCO_TOKEN_ACCOUNT_OFFSET + 32
    );
    const incoTokenAccount = new PublicKey(incoTokenAccountBytes);

    // Check if it's not default (all zeros)
    if (incoTokenAccount.equals(PublicKey.default)) {
      console.log(`Bagel PDA exists but inco_token_account not linked for ${owner.toBase58()}`);
      return null;
    }

    return incoTokenAccount;
  } catch (err) {
    console.error(`Error resolving token account:`, err);
    return null;
  }
}

/**
 * Register a business for payroll
 */
export async function registerBusiness(
  connection: Connection,
  wallet: WalletContextState
): Promise<{ txid: string; businessPDA: PublicKey }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);

  // Check if already registered
  const existing = await connection.getAccountInfo(businessPDA);
  if (existing) {
    throw new Error('Business already registered');
  }

  // Resolve owner's token account
  const ownerTokenAccount = await resolveUserTokenAccount(connection, wallet.publicKey);
  if (!ownerTokenAccount) {
    throw new Error('Owner must have USDBagel token account. Please mint tokens first.');
  }

  console.log('Registering business...');
  console.log(`  Business PDA: ${businessPDA.toBase58()}`);
  console.log(`  Token Account: ${ownerTokenAccount.toBase58()}`);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: businessPDA, isSigner: false, isWritable: true },
      { pubkey: ownerTokenAccount, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data: DISCRIMINATORS.register_business,
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

  console.log(`✅ Business registered: ${txid}`);
  return { txid, businessPDA };
}

/**
 * Deposit confidential funds to business payroll
 */
export async function depositToPayroll(
  connection: Connection,
  wallet: WalletContextState,
  amountUSDBagel: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);

  // Verify business exists and get vault token account
  const businessAccount = await connection.getAccountInfo(businessPDA);
  if (!businessAccount) {
    throw new Error('Business not registered. Please register first.');
  }

  // Parse business token account from business data
  // Business struct: discriminator(8) + owner(32) + token_account(32) + ...
  const businessTokenAccount = new PublicKey(businessAccount.data.slice(40, 72));

  // Resolve owner's token account (source)
  const fromTokenAccount = await resolveUserTokenAccount(connection, wallet.publicKey);
  if (!fromTokenAccount) {
    throw new Error('No USDBagel token account found. Please mint tokens first.');
  }

  // Destination is the business vault (stored in business account)
  const toTokenAccount = businessTokenAccount;

  // Encrypt amount
  const amountLamports = BigInt(Math.floor(amountUSDBagel * 1_000_000_000));
  console.log(`Depositing ${amountUSDBagel} USDBagel (encrypted)...`);

  const encryptedHex = await encryptValue(amountLamports);
  const encryptedAmount = hexToBuffer(encryptedHex);

  // Build instruction data
  const lengthBytes = Buffer.alloc(4);
  lengthBytes.writeUInt32LE(encryptedAmount.length);
  const data = Buffer.concat([DISCRIMINATORS.deposit, lengthBytes, encryptedAmount]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: businessPDA, isSigner: false, isWritable: true },
      { pubkey: fromTokenAccount, isSigner: false, isWritable: true },
      { pubkey: toTokenAccount, isSigner: false, isWritable: true },
      { pubkey: INCO_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data,
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

  console.log(`✅ Deposited ${amountUSDBagel} USDBagel: ${txid}`);
  return txid;
}

/**
 * Add an employee to the business
 */
export async function addEmployee(
  connection: Connection,
  wallet: WalletContextState,
  employeeWallet: PublicKey,
  salaryPerMonth: number
): Promise<{ txid: string; employeePDA: PublicKey }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);
  const [employeePDA] = getEmployeePDA(businessPDA, employeeWallet);

  // Verify business exists
  const businessAccount = await connection.getAccountInfo(businessPDA);
  if (!businessAccount) {
    throw new Error('Business not registered. Please register first.');
  }

  // Check if employee already exists
  const existing = await connection.getAccountInfo(employeePDA);
  if (existing) {
    throw new Error('Employee already added');
  }

  // Resolve employee's token account
  const employeeTokenAccount = await resolveUserTokenAccount(connection, employeeWallet);
  if (!employeeTokenAccount) {
    throw new Error('Employee must have USDBagel token account. Ask them to mint tokens first.');
  }

  console.log(`Adding employee ${employeeWallet.toBase58()}...`);
  console.log(`  Salary: ${salaryPerMonth} USDBagel/month`);

  // Build instruction data
  const walletBuffer = employeeWallet.toBuffer();
  const salaryBuffer = Buffer.alloc(8);
  salaryBuffer.writeBigUInt64LE(BigInt(Math.floor(salaryPerMonth * 1_000_000_000)));
  const data = Buffer.concat([DISCRIMINATORS.add_employee, walletBuffer, salaryBuffer]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: businessPDA, isSigner: false, isWritable: true },
      { pubkey: employeePDA, isSigner: false, isWritable: true },
      { pubkey: employeeTokenAccount, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data,
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

  console.log(`✅ Employee added: ${txid}`);
  return { txid, employeePDA };
}

/**
 * Pay an employee (confidential withdrawal)
 */
export async function payEmployee(
  connection: Connection,
  wallet: WalletContextState,
  employeeWallet: PublicKey,
  amountUSDBagel: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [businessPDA] = getBusinessPDA(wallet.publicKey);
  const [employeePDA] = getEmployeePDA(businessPDA, employeeWallet);

  // Verify employee exists
  const employeeAccount = await connection.getAccountInfo(employeePDA);
  if (!employeeAccount) {
    throw new Error('Employee not found. Please add employee first.');
  }

  // Resolve token accounts
  const fromTokenAccount = await resolveUserTokenAccount(connection, wallet.publicKey);
  const toTokenAccount = await resolveUserTokenAccount(connection, employeeWallet);

  if (!fromTokenAccount || !toTokenAccount) {
    throw new Error('Token accounts not found');
  }

  // Encrypt amount
  const amountLamports = BigInt(Math.floor(amountUSDBagel * 1_000_000_000));
  console.log(`Paying employee ${amountUSDBagel} USDBagel (encrypted)...`);

  const encryptedHex = await encryptValue(amountLamports);
  const encryptedAmount = hexToBuffer(encryptedHex);

  // Build instruction data
  const lengthBytes = Buffer.alloc(4);
  lengthBytes.writeUInt32LE(encryptedAmount.length);
  const data = Buffer.concat([DISCRIMINATORS.pay_employee, lengthBytes, encryptedAmount]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: businessPDA, isSigner: false, isWritable: false },
      { pubkey: employeePDA, isSigner: false, isWritable: true },
      { pubkey: fromTokenAccount, isSigner: false, isWritable: true },
      { pubkey: toTokenAccount, isSigner: false, isWritable: true },
      { pubkey: INCO_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PAYROLL_PROGRAM_ID,
    data,
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

  console.log(`✅ Employee paid ${amountUSDBagel} USDBagel: ${txid}`);

  // Set up allowance for employee to decrypt their new balance
  try {
    await fetch('/api/setup-allowance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenAccount: toTokenAccount.toBase58(),
        ownerAddress: employeeWallet.toBase58(),
      }),
    });
  } catch (err) {
    console.warn('Failed to set up allowance:', err);
  }

  return txid;
}

/**
 * Fetch business account data
 */
export async function getBusinessAccount(
  connection: Connection,
  owner: PublicKey
): Promise<any | null> {
  const [businessPDA] = getBusinessPDA(owner);
  const accountInfo = await connection.getAccountInfo(businessPDA);

  if (!accountInfo) {
    return null;
  }

  // Parse business account data
  const data = accountInfo.data;
  return {
    address: businessPDA,
    owner: new PublicKey(data.slice(8, 40)),
    tokenAccount: new PublicKey(data.slice(40, 72)),
    totalDeposited: Number(data.readBigUInt64LE(72)),
    employeeCount: data.readUInt32LE(80),
    isActive: data[84] === 1,
  };
}

/**
 * Fetch employee account data
 */
export async function getEmployeeAccount(
  connection: Connection,
  business: PublicKey,
  employeeWallet: PublicKey
): Promise<any | null> {
  const [employeePDA] = getEmployeePDA(business, employeeWallet);
  const accountInfo = await connection.getAccountInfo(employeePDA);

  if (!accountInfo) {
    return null;
  }

  // Parse employee account data
  const data = accountInfo.data;
  return {
    address: employeePDA,
    business: new PublicKey(data.slice(8, 40)),
    wallet: new PublicKey(data.slice(40, 72)),
    tokenAccount: new PublicKey(data.slice(72, 104)),
    salaryPerPeriod: Number(data.readBigUInt64LE(104)),
    lastPayment: Number(data.readBigInt64LE(112)),
    totalPaid: Number(data.readBigUInt64LE(120)),
    isActive: data[128] === 1,
  };
}
