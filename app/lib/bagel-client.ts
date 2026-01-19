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
 * 
 * IMPORTANT: Seed order must match the program!
 * Program uses: [SEED, employer, employee] (see bake_payroll.rs lines 62-65)
 */
export function getPayrollJarPDA(
  employee: PublicKey,
  employer: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      BAGEL_JAR_SEED,
      employer.toBuffer(),  // employer FIRST (matches program)
      employee.toBuffer(),  // employee SECOND (matches program)
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
 * APPROACH: Use wallet.sendTransaction() with the devnet connection passed in.
 * The connection MUST be from useConnection() which uses our devnet ConnectionProvider.
 */
export async function createPayroll(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey,
  salaryPerSecond: number // in lamports
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const employer = wallet.publicKey;
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);

  // Log connection info for debugging
  console.log('🔗 Connection endpoint:', connection.rpcEndpoint);
  console.log('🌐 This transaction will be sent to DEVNET via Helius RPC');
  console.log('Creating payroll...');
  console.log('Employer:', employer.toBase58());
  console.log('Employee:', employee.toBase58());
  console.log('PayrollJar PDA:', payrollJarPDA.toBase58());
  console.log('Salary per second:', salaryPerSecond, 'lamports');

  try {
    // 🔒 REAL PRIVACY: Encrypt salary client-side before sending to program
    // This ensures the plaintext salary never appears on-chain
    console.log('🔒 Encrypting salary client-side using Arcium RescueCipher...');
    
    const { ArciumClient } = await import('./arcium');
    const rpcUrl = connection.rpcEndpoint;
    const isDevnet = rpcUrl.includes('devnet') || rpcUrl.includes('localhost');
    const network = isDevnet ? 'devnet' : 'mainnet-beta';
    
    const arciumClient = new ArciumClient({
      solanaRpcUrl: rpcUrl,
      network: network,
      circuitId: process.env.NEXT_PUBLIC_ARCIUM_CIRCUIT_ID,
      priorityFeeMicroLamports: 1000,
    });
    
    // Encrypt the salary amount
    // Use employee's public key as recipient (they'll decrypt later)
    const employeePubkeyBytes = employee.toBytes();
    const encryptedPayload = await arciumClient.encryptSalary(salaryPerSecond, employeePubkeyBytes);
    
    // Ensure ciphertext is exactly 32 bytes for [u8; 32] in Rust
    // The encryption returns 8 bytes (for u64), so we pad to 32 bytes
    let ciphertext = new Uint8Array(32);
    if (encryptedPayload.ciphertext.length >= 32) {
      ciphertext.set(encryptedPayload.ciphertext.slice(0, 32));
    } else {
      // Pad the 8-byte ciphertext to 32 bytes
      // First 8 bytes: encrypted amount
      // Remaining 24 bytes: padding (can be zeros or derived from encryption key)
      ciphertext.set(encryptedPayload.ciphertext.slice(0, Math.min(8, encryptedPayload.ciphertext.length)));
      // Pad with hash of original ciphertext for better security (not just zeros)
      const paddingHash = await crypto.subtle.digest('SHA-256', new Uint8Array(encryptedPayload.ciphertext).buffer);
      const paddingBytes = new Uint8Array(paddingHash);
      ciphertext.set(paddingBytes.slice(0, 24), 8);
    }
    
    console.log('✅ Salary encrypted:', ciphertext.length, 'bytes');
    console.log('   Original amount:', salaryPerSecond, 'lamports');
    console.log('   Ciphertext (first 8 bytes):', Array.from(ciphertext.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    
    // Build the instruction data manually
    // Instruction discriminator for bake_payroll (first 8 bytes of sha256("global:bake_payroll"))
    // Verified: echo -n "global:bake_payroll" | shasum -a 256 = 175f686159cfa592...
    const discriminator = Buffer.from([0x17, 0x5f, 0x68, 0x61, 0x59, 0xcf, 0xa5, 0x92]);
    
    // Salary ciphertext as [u8; 32] (32 bytes)
    const ciphertextBuffer = Buffer.from(ciphertext);
    
    const data = Buffer.concat([discriminator, ciphertextBuffer]);

    // Account order MUST match BakePayroll struct in bake_payroll.rs:
    // 1. employer (Signer, mut)
    // 2. employee (UncheckedAccount, not mut)
    // 3. payroll_jar (Account, init, mut) 
    // 4. system_program
    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: employer, isSigner: true, isWritable: true },      // 1. employer
        { pubkey: employee, isSigner: false, isWritable: false },    // 2. employee
        { pubkey: payrollJarPDA, isSigner: false, isWritable: true },// 3. payroll_jar PDA
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 4. system
      ],
      programId: BAGEL_PROGRAM_ID,
      data,
    });

    // Create transaction
    const transaction = new web3.Transaction().add(instruction);
    
    // Get recent blockhash from our DEVNET connection (Helius)
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = employer;

    console.log('📝 Requesting signature from wallet...');
    console.log('   Blockhash (from devnet):', blockhash);
    
    // Use sendTransaction with explicit options
    // skipPreflight: true to avoid wallet trying to simulate on wrong network
    const txid = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: true, // CRITICAL: Skip wallet's preflight to avoid network mismatch
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });
    
    console.log('Transaction sent to devnet:', txid);
    
    // Now do OUR OWN simulation/confirmation on devnet
    console.log('⏳ Waiting for devnet confirmation...');
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    }, 'confirmed');
    
    // Verify transaction actually succeeded (not just included)
    console.log('🔍 Verifying transaction success...');
    const { verifyTransactionSuccess } = await import('./transaction-utils');
    const verification = await verifyTransactionSuccess(connection, txid);
    
    if (!verification.success) {
      throw new Error(`Transaction failed: ${verification.error}`);
    }
    
    console.log('✅ Payroll created on DEVNET! Transaction:', txid);
    return txid;
  } catch (error: any) {
    console.error('❌ Failed to create payroll:', error);
    
    // More helpful error messages
    if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient SOL on devnet. Get free SOL at https://faucet.solana.com');
    }
    if (error.message?.includes('Blockhash not found')) {
      throw new Error('Transaction expired. Please try again.');
    }
    if (error.message?.includes('0x1') || error.message?.includes('already in use')) {
      throw new Error('Payroll already exists for this employee. Use "Deposit Dough" to add funds.');
    }
    if (error.message?.includes('Instruction #') || error.message?.includes('Transaction failed')) {
      throw new Error(`Transaction failed: ${error.message}. Check Solana Explorer for details.`);
    }
    if (error.name === 'WalletSendTransactionError') {
      throw new Error('Wallet error - please make sure Phantom is set to Devnet in Settings > Developer Settings > Testnet Mode ON, then select "Solana Devnet" from the network dropdown.');
    }
    
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
 * APPROACH: Use sendTransaction with skipPreflight to avoid network mismatch
 */
