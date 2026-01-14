/**
 * 🥯 Bagel Program Client
 * 
 * REAL interaction with the deployed Solana program on devnet!
 * Program ID: 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
 */

import { AnchorProvider, Program, web3, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
// IDL will be generated later - for now we'll use instruction builders

// Deployed program ID on devnet
export const BAGEL_PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');

// PDA seeds
const BAGEL_JAR_SEED = Buffer.from('bagel_jar');

/**
 * Get the PayrollJar PDA for an employee and employer
 */
export function getPayrollJarPDA(
  employee: PublicKey,
  employer: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      BAGEL_JAR_SEED,
      employee.toBuffer(),
      employer.toBuffer(),
    ],
    BAGEL_PROGRAM_ID
  );
}

/**
 * Get Anchor provider
 */
export function getProvider(
  connection: Connection,
  wallet: WalletContextState
): AnchorProvider | null {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return null;
  }

  return new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  );
}

/**
 * Create a new payroll (bake_payroll instruction)
 * MANUAL INSTRUCTION BUILDING (no IDL needed!)
 */
export async function createPayroll(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey,
  salaryPerSecond: number // in lamports
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    throw new Error('Wallet not connected');
  }

  const employer = wallet.publicKey;
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);

  console.log('Creating payroll...');
  console.log('Employer:', employer.toBase58());
  console.log('Employee:', employee.toBase58());
  console.log('PayrollJar PDA:', payrollJarPDA.toBase58());
  console.log('Salary per second:', salaryPerSecond, 'lamports');

  try {
    // Build the instruction data manually
    // Instruction discriminator for bake_payroll (first 8 bytes of sha256("global:bake_payroll"))
    const discriminator = Buffer.from([0x9a, 0xbc, 0xf1, 0x0c, 0x4b, 0x9f, 0x4e, 0x6d]);
    
    // Salary as u64 (8 bytes, little-endian)
    const salaryBuffer = Buffer.alloc(8);
    salaryBuffer.writeBigUInt64LE(BigInt(Math.floor(salaryPerSecond)));
    
    const data = Buffer.concat([discriminator, salaryBuffer]);

    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: payrollJarPDA, isSigner: false, isWritable: true },
        { pubkey: employer, isSigner: true, isWritable: true },
        { pubkey: employee, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: BAGEL_PROGRAM_ID,
      data,
    });

    const transaction = new web3.Transaction().add(instruction);
    transaction.feePayer = employer;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signed.serialize());
    
    console.log('Transaction sent:', txid);
    
    // Wait for confirmation
    await connection.confirmTransaction(txid, 'confirmed');
    
    console.log('✅ Payroll created! Transaction:', txid);
    return txid;
  } catch (error: any) {
    console.error('❌ Failed to create payroll:', error);
    throw new Error(`Failed to create payroll: ${error.message || error.toString()}`);
  }
}

/**
 * Fetch a PayrollJar account (manual deserialization)
 */
export async function fetchPayrollJar(
  connection: Connection,
  employee: PublicKey,
  employer: PublicKey
): Promise<any | null> {
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);

  try {
    const accountInfo = await connection.getAccountInfo(payrollJarPDA);
    
    if (!accountInfo) {
      console.log('No PayrollJar found');
      return null;
    }

    // Manual deserialization of PayrollJar account
    const data = accountInfo.data;
    
    // Skip 8-byte discriminator
    let offset = 8;
    
    // Read employer (32 bytes)
    const employerPubkey = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read employee (32 bytes)  
    const employeePubkey = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read encrypted_salary_per_second length (4 bytes) then bytes
    const salaryLength = data.readUInt32LE(offset);
    offset += 4;
    const encryptedSalary = data.slice(offset, offset + salaryLength);
    offset += salaryLength;
    
    // Read last_withdraw (8 bytes, i64)
    const lastWithdraw = Number(data.readBigInt64LE(offset));
    offset += 8;
    
    // Read total_accrued (8 bytes, u64)
    const totalAccrued = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // Read dough_vault (32 bytes)
    const doughVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read bump (1 byte)
    const bump = data.readUInt8(offset);
    offset += 1;
    
    // Read is_active (1 byte, bool)
    const isActive = data.readUInt8(offset) === 1;

    const parsed = {
      employer: employerPubkey,
      employee: employeePubkey,
      encryptedSalary,
      lastWithdraw,
      totalAccrued,
      doughVault,
      bump,
      isActive,
    };
    
    console.log('✅ Fetched PayrollJar:', parsed);
    return parsed;
  } catch (error) {
    console.error('Error fetching PayrollJar:', error);
    return null;
  }
}

/**
 * Get all PayrollJars for an employee (manual scanning)
 */
export async function fetchEmployeePayrolls(
  connection: Connection,
  employee: PublicKey
): Promise<any[]> {
  try {
    // For now, we can't easily scan without knowing employers
    // Return empty array - this would need getProgramAccounts with memcmp
    console.log('Scanning for employee payrolls...');
    return [];
  } catch (error) {
    console.error('Error fetching employee payrolls:', error);
    return [];
  }
}

/**
 * Calculate accrued salary (client-side for display)
 */
export function calculateAccrued(
  lastWithdraw: number,
  salaryPerSecond: number,
  currentTime: number
): number {
  const elapsed = currentTime - lastWithdraw;
  return Math.max(0, elapsed * salaryPerSecond);
}

/**
 * Format lamports to SOL
 */
export function lamportsToSOL(lamports: number): number {
  return lamports / web3.LAMPORTS_PER_SOL;
}

/**
 * Format SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * web3.LAMPORTS_PER_SOL);
}
