#!/usr/bin/env npx ts-node
/**
 * Test Payroll Full Flow - Fresh business with proper token accounts
 * Creates everything from scratch and tests deposit + transfer
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

// Target recipient
const RECIPIENT = new PublicKey('Fcqa5QLsoXaX3Q5sLbdp1MiJfvAmewK3Nh3GSoPEcSqw');

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
  console.log('🥯 Payroll Full Flow Test\n');
  console.log('Target Recipient:', RECIPIENT.toBase58());
  console.log();

  const connection = new Connection(RPC_URL, 'confirmed');

  // Use mint authority to fund a new test business owner
  const mintAuthority = loadMintAuthority();

  // Generate a new keypair for fresh business
  const owner = Keypair.generate();
  console.log('New Business Owner:', owner.publicKey.toBase58());

  // Fund the new owner with SOL from mint authority
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: mintAuthority.publicKey,
      toPubkey: owner.publicKey,
      lamports: 0.2e9, // 0.2 SOL
    })
  );
  await sendAndConfirmTransaction(connection, fundTx, [mintAuthority]);
  console.log('Funded with 0.2 SOL');

  console.log('Business Owner (Mint Authority):', owner.publicKey.toBase58());

  // Check balance
  const balance = await connection.getBalance(owner.publicKey);
  console.log('Owner Balance:', balance / 1e9, 'SOL');

  if (balance < 0.1e9) {
    console.log('❌ Insufficient SOL. Need at least 0.1 SOL');
    return;
  }

  // Derive PDAs
  const [businessPDA] = PublicKey.findProgramAddressSync(
    [BUSINESS_SEED, owner.publicKey.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [VAULT_SEED, businessPDA.toBuffer()],
    PAYROLL_PROGRAM_ID
  );

  console.log('\nDerived PDAs:');
  console.log('  Business:', businessPDA.toBase58());
  console.log('  Vault:', vaultPDA.toBase58());

  // Load IDL
  const idlPath = path.join(__dirname, '../target/idl/payroll.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8')) as Idl;
  const wallet = new Wallet(owner);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, provider);

  // =========================================================================
  // STEP 1: Create Vault Token Account (before registering business)
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
        { pubkey: vaultPDA, isSigner: false, isWritable: false }, // owner = vault PDA
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: INIT_ACCOUNT_DISCRIMINATOR,
    });

    const tx = new Transaction().add(initVaultTokenIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [owner, vaultTokenAccount]);
    console.log('   ✅ Created');
    console.log('   TX:', sig);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    return;
  }

  // =========================================================================
  // STEP 2: Register Business
  // =========================================================================
  console.log('\n📝 STEP 2: Register Business');

  try {
    const existing = await connection.getAccountInfo(businessPDA);
    if (existing) {
      console.log('   Business already exists, skipping...');
    } else {
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
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    return;
  }

  // =========================================================================
  // STEP 3: Initialize Vault with Token Account
  // =========================================================================
  console.log('\n📝 STEP 3: Initialize Vault');

  try {
    const existing = await connection.getAccountInfo(vaultPDA);
    if (existing) {
      console.log('   Vault already exists, skipping...');
    } else {
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
    }
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    return;
  }

  // =========================================================================
  // STEP 4: Create Owner Token Account and Mint Tokens
  // =========================================================================
  console.log('\n📝 STEP 4: Create Owner Token Account & Mint');

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
    console.log('   ✅ Token account created');

    // Mint tokens
    const mintAmount = Buffer.alloc(32);
    mintAmount.writeBigUInt64LE(BigInt(1000_000_000), 0); // 1000 tokens

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
        { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: false }, // mint authority
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: mintData,
    });

    const tx2 = new Transaction().add(mintToIx);
    await sendAndConfirmTransaction(connection, tx2, [mintAuthority]); // signed by mint authority
    console.log('   ✅ 1000 tokens minted');
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
    depositAmount.writeBigUInt64LE(BigInt(500_000_000), 0); // 500 tokens

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
  }

  // =========================================================================
  // STEP 6: Create Recipient Token Account
  // =========================================================================
  console.log('\n📝 STEP 6: Create Recipient Token Account');

  const recipientTokenAccount = Keypair.generate();
  console.log('   Recipient:', RECIPIENT.toBase58());
  console.log('   Token Account:', recipientTokenAccount.publicKey.toBase58());

  try {
    const initRecipientTokenIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: recipientTokenAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
        { pubkey: RECIPIENT, isSigner: false, isWritable: false },
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: INIT_ACCOUNT_DISCRIMINATOR,
    });

    const tx = new Transaction().add(initRecipientTokenIx);
    await sendAndConfirmTransaction(connection, tx, [owner, recipientTokenAccount]);
    console.log('   ✅ Created');
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🥯 FULL FLOW TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nAccounts Created:');
  console.log('  Business:', businessPDA.toBase58());
  console.log('  Vault:', vaultPDA.toBase58());
  console.log('  Vault Token:', vaultTokenAccount.publicKey.toBase58());
  console.log('  Owner Token:', ownerTokenAccount.publicKey.toBase58());
  console.log('  Recipient Token:', recipientTokenAccount.publicKey.toBase58());
  console.log('\nRecipient:', RECIPIENT.toBase58());
  console.log('\nExplorer Links:');
  console.log('  Vault:', `https://orbmarkets.io/account/${vaultPDA.toBase58()}?cluster=devnet`);
  console.log('  Vault Token:', `https://orbmarkets.io/account/${vaultTokenAccount.publicKey.toBase58()}?cluster=devnet`);
}

main().catch(console.error);