export async function withdrawDough(
  connection: Connection,
  wallet: WalletContextState,
  employer: PublicKey
): Promise<string> {
  if (!wallet.publicKey) {
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
    // Verified: echo -n "global:get_dough" | shasum -a 256 = 5305fcc4e20c0b24...
    const discriminator = Buffer.from([0x53, 0x05, 0xfc, 0xc4, 0xe2, 0x0c, 0x0b, 0x24]);
    
    const data = discriminator; // No additional params needed

    // Account order MUST match GetDough struct in get_dough.rs:
    // 1. employee (Signer, mut)
    // 2. employer (UncheckedAccount)
    // 3. payroll_jar (Account, mut)
    // 4. system_program
    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: employee, isSigner: true, isWritable: true },        // 1. employee
        { pubkey: employer, isSigner: false, isWritable: false },      // 2. employer
        { pubkey: payrollJarPDA, isSigner: false, isWritable: true },  // 3. payroll_jar
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 4. system
      ],
      programId: BAGEL_PROGRAM_ID,
      data,
    });

    // Create transaction
    const transaction = new web3.Transaction().add(instruction);
    
    // Get recent blockhash from our DEVNET connection
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = employee;

    console.log('📝 Requesting signature...');
    
    // Use sendTransaction with skipPreflight
    const txid = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });
    
    console.log('Transaction sent:', txid);
    
    // Wait for confirmation
    console.log('⏳ Waiting for devnet confirmation...');
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    }, 'confirmed');
    
    // Verify transaction actually succeeded
    console.log('🔍 Verifying transaction success...');
    const { verifyTransactionSuccess } = await import('./transaction-utils');
    const verification = await verifyTransactionSuccess(connection, txid);
    
    if (!verification.success) {
      throw new Error(`Transaction failed: ${verification.error}`);
    }
    
    console.log('✅ Dough withdrawn! Transaction:', txid);
    return txid;
  } catch (error: any) {
    console.error('❌ Failed to withdraw dough:', error);
    if (error.name === 'WalletSendTransactionError') {
      throw new Error('Wallet error - please ensure Phantom is on Devnet (Settings > Developer Settings > Testnet Mode, then select Solana Devnet).');
    }
    throw new Error(`Failed to withdraw: ${error.message || error.toString()}`);
  }
}

/**
 * Deposit funds to payroll (deposit_dough instruction)
 * REAL TRANSACTION - Employer adds SOL to employee's payroll
 * 
 * APPROACH: Use sendTransaction with skipPreflight to avoid network mismatch
 */
