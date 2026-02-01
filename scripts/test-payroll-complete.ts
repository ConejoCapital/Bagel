#!/usr/bin/env npx ts-node
/**
 * Complete Payroll Flow Test
 * Tests: Business -> Vault -> Deposit -> Add Employee -> Simple Withdraw
 *
 * Run: npx ts-node scripts/test-payroll-complete.ts
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

// ============================================================
// Configuration
// ============================================================

const PAYROLL_PROGRAM_ID = new PublicKey('J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2');
const INCO_TOKEN_PROGRAM_ID = new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N');
const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
const USDBAGEL_MINT = new PublicKey('GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt');

// Target employee wallet (who will receive salary)
const EMPLOYEE_WALLET = new PublicKey('Fcqa5QLsoXaX3Q5sLbdp1MiJfvAmewK3Nh3GSoPEcSqw');

// Seeds
const VAULT_SEED = Buffer.from('vault');
const BUSINESS_SEED = Buffer.from('business');
const EMPLOYEE_SEED = Buffer.from('employee');

// RPC
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af';

// ============================================================
// Discriminators
// ============================================================

const INIT_ACCOUNT_DISCRIMINATOR = (() => {
  const hash = createHash('sha256').update('global:initialize_account').digest();
  return hash.slice(0, 8);
})();

const MINT_TO_DISCRIMINATOR = (() => {
  const hash = createHash('sha256').update('global:mint_to').digest();
  return hash.slice(0, 8);
})();

// ============================================================
// Helper Functions
// ============================================================

function loadMintAuthority(): Keypair {
  const envPath = path.join(__dirname, '../app/.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/MINT_AUTHORITY_KEYPAIR=(.+)/);
  if (!match) throw new Error('MINT_AUTHORITY_KEYPAIR not found');
  return Keypair.fromSecretKey(Buffer.from(match[1].trim(), 'base64'));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// Main Flow
// ============================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('🥯 BAGEL PAYROLL - COMPLETE FLOW TEST');
  console.log('═'.repeat(60));
  console.log('\nTarget Employee:', EMPLOYEE_WALLET.toBase58());
  console.log();

  const connection = new Connection(RPC_URL, 'confirmed');
  const mintAuthority = loadMintAuthority();

  // Generate fresh business owner
  const owner = Keypair.generate();
  console.log('📋 New Business Owner:', owner.publicKey.toBase58());

  // Fund the owner
  console.log('\n💰 Funding owner with 0.3 SOL...');
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: mintAuthority.publicKey,
      toPubkey: owner.publicKey,
      lamports: 0.3e9,
    })
  );
  await sendAndConfirmTransaction(connection, fundTx, [mintAuthority]);
  console.log('   ✅ Funded');

  // Derive PDAs
  const [businessPDA] = PublicKey.findProgramAddressSync(
    [BUSINESS_SEED, owner.publicKey.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [VAULT_SEED, businessPDA.toBuffer()],
    PAYROLL_PROGRAM_ID
  );

  console.log('\n📍 PDAs:');
  console.log('   Business:', businessPDA.toBase58());
  console.log('   Vault:', vaultPDA.toBase58());

  // Load program
  const idlPath = path.join(__dirname, '../target/idl/payroll.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8')) as Idl;
  const wallet = new Wallet(owner);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, provider);

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Create Vault Token Account
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 1: Create Vault Token Account');
  console.log('─'.repeat(60));

  const vaultTokenAccount = Keypair.generate();
  console.log('   Address:', vaultTokenAccount.publicKey.toBase58());

  const initVaultTokenIx = new TransactionInstruction({
    programId: INCO_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: vaultTokenAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
      { pubkey: vaultPDA, isSigner: false, isWritable: false },
      { pubkey: owner.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
    ],
    data: INIT_ACCOUNT_DISCRIMINATOR,
  });

  await sendAndConfirmTransaction(connection, new Transaction().add(initVaultTokenIx), [owner, vaultTokenAccount]);
  console.log('   ✅ Created');

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Register Business
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 2: Register Business');
  console.log('─'.repeat(60));

  const regTx = await program.methods
    .registerBusiness()
    .accounts({
      owner: owner.publicKey,
      business: businessPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log('   ✅ Registered');
  console.log('   TX:', regTx);

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Initialize Vault
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 3: Initialize Vault');
  console.log('─'.repeat(60));

  const initTx = await program.methods
    .initVault(USDBAGEL_MINT, vaultTokenAccount.publicKey)
    .accounts({
      owner: owner.publicKey,
      business: businessPDA,
      vault: vaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log('   ✅ Initialized');
  console.log('   TX:', initTx);

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Create Owner Token Account & Mint
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 4: Create Owner Token Account & Mint 1000 USDBagel');
  console.log('─'.repeat(60));

  const ownerTokenAccount = Keypair.generate();
  console.log('   Address:', ownerTokenAccount.publicKey.toBase58());

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
  await sendAndConfirmTransaction(connection, new Transaction().add(initOwnerTokenIx), [owner, ownerTokenAccount]);
  console.log('   ✅ Token account created');

  // Mint tokens to owner
  const mintAmount = Buffer.alloc(32);
  mintAmount.writeBigUInt64LE(BigInt(1000_000_000_000), 0); // 1000 tokens

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
  await sendAndConfirmTransaction(connection, new Transaction().add(mintToIx), [mintAuthority]);
  console.log('   ✅ 1000 USDBagel minted');

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Deposit to Vault
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 5: Deposit 500 USDBagel to Vault');
  console.log('─'.repeat(60));

  const depositAmount = Buffer.alloc(32);
  depositAmount.writeBigUInt64LE(BigInt(500_000_000_000), 0); // 500 tokens

  const depositTx = await program.methods
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
  console.log('   ✅ Deposited 500 USDBagel');
  console.log('   TX:', depositTx);

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: Add Employee
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 6: Add Employee');
  console.log('─'.repeat(60));

  const employeeIndex = 0;
  const [employeePDA] = PublicKey.findProgramAddressSync(
    [EMPLOYEE_SEED, businessPDA.toBuffer(), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(employeeIndex)]).buffer))],
    PAYROLL_PROGRAM_ID
  );
  console.log('   Employee PDA:', employeePDA.toBase58());
  console.log('   Employee Index:', employeeIndex);

  // Encrypted employee ID
  const employeeIdHash = createHash('sha256').update(EMPLOYEE_WALLET.toBuffer()).digest();

  // Salary rate (for demo: 1 token/second)
  const salaryRate = Buffer.alloc(32);
  salaryRate.writeBigUInt64LE(BigInt(1_000_000_000), 0);

  const addEmpTx = await program.methods
    .addEmployee(Buffer.from(employeeIdHash), Buffer.from(salaryRate))
    .accounts({
      owner: owner.publicKey,
      business: businessPDA,
      employee: employeePDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log('   ✅ Employee added');
  console.log('   TX:', addEmpTx);

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: Create Employee Token Account
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 7: Create Employee Token Account');
  console.log('─'.repeat(60));

  // For testing, we create a test employee signer
  const employeeSigner = Keypair.generate();
  console.log('   Employee Signer:', employeeSigner.publicKey.toBase58());

  // Fund employee signer
  const fundEmpTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: owner.publicKey,
      toPubkey: employeeSigner.publicKey,
      lamports: 0.02e9,
    })
  );
  await sendAndConfirmTransaction(connection, fundEmpTx, [owner]);

  // Create employee token account
  const employeeTokenAccount = Keypair.generate();
  console.log('   Token Account:', employeeTokenAccount.publicKey.toBase58());

  const initEmpTokenIx = new TransactionInstruction({
    programId: INCO_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: employeeTokenAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
      { pubkey: employeeSigner.publicKey, isSigner: false, isWritable: false },
      { pubkey: owner.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
    ],
    data: INIT_ACCOUNT_DISCRIMINATOR,
  });
  await sendAndConfirmTransaction(connection, new Transaction().add(initEmpTokenIx), [owner, employeeTokenAccount]);
  console.log('   ✅ Employee token account created');

  // ═══════════════════════════════════════════════════════════════
  // STEP 8: Simple Withdraw (Employee Claims Salary)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 8: Employee Withdraws 50 USDBagel (Simple Withdraw)');
  console.log('─'.repeat(60));

  // Withdrawal amount (50 tokens)
  const withdrawAmount = Buffer.alloc(32);
  withdrawAmount.writeBigUInt64LE(BigInt(50_000_000_000), 0);

  try {
    const withdrawTx = await program.methods
      .simpleWithdraw(Buffer.from(withdrawAmount))
      .accounts({
        employeeSigner: employeeSigner.publicKey,
        business: businessPDA,
        vault: vaultPDA,
        employee: employeePDA,
        vaultTokenAccount: vaultTokenAccount.publicKey,
        employeeTokenAccount: employeeTokenAccount.publicKey,
        incoTokenProgram: INCO_TOKEN_PROGRAM_ID,
        incoLightningProgram: INCO_LIGHTNING_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employeeSigner])
      .rpc();

    console.log('   ✅ WITHDRAWAL SUCCESSFUL!');
    console.log('   TX:', withdrawTx);
    console.log('   Amount: 50 USDBagel');
    console.log('   To:', employeeTokenAccount.publicKey.toBase58());
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    if (err.logs) {
      console.log('   Logs:');
      err.logs.slice(-10).forEach((log: string) => console.log('      ', log));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 COMPLETE FLOW TEST FINISHED');
  console.log('═'.repeat(60));
  console.log('\n📊 Summary:');
  console.log('   Business:', businessPDA.toBase58());
  console.log('   Vault:', vaultPDA.toBase58());
  console.log('   Vault Token:', vaultTokenAccount.publicKey.toBase58());
  console.log('   Employee PDA:', employeePDA.toBase58());
  console.log('   Employee Token:', employeeTokenAccount.publicKey.toBase58());
  console.log('\n🔗 Explorer Links:');
  console.log('   Business:', `https://orbmarkets.io/account/${businessPDA.toBase58()}?cluster=devnet`);
  console.log('   Vault:', `https://orbmarkets.io/account/${vaultPDA.toBase58()}?cluster=devnet`);
  console.log('   Employee:', `https://orbmarkets.io/account/${employeePDA.toBase58()}?cluster=devnet`);
}

main().catch(console.error);
