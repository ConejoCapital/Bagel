#!/usr/bin/env npx ts-node
/**
 * Test Manual Withdrawal - Employee claims salary through Payroll program
 * Tests the full flow: business -> employee -> manual withdrawal
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, Idl } from '@coral-xyz/anchor';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Program IDs
const PAYROLL_PROGRAM_ID = new PublicKey('J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2');
const INCO_TOKEN_PROGRAM_ID = new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N');
const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
const USDBAGEL_MINT = new PublicKey('GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt');
const DELEGATION_PROGRAM_ID = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh');

// Target recipient (employee wallet)
const EMPLOYEE_WALLET = new PublicKey('Fcqa5QLsoXaX3Q5sLbdp1MiJfvAmewK3Nh3GSoPEcSqw');

// Seeds
const VAULT_SEED = Buffer.from('vault');
const BUSINESS_SEED = Buffer.from('business');
const EMPLOYEE_SEED = Buffer.from('employee');

// Helius RPC
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af';

// Inco Token discriminators
const INIT_ACCOUNT_DISCRIMINATOR = (() => {
  const hash = createHash('sha256').update('global:initialize_account').digest();
  return hash.slice(0, 8);
})();

const MINT_TO_DISCRIMINATOR = (() => {
  const hash = createHash('sha256').update('global:mint_to').digest();
  return hash.slice(0, 8);
})();

function loadMintAuthority(): Keypair {
  const envPath = path.join(__dirname, '../app/.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/MINT_AUTHORITY_KEYPAIR=(.+)/);
  if (!match) throw new Error('MINT_AUTHORITY_KEYPAIR not found in env');
  const secretKeyBase64 = match[1].trim();
  const secretKey = Buffer.from(secretKeyBase64, 'base64');
  return Keypair.fromSecretKey(secretKey);
}

async function main() {
  console.log('🥯 Payroll Manual Withdrawal Test\n');
  console.log('Employee Wallet:', EMPLOYEE_WALLET.toBase58());
  console.log();

  const connection = new Connection(RPC_URL, 'confirmed');

  // Use mint authority to fund operations
  const mintAuthority = loadMintAuthority();
  console.log('Mint Authority:', mintAuthority.publicKey.toBase58());

  // Generate a new keypair for fresh business owner
  const owner = Keypair.generate();
  console.log('New Business Owner:', owner.publicKey.toBase58());

  // Fund the new owner with SOL
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: mintAuthority.publicKey,
      toPubkey: owner.publicKey,
      lamports: 0.3e9, // 0.3 SOL for all operations
    })
  );
  await sendAndConfirmTransaction(connection, fundTx, [mintAuthority]);
  console.log('Funded with 0.3 SOL\n');

  // Derive PDAs
  const [businessPDA] = PublicKey.findProgramAddressSync(
    [BUSINESS_SEED, owner.publicKey.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [VAULT_SEED, businessPDA.toBuffer()],
    PAYROLL_PROGRAM_ID
  );

  console.log('Derived PDAs:');
  console.log('  Business:', businessPDA.toBase58());
  console.log('  Vault:', vaultPDA.toBase58());

  // Load IDL and create program
  const idlPath = path.join(__dirname, '../target/idl/payroll.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8')) as Idl;
  const wallet = new Wallet(owner);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, provider);

  // =========================================================================
  // STEP 1: Create Vault Token Account
  // =========================================================================
  console.log('\n📝 STEP 1: Create Vault Inco Token Account');

  const vaultTokenAccount = Keypair.generate();
  console.log('   Vault Token Account:', vaultTokenAccount.publicKey.toBase58());

  try {
    const initVaultTokenIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: vaultTokenAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
        { pubkey: vaultPDA, isSigner: false, isWritable: false }, // Vault PDA as owner
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: INIT_ACCOUNT_DISCRIMINATOR,
    });

    const tx = new Transaction().add(initVaultTokenIx);
    await sendAndConfirmTransaction(connection, tx, [owner, vaultTokenAccount]);
    console.log('   ✅ Created');
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    return;
  }

  // =========================================================================
  // STEP 2: Register Business
  // =========================================================================
  console.log('\n📝 STEP 2: Register Business');

  try {
    const tx = await program.methods
      .registerBusiness()
      .accounts({
        owner: owner.publicKey,
        business: businessPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('   ✅ Registered');
    console.log('   TX:', tx);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    return;
  }

  // =========================================================================
  // STEP 3: Initialize Vault
  // =========================================================================
  console.log('\n📝 STEP 3: Initialize Vault');

  try {
    const tx = await program.methods
      .initVault(USDBAGEL_MINT, vaultTokenAccount.publicKey)
      .accounts({
        owner: owner.publicKey,
        business: businessPDA,
        vault: vaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('   ✅ Initialized');
    console.log('   TX:', tx);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    return;
  }

  // =========================================================================
  // STEP 4: Create Owner Token Account & Fund Vault
  // =========================================================================
  console.log('\n📝 STEP 4: Create Owner Token Account & Fund Vault');

  const ownerTokenAccount = Keypair.generate();
  console.log('   Owner Token Account:', ownerTokenAccount.publicKey.toBase58());

  try {
    // Create owner token account
    const initOwnerTokenIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: ownerTokenAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
        { pubkey: owner.publicKey, isSigner: false, isWritable: false },
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: INIT_ACCOUNT_DISCRIMINATOR,
    });

    const tx1 = new Transaction().add(initOwnerTokenIx);
    await sendAndConfirmTransaction(connection, tx1, [owner, ownerTokenAccount]);
    console.log('   ✅ Owner token account created');

    // Mint tokens to owner
    const mintAmount = Buffer.alloc(32);
    mintAmount.writeBigUInt64LE(BigInt(1000_000_000_000), 0); // 1000 tokens (9 decimals)

    const mintData = Buffer.concat([
      MINT_TO_DISCRIMINATOR,
      Buffer.from([32, 0, 0, 0]),
      mintAmount,
      Buffer.from([0, 0, 0, 0]),
    ]);

    const mintToIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: mintData,
    });

    const tx2 = new Transaction().add(mintToIx);
    await sendAndConfirmTransaction(connection, tx2, [mintAuthority]);
    console.log('   ✅ 1000 tokens minted to owner');
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    return;
  }

  // =========================================================================
  // STEP 5: Deposit to Vault
  // =========================================================================
  console.log('\n📝 STEP 5: Deposit 500 tokens to Vault');

  try {
    const depositAmount = Buffer.alloc(32);
    depositAmount.writeBigUInt64LE(BigInt(500_000_000_000), 0); // 500 tokens

    const tx = await program.methods
      .deposit(Buffer.from(depositAmount))
      .accounts({
        owner: owner.publicKey,
        business: businessPDA,
        vault: vaultPDA,
        depositorTokenAccount: ownerTokenAccount.publicKey,
        vaultTokenAccount: vaultTokenAccount.publicKey,
        incoTokenProgram: INCO_TOKEN_PROGRAM_ID,
        incoLightningProgram: INCO_LIGHTNING_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('   ✅ Deposited!');
    console.log('   TX:', tx);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    if (err.logs) console.log('   Logs:', err.logs.slice(-3).join('\n        '));
    return;
  }

  // =========================================================================
  // STEP 6: Add Employee
  // =========================================================================
  console.log('\n📝 STEP 6: Add Employee');

  // Derive employee PDA (index 0)
  const employeeIndex = 0;
  const [employeePDA] = PublicKey.findProgramAddressSync(
    [EMPLOYEE_SEED, businessPDA.toBuffer(), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(employeeIndex)]).buffer))],
    PAYROLL_PROGRAM_ID
  );
  console.log('   Employee PDA:', employeePDA.toBase58());
  console.log('   Employee Index:', employeeIndex);

  try {
    // Encrypted employee ID (hash of wallet pubkey)
    const employeeIdHash = createHash('sha256').update(EMPLOYEE_WALLET.toBuffer()).digest();

    // Encrypted salary rate (100 tokens per month = ~0.0000385 per second with 9 decimals)
    // For testing, let's use 1 token per second = 1_000_000_000
    const salaryRate = Buffer.alloc(32);
    salaryRate.writeBigUInt64LE(BigInt(1_000_000_000), 0); // 1 token/sec

    const tx = await program.methods
      .addEmployee(Buffer.from(employeeIdHash), Buffer.from(salaryRate))
      .accounts({
        owner: owner.publicKey,
        business: businessPDA,
        employee: employeePDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('   ✅ Employee added');
    console.log('   TX:', tx);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    if (err.logs) console.log('   Logs:', err.logs.slice(-3).join('\n        '));
    return;
  }

  // =========================================================================
  // STEP 7: Create Employee Token Account
  // =========================================================================
  console.log('\n📝 STEP 7: Create Employee Token Account');

  const employeeTokenAccount = Keypair.generate();
  console.log('   Employee Token Account:', employeeTokenAccount.publicKey.toBase58());
  console.log('   Employee Wallet (owner):', EMPLOYEE_WALLET.toBase58());

  try {
    const initEmployeeTokenIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: employeeTokenAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
        { pubkey: EMPLOYEE_WALLET, isSigner: false, isWritable: false }, // Employee wallet as owner
        { pubkey: owner.publicKey, isSigner: true, isWritable: true }, // Payer
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: INIT_ACCOUNT_DISCRIMINATOR,
    });

    const tx = new Transaction().add(initEmployeeTokenIx);
    await sendAndConfirmTransaction(connection, tx, [owner, employeeTokenAccount]);
    console.log('   ✅ Employee token account created');
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    return;
  }

  // =========================================================================
  // STEP 8: Accrue Salary (simulate time passing)
  // =========================================================================
  console.log('\n📝 STEP 8: Accrue Salary');

  try {
    // Wait a few seconds to accumulate salary
    console.log('   Waiting 3 seconds for salary to accrue...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const tx = await program.methods
      .accrue()
      .accounts({
        payer: owner.publicKey,
        employee: employeePDA,
      })
      .rpc();

    console.log('   ✅ Salary accrued');
    console.log('   TX:', tx);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    if (err.logs) console.log('   Logs:', err.logs.slice(-3).join('\n        '));
  }

  // =========================================================================
  // STEP 9: Manual Withdrawal (Employee claims salary)
  // =========================================================================
  console.log('\n📝 STEP 9: Manual Withdrawal');
  console.log('   Note: This requires the employee to sign, but we\'re simulating with owner');
  console.log('   In production, the actual employee wallet would sign this transaction');

  // For testing, we need the employee signer. Since we don't have the private key
  // for EMPLOYEE_WALLET, we'll create a test employee signer
  const testEmployeeSigner = Keypair.generate();
  console.log('   Test Employee Signer:', testEmployeeSigner.publicKey.toBase58());

  // Fund the test employee signer
  const fundEmployeeTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: owner.publicKey,
      toPubkey: testEmployeeSigner.publicKey,
      lamports: 0.01e9,
    })
  );
  await sendAndConfirmTransaction(connection, fundEmployeeTx, [owner]);

  // Create token account for test employee
  const testEmployeeTokenAccount = Keypair.generate();
  try {
    const initTestEmployeeTokenIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: testEmployeeTokenAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
        { pubkey: testEmployeeSigner.publicKey, isSigner: false, isWritable: false },
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: INIT_ACCOUNT_DISCRIMINATOR,
    });

    const tx = new Transaction().add(initTestEmployeeTokenIx);
    await sendAndConfirmTransaction(connection, tx, [owner, testEmployeeTokenAccount]);
    console.log('   ✅ Test employee token account created:', testEmployeeTokenAccount.publicKey.toBase58());
  } catch (err: any) {
    console.log('   ❌ Error creating test employee token account:', err.message);
    return;
  }

  // MagicBlock context accounts
  // The ephemeral SDK uses these placeholder addresses in the IDL
  // We need to pass the real delegation program but since employee is not delegated,
  // the commit logic will be skipped
  const MAGIC_PROGRAM = new PublicKey('Magic11111111111111111111111111111111111111');
  const MAGIC_CONTEXT = new PublicKey('MagicContext1111111111111111111111111111111');

  // Since the MagicBlock placeholder addresses don't exist on devnet and we can't
  // call manualWithdraw with #[commit] macro, let's test a direct transfer instead
  // using the Inco Token program transfer instruction

  console.log('   Since employee is not delegated to TEE and MagicBlock context is required,');
  console.log('   we will test a direct transfer from vault to employee instead.');

  // Build direct transfer instruction (same as what manualWithdraw would do internally)
  const TRANSFER_DISCRIMINATOR = Buffer.from([163, 52, 200, 231, 140, 3, 69, 186]);

  // Transfer amount - for testing, let's transfer a small amount
  const transferAmount = Buffer.alloc(32);
  transferAmount.writeBigUInt64LE(BigInt(10_000_000_000), 0); // 10 tokens

  const transferData = Buffer.concat([
    TRANSFER_DISCRIMINATOR,
    Buffer.from([(32 & 0xff), (32 >> 8) & 0xff, (32 >> 16) & 0xff, (32 >> 24) & 0xff]), // length prefix
    transferAmount,
    Buffer.from([0]), // input_type 0
  ]);

  try {
    // For vault to transfer, it needs to sign as PDA
    // But we can't do that directly from a script - we need to go through the program
    // Since manualWithdraw has MagicBlock requirements, let's try calling it anyway
    // and see what happens

    const tx = await program.methods
      .manualWithdraw()
      .accounts({
        employeeSigner: testEmployeeSigner.publicKey,
        business: businessPDA,
        vault: vaultPDA,
        employee: employeePDA,
        vaultTokenAccount: vaultTokenAccount.publicKey,
        employeeTokenAccount: testEmployeeTokenAccount.publicKey,
        incoTokenProgram: INCO_TOKEN_PROGRAM_ID,
        incoLightningProgram: INCO_LIGHTNING_ID,
        systemProgram: SystemProgram.programId,
        magicProgram: DELEGATION_PROGRAM_ID, // Use real delegation program
        magicContext: MAGIC_CONTEXT,
      })
      .signers([testEmployeeSigner])
      .rpc();

    console.log('   ✅ Manual withdrawal successful!');
    console.log('   TX:', tx);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    if (err.logs) {
      console.log('   Logs:');
      err.logs.slice(-10).forEach((log: string) => console.log('      ', log));
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🥯 MANUAL WITHDRAWAL TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nAccounts Created:');
  console.log('  Business:', businessPDA.toBase58());
  console.log('  Vault:', vaultPDA.toBase58());
  console.log('  Vault Token:', vaultTokenAccount.publicKey.toBase58());
  console.log('  Employee PDA:', employeePDA.toBase58());
  console.log('  Employee Token:', testEmployeeTokenAccount.publicKey.toBase58());
  console.log('\nExplorer Links:');
  console.log('  Vault:', `https://orbmarkets.io/account/${vaultPDA.toBase58()}?cluster=devnet`);
  console.log('  Employee:', `https://orbmarkets.io/account/${employeePDA.toBase58()}?cluster=devnet`);
}

main().catch(console.error);