export async function depositDough(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey,
  amountLamports: number
): Promise<string> {
  if (!wallet.publicKey) {
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
    // Verified: echo -n "global:deposit_dough" | shasum -a 256 = 430f358819db275f...
    const discriminator = Buffer.from([0x43, 0x0f, 0x35, 0x88, 0x19, 0xdb, 0x27, 0x5f]);
    
    // Amount as u64 (8 bytes, little-endian)
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(amountLamports));
    
    const data = Buffer.concat([discriminator, amountBuffer]);

    // Account order MUST match DepositDough struct in deposit_dough.rs:
    // 1. employer (Signer, mut)
    // 2. employee (UncheckedAccount)
    // 3. payroll_jar (Account, mut)
    // 4. system_program
    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: employer, isSigner: true, isWritable: true },       // 1. employer
        { pubkey: employee, isSigner: false, isWritable: false },     // 2. employee
        { pubkey: payrollJarPDA, isSigner: false, isWritable: true }, // 3. payroll_jar
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 4. system
      ],
      programId: BAGEL_PROGRAM_ID,
      data,
    });

    // Create transaction
    const transaction = new web3.Transaction().add(instruction);
    
    // Get recent blockhash from our DEVNET connection
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = employer;

    console.log('📝 Requesting signature...');
    
    // Use sendTransaction with skipPreflight
    const txid = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });
    
    console.log('Transaction sent:', txid);
    
    // Wait for confirmation
    console.log('⏳ Waiting for devnet confirmation...');
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    }, 'confirmed');
    
    // Verify transaction actually succeeded
    console.log('🔍 Verifying transaction success...');
    const { verifyTransactionSuccess } = await import('./transaction-utils');
    const verification = await verifyTransactionSuccess(connection, txid);
    
    if (!verification.success) {
      throw new Error(`Transaction failed: ${verification.error}`);
    }
    
    console.log('✅ Dough deposited! Transaction:', txid);
    return txid;
  } catch (error: any) {
    console.error('❌ Failed to deposit dough:', error);
    
    // Check for common errors
    if (error.message?.includes('AccountNotInitialized') || error.message?.includes('0x0')) {
      throw new Error('Payroll does not exist. Please create the payroll first using "Bake a New Payroll".');
    }
    if (error.message?.includes('Instruction #') || error.message?.includes('Transaction failed')) {
      throw new Error(`Transaction failed: ${error.message}. Make sure the payroll exists first.`);
    }
    if (error.name === 'WalletSendTransactionError') {
      throw new Error('Wallet error - please ensure Phantom is on Devnet (Settings > Developer Settings > Testnet Mode, then select Solana Devnet).');
    }
    
    throw new Error(`Failed to deposit: ${error.message || error.toString()}`);
  }
}

/**
 * Close/cancel a payroll (close_jar instruction)
 * REAL TRANSACTION - Employer cancels payroll and gets remaining funds back
 * 
 * APPROACH: Use sendTransaction with skipPreflight to avoid network mismatch
 */
export async function closePayroll(
  connection: Connection,
  wallet: WalletContextState,
  employee: PublicKey
): Promise<string> {
  if (!wallet.publicKey) {
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
    // Verified: echo -n "global:close_jar" | shasum -a 256 = 5cbd7224ba7b00a3...
    const discriminator = Buffer.from([0x5c, 0xbd, 0x72, 0x24, 0xba, 0x7b, 0x00, 0xa3]);
    
    const data = discriminator; // No additional params needed

    // Account order MUST match CloseJar struct in close_jar.rs:
    // 1. employer (Signer, mut)
    // 2. employee (UncheckedAccount)
    // 3. payroll_jar (Account, mut, close)
    // 4. system_program
    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: employer, isSigner: true, isWritable: true },        // 1. employer
        { pubkey: employee, isSigner: false, isWritable: false },      // 2. employee
        { pubkey: payrollJarPDA, isSigner: false, isWritable: true },  // 3. payroll_jar
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 4. system
      ],
      programId: BAGEL_PROGRAM_ID,
      data,
    });

    // Create transaction
    const transaction = new web3.Transaction().add(instruction);
    
    // Get recent blockhash from our DEVNET connection
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = employer;

    console.log('📝 Requesting signature...');
    
    // Use sendTransaction with skipPreflight
    const txid = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });
    
    console.log('Transaction sent:', txid);
    
    // Wait for confirmation
    console.log('⏳ Waiting for devnet confirmation...');
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    }, 'confirmed');
    
    // Verify transaction actually succeeded
    console.log('🔍 Verifying transaction success...');
    const { verifyTransactionSuccess } = await import('./transaction-utils');
    const verification = await verifyTransactionSuccess(connection, txid);
    
    if (!verification.success) {
      throw new Error(`Transaction failed: ${verification.error}`);
    }
    
    console.log('✅ Payroll closed! Transaction:', txid);
    return txid;
  } catch (error: any) {
    console.error('❌ Failed to close payroll:', error);
    if (error.name === 'WalletSendTransactionError') {
      throw new Error('Wallet error - please ensure Phantom is on Devnet (Settings > Developer Settings > Testnet Mode, then select Solana Devnet).');
    }
    throw new Error(`Failed to close payroll: ${error.message || error.toString()}`);
  }
}
