#!/usr/bin/env npx ts-node
/**
 * Test Payroll Program on Devnet
 * Uses the gasless mint authority account from env
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN, Idl } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

// Program IDs
const PAYROLL_PROGRAM_ID = new PublicKey('J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2');
const INCO_TOKEN_PROGRAM_ID = new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N');
const USDBAGEL_MINT = new PublicKey('GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt');

// Seeds
const BUSINESS_SEED = Buffer.from('business');
const VAULT_SEED = Buffer.from('vault');
const EMPLOYEE_SEED = Buffer.from('employee');

// Helius RPC
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af';

function loadKeypair(keypairPath: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function loadMintAuthority(): Keypair {
  // Load from env (base64 encoded)
  const envPath = path.join(__dirname, '../app/.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/MINT_AUTHORITY_KEYPAIR=(.+)/);
  if (!match) throw new Error('MINT_AUTHORITY_KEYPAIR not found in env');

  const secretKeyBase64 = match[1].trim();
  const secretKey = Buffer.from(secretKeyBase64, 'base64');
  return Keypair.fromSecretKey(secretKey);
}

function deriveBusinessPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BUSINESS_SEED, owner.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
}

function deriveVaultPDA(business: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, business.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
}

function deriveEmployeePDA(business: PublicKey, employeeIndex: number): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(BigInt(employeeIndex));
  return PublicKey.findProgramAddressSync(
    [EMPLOYEE_SEED, business.toBuffer(), indexBuffer],
    PAYROLL_PROGRAM_ID
  );
}

async function main() {
  console.log('🥯 Testing Payroll Program on Devnet\n');
  console.log('Program ID:', PAYROLL_PROGRAM_ID.toBase58());
  console.log('Inco Token Program:', INCO_TOKEN_PROGRAM_ID.toBase58());
  console.log('USDBAGEL Mint:', USDBAGEL_MINT.toBase58());
  console.log();

  // Setup connection
  const connection = new Connection(RPC_URL, 'confirmed');

  // Load payer (default Solana keypair)
  const payer = loadKeypair(path.join(process.env.HOME!, '.config/solana/id.json'));
  console.log('Payer:', payer.publicKey.toBase58());

  // Load mint authority (gasless minting account)
  const mintAuthority = loadMintAuthority();
  console.log('Mint Authority:', mintAuthority.publicKey.toBase58());

  // Check balances
  const payerBalance = await connection.getBalance(payer.publicKey);
  console.log('Payer Balance:', payerBalance / 1e9, 'SOL\n');

  // Derive PDAs
  const [businessPDA, businessBump] = deriveBusinessPDA(payer.publicKey);
  const [vaultPDA, vaultBump] = deriveVaultPDA(businessPDA);

  console.log('Business PDA:', businessPDA.toBase58());
  console.log('Vault PDA:', vaultPDA.toBase58());
  console.log();

  // Load IDL
  const idlPath = path.join(__dirname, '../target/idl/payroll.json');
  if (!fs.existsSync(idlPath)) {
    console.log('❌ IDL not found. Running anchor build to generate...');
    const { execSync } = require('child_process');
    execSync('anchor build -p payroll', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  }

  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8')) as Idl;

  // Create provider and program
  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, provider);

  // =========================================================================
  // TEST 1: Register Business
  // =========================================================================
  console.log('📝 TEST 1: Register Business');

  try {
    // Check if already exists
    const existingBusiness = await connection.getAccountInfo(businessPDA);
    if (existingBusiness) {
      console.log('   Business already exists, skipping...');
    } else {
      const tx = await program.methods
        .registerBusiness()
        .accounts({
          owner: payer.publicKey,
          business: businessPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('   ✅ Business registered');
      console.log('   TX:', tx);
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // =========================================================================
  // TEST 2: Initialize Vault
  // =========================================================================
  console.log('\n📝 TEST 2: Initialize Vault');

  // For now, use a placeholder vault token account
  // In production, this would be created via Inco Token Program
  const vaultTokenAccount = Keypair.generate();
  console.log('   Vault Token Account (placeholder):', vaultTokenAccount.publicKey.toBase58());

  try {
    const existingVault = await connection.getAccountInfo(vaultPDA);
    if (existingVault) {
      console.log('   Vault already exists, skipping...');
    } else {
      const tx = await program.methods
        .initVault(USDBAGEL_MINT, vaultTokenAccount.publicKey)
        .accounts({
          owner: payer.publicKey,
          business: businessPDA,
          vault: vaultPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('   ✅ Vault initialized');
      console.log('   TX:', tx);
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // =========================================================================
  // TEST 3: Add Employee
  // =========================================================================
  console.log('\n📝 TEST 3: Add Employee');

  // Derive employee PDA (index 0)
  const [employeePDA] = deriveEmployeePDA(businessPDA, 0);
  console.log('   Employee PDA:', employeePDA.toBase58());

  // Encrypted employee ID (mock - just a hash of a pubkey)
  const employeeWallet = Keypair.generate();
  const encryptedEmployeeId = Buffer.alloc(32);
  employeeWallet.publicKey.toBuffer().copy(encryptedEmployeeId);

  // Encrypted salary rate (mock - 1000 tokens per second as encrypted)
  const encryptedSalaryRate = Buffer.alloc(32);
  encryptedSalaryRate.writeUInt32LE(1000, 0);

  try {
    const existingEmployee = await connection.getAccountInfo(employeePDA);
    if (existingEmployee) {
      console.log('   Employee already exists, skipping...');
    } else {
      const tx = await program.methods
        .addEmployee(
          Buffer.from(encryptedEmployeeId),
          Buffer.from(encryptedSalaryRate)
        )
        .accounts({
          owner: payer.publicKey,
          business: businessPDA,
          employee: employeePDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('   ✅ Employee added');
      console.log('   TX:', tx);
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // =========================================================================
  // TEST 4: Read Account States
  // =========================================================================
  console.log('\n📝 TEST 4: Read Account States');

  try {
    const businessInfo = await connection.getAccountInfo(businessPDA);
    if (businessInfo) {
      console.log('   Business Account:');
      console.log('     Size:', businessInfo.data.length, 'bytes');
      console.log('     Lamports:', businessInfo.lamports);
      // Parse manually - skip 8-byte discriminator
      const data = businessInfo.data.slice(8);
      const owner = new PublicKey(data.slice(0, 32));
      const vault = new PublicKey(data.slice(32, 64));
      const nextEmployeeIndex = data.readBigUInt64LE(64);
      console.log('     Owner:', owner.toBase58());
      console.log('     Vault:', vault.toBase58());
      console.log('     Next Employee Index:', nextEmployeeIndex.toString());
    }
  } catch (err: any) {
    console.log('   ❌ Error reading business:', err.message);
  }

  try {
    const vaultInfo = await connection.getAccountInfo(vaultPDA);
    if (vaultInfo) {
      console.log('   Vault Account:');
      console.log('     Size:', vaultInfo.data.length, 'bytes');
      console.log('     Lamports:', vaultInfo.lamports);
    }
  } catch (err: any) {
    console.log('   ❌ Error reading vault:', err.message);
  }

  try {
    const employeeInfo = await connection.getAccountInfo(employeePDA);
    if (employeeInfo) {
      console.log('   Employee Account:');
      console.log('     Size:', employeeInfo.data.length, 'bytes');
      console.log('     Lamports:', employeeInfo.lamports);
    }
  } catch (err: any) {
    console.log('   ❌ Error reading employee:', err.message);
  }

  // =========================================================================
  // TEST 5: Delegate to TEE (MagicBlock)
  // =========================================================================
  console.log('\n📝 TEST 5: Delegate Employee to MagicBlock TEE');

  const MAGICBLOCK_DELEGATION = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh');
  const TEE_VALIDATOR = new PublicKey('FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA');

  try {
    const tx = await program.methods
      .delegateToTee()
      .accounts({
        payer: payer.publicKey,
        business: businessPDA,
        employee: employeePDA,
        validator: TEE_VALIDATOR,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('   ✅ Delegated to TEE');
    console.log('   TX:', tx);
  } catch (err: any) {
    if (err.message.includes('AlreadyDelegated')) {
      console.log('   Employee already delegated, skipping...');
    } else {
      console.log('   ❌ Error:', err.message);
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🥯 PAYROLL PROGRAM TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nAddresses:');
  console.log('  Program:', PAYROLL_PROGRAM_ID.toBase58());
  console.log('  Business:', businessPDA.toBase58());
  console.log('  Vault:', vaultPDA.toBase58());
  console.log('  Employee[0]:', employeePDA.toBase58());
  console.log('\nExplorer Links:');
  console.log('  Business:', `https://orbmarkets.io/account/${businessPDA.toBase58()}?cluster=devnet`);
  console.log('  Vault:', `https://orbmarkets.io/account/${vaultPDA.toBase58()}?cluster=devnet`);
}

main().catch(console.error);
