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
 * 
 * IMPORTANT: Uses wallet.sendTransaction() which properly respects the connection's cluster!
 */
export async function createPayroll(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey,
  salaryPerSecond: number // in lamports
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const employer = wallet.publicKey;
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);

  // Log connection info for debugging
  console.log('🔗 Connection endpoint:', connection.rpcEndpoint);
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

    // Create transaction
    const transaction = new web3.Transaction().add(instruction);
    
    // Get recent blockhash from our devnet connection
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = employer;

    console.log('📤 Sending transaction via wallet.sendTransaction()...');
    console.log('   Blockhash:', blockhash);
    
    // USE sendTransaction - this properly uses the connection's cluster!
    // This is the KEY FIX - signTransaction + sendRawTransaction bypasses wallet's network detection
    const txid = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    console.log('Transaction sent:', txid);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    }, 'confirmed');
    
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

/**
 * Withdraw accrued salary (get_dough instruction)
 * REAL TRANSACTION - Employee claims their earnings!
 * 
 * IMPORTANT: Uses wallet.sendTransaction() for proper devnet routing
 */
export async function withdrawDough(
  connection: Connection,
  wallet: WalletContextState,
  employer: PublicKey
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const employee = wallet.publicKey;
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);

  // Log connection info for debugging
  console.log('🔗 Connection endpoint:', connection.rpcEndpoint);
  console.log('💰 Withdrawing dough...');
  console.log('Employee:', employee.toBase58());
  console.log('Employer:', employer.toBase58());
  console.log('PayrollJar PDA:', payrollJarPDA.toBase58());

  try {
    // Build the instruction data manually
    // Instruction discriminator for get_dough (first 8 bytes of sha256("global:get_dough"))
    const discriminator = Buffer.from([0x7c, 0x84, 0x17, 0xf5, 0x95, 0x6e, 0x91, 0x18]);
    
    const data = discriminator; // No additional params needed

    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: payrollJarPDA, isSigner: false, isWritable: true },
        { pubkey: employee, isSigner: true, isWritable: true },
        { pubkey: employer, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: BAGEL_PROGRAM_ID,
      data,
    });

    // Create transaction
    const transaction = new web3.Transaction().add(instruction);
    
    // Get recent blockhash from our devnet connection
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = employee;

    console.log('📤 Sending withdraw transaction via wallet.sendTransaction()...');
    console.log('   Blockhash:', blockhash);
    
    // USE sendTransaction - this properly uses the connection's cluster!
    const txid = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    console.log('Transaction sent:', txid);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    }, 'confirmed');
    
    console.log('✅ Dough withdrawn! Transaction:', txid);
    return txid;
  } catch (error: any) {
    console.error('❌ Failed to withdraw dough:', error);
    throw new Error(`Failed to withdraw: ${error.message || error.toString()}`);
  }
}

/**
 * Deposit funds to payroll (deposit_dough instruction)
 * REAL TRANSACTION - Employer adds SOL to employee's payroll
 * 
 * IMPORTANT: Uses wallet.sendTransaction() for proper devnet routing
 */
export async function depositDough(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey,
  amountLamports: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const employer = wallet.publicKey;
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);

  // Log connection info for debugging
  console.log('🔗 Connection endpoint:', connection.rpcEndpoint);
  console.log('💵 Depositing dough...');
  console.log('Employer:', employer.toBase58());
  console.log('Employee:', employee.toBase58());
  console.log('PayrollJar PDA:', payrollJarPDA.toBase58());
  console.log('Amount:', amountLamports, 'lamports');

  try {
    // Build the instruction data manually
    // Instruction discriminator for deposit_dough (first 8 bytes of sha256("global:deposit_dough"))
    const discriminator = Buffer.from([0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0x41, 0x0a]);
    
    // Amount as u64 (8 bytes, little-endian)
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(amountLamports));
    
    const data = Buffer.concat([discriminator, amountBuffer]);

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

    // Create transaction
    const transaction = new web3.Transaction().add(instruction);
    
    // Get recent blockhash from our devnet connection
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = employer;

    console.log('📤 Sending deposit transaction via wallet.sendTransaction()...');
    console.log('   Blockhash:', blockhash);
    
    // USE sendTransaction - this properly uses the connection's cluster!
    const txid = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    console.log('Transaction sent:', txid);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    }, 'confirmed');
    
    console.log('✅ Dough deposited! Transaction:', txid);
    return txid;
  } catch (error: any) {
    console.error('❌ Failed to deposit dough:', error);
    throw new Error(`Failed to deposit: ${error.message || error.toString()}`);
  }
}

/**
 * Close/cancel a payroll (close_jar instruction)
 * REAL TRANSACTION - Employer cancels payroll and gets remaining funds back
 * 
 * IMPORTANT: Uses wallet.sendTransaction() for proper devnet routing
 */
export async function closePayroll(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const employer = wallet.publicKey;
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);

  // Log connection info for debugging
  console.log('🔗 Connection endpoint:', connection.rpcEndpoint);
  console.log('🗑️ Closing payroll jar...');
  console.log('Employer:', employer.toBase58());
  console.log('Employee:', employee.toBase58());
  console.log('PayrollJar PDA:', payrollJarPDA.toBase58());

  try {
    // Build the instruction data manually
    // Instruction discriminator for close_jar (first 8 bytes of sha256("global:close_jar"))
    const discriminator = Buffer.from([0x48, 0xe0, 0xd5, 0x0a, 0x88, 0x7c, 0x12, 0x3b]);
    
    const data = discriminator; // No additional params needed

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

    // Create transaction
    const transaction = new web3.Transaction().add(instruction);
    
    // Get recent blockhash from our devnet connection
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = employer;

    console.log('📤 Sending close transaction via wallet.sendTransaction()...');
    console.log('   Blockhash:', blockhash);
    
    // USE sendTransaction - this properly uses the connection's cluster!
    const txid = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    console.log('Transaction sent:', txid);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    }, 'confirmed');
    
    console.log('✅ Payroll closed! Transaction:', txid);
    return txid;
  } catch (error: any) {
    console.error('❌ Failed to close payroll:', error);
    throw new Error(`Failed to close payroll: ${error.message || error.toString()}`);
  }
}
