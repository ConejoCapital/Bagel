#!/usr/bin/env npx ts-node
/**
 * Test Payroll Transfer - Deposit and Withdrawal
 * Creates proper Inco Token accounts and tests the full flow
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

// Helius RPC
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af';

// Inco Token discriminators
const INIT_ACCOUNT_DISCRIMINATOR = (() => {
  const hash = createHash('sha256').update('global:initialize_account').digest();
  return hash.slice(0, 8);
})();

const TRANSFER_DISCRIMINATOR = (() => {
  const hash = createHash('sha256').update('global:transfer').digest();
  return hash.slice(0, 8);
})();

const MINT_TO_DISCRIMINATOR = (() => {
  const hash = createHash('sha256').update('global:mint_to').digest();
  return hash.slice(0, 8);
})();

function loadKeypair(keypairPath: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

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
  console.log('🥯 Testing Payroll Transfer on Devnet\n');
  console.log('Target Recipient:', RECIPIENT.toBase58());
  console.log();

  const connection = new Connection(RPC_URL, 'confirmed');
  const payer = loadKeypair(path.join(process.env.HOME!, '.config/solana/id.json'));
  const mintAuthority = loadMintAuthority();

  console.log('Payer:', payer.publicKey.toBase58());
  console.log('Mint Authority:', mintAuthority.publicKey.toBase58());

  // Derive PDAs
  const [businessPDA] = PublicKey.findProgramAddressSync(
    [BUSINESS_SEED, payer.publicKey.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
  const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
    [VAULT_SEED, businessPDA.toBuffer()],
    PAYROLL_PROGRAM_ID
  );

  console.log('Business PDA:', businessPDA.toBase58());
  console.log('Vault PDA:', vaultPDA.toBase58());
  console.log();

  // =========================================================================
  // STEP 1: Create Inco Token Account for Vault (if needed)
  // =========================================================================
  console.log('📝 STEP 1: Create Vault Inco Token Account');

  const vaultTokenAccount = Keypair.generate();
  console.log('   New Vault Token Account:', vaultTokenAccount.publicKey.toBase58());

  try {
    const initAccountIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: vaultTokenAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
        { pubkey: vaultPDA, isSigner: false, isWritable: false }, // owner = vault PDA
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: INIT_ACCOUNT_DISCRIMINATOR,
    });

    const tx = new Transaction().add(initAccountIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer, vaultTokenAccount]);
    console.log('   ✅ Vault token account created');
    console.log('   TX:', sig);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // =========================================================================
  // STEP 2: Create Inco Token Account for Recipient
  // =========================================================================
  console.log('\n📝 STEP 2: Create Recipient Inco Token Account');

  const recipientTokenAccount = Keypair.generate();
  console.log('   New Recipient Token Account:', recipientTokenAccount.publicKey.toBase58());

  try {
    const initAccountIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: recipientTokenAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
        { pubkey: RECIPIENT, isSigner: false, isWritable: false }, // owner = recipient
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: INIT_ACCOUNT_DISCRIMINATOR,
    });

    const tx = new Transaction().add(initAccountIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer, recipientTokenAccount]);
    console.log('   ✅ Recipient token account created');
    console.log('   TX:', sig);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // =========================================================================
  // STEP 3: Mint tokens to vault (using mint authority)
  // =========================================================================
  console.log('\n📝 STEP 3: Mint tokens to Vault');

  // Encrypted amount (100 tokens as mock encrypted value)
  const encryptedAmount = Buffer.alloc(32);
  encryptedAmount.writeBigUInt64LE(BigInt(100_000_000), 0); // 100 tokens with 6 decimals

  try {
    const mintData = Buffer.concat([
      MINT_TO_DISCRIMINATOR,
      Buffer.from([32, 0, 0, 0]), // vec length
      encryptedAmount,
      Buffer.from([0, 0, 0, 0]), // security zone
    ]);

    const mintToIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: true },
        { pubkey: vaultTokenAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: mintData,
    });

    const tx = new Transaction().add(mintToIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer, mintAuthority]);
    console.log('   ✅ Tokens minted to vault');
    console.log('   TX:', sig);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
  }

  // =========================================================================
  // STEP 4: Test Payroll Deposit Instruction
  // =========================================================================
  console.log('\n📝 STEP 4: Test Payroll Deposit');

  // Load the IDL and create program
  const idlPath = path.join(__dirname, '../target/idl/payroll.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8')) as Idl;
  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, provider);

  // Create a depositor token account (owned by payer)
  const depositorTokenAccount = Keypair.generate();
  console.log('   Depositor Token Account:', depositorTokenAccount.publicKey.toBase58());

  try {
    // First create depositor token account
    const initDepositorIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: depositorTokenAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
        { pubkey: payer.publicKey, isSigner: false, isWritable: false }, // owner = payer
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: INIT_ACCOUNT_DISCRIMINATOR,
    });

    const tx1 = new Transaction().add(initDepositorIx);
    await sendAndConfirmTransaction(connection, tx1, [payer, depositorTokenAccount]);
    console.log('   ✅ Depositor token account created');

    // Mint tokens to depositor
    const mintAmount = Buffer.alloc(32);
    mintAmount.writeBigUInt64LE(BigInt(200_000_000), 0); // 200 tokens

    const mintData = Buffer.concat([
      MINT_TO_DISCRIMINATOR,
      Buffer.from([32, 0, 0, 0]),
      mintAmount,
      Buffer.from([0, 0, 0, 0]),
    ]);

    const mintToDepositorIx = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: true },
        { pubkey: depositorTokenAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: false },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: mintData,
    });

    const tx2 = new Transaction().add(mintToDepositorIx);
    await sendAndConfirmTransaction(connection, tx2, [payer, mintAuthority]);
    console.log('   ✅ Tokens minted to depositor');

    // Now call payroll deposit
    const depositAmount = Buffer.alloc(32);
    depositAmount.writeBigUInt64LE(BigInt(100_000_000), 0); // 100 tokens

    const depositTx = await program.methods
      .deposit(Buffer.from(depositAmount))
      .accounts({
        owner: payer.publicKey,
        business: businessPDA,
        vault: vaultPDA,
        depositorTokenAccount: depositorTokenAccount.publicKey,
        vaultTokenAccount: vaultTokenAccount.publicKey,
        incoTokenProgram: INCO_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('   ✅ Deposit successful!');
    console.log('   TX:', depositTx);
  } catch (err: any) {
    console.log('   ❌ Error:', err.message);
    if (err.logs) {
      console.log('   Logs:', err.logs.slice(-5).join('\n        '));
    }
  }

  // =========================================================================
  // STEP 5: Verify Token Accounts
  // =========================================================================
  console.log('\n📝 STEP 5: Verify Token Accounts');

  const vaultTokenInfo = await connection.getAccountInfo(vaultTokenAccount.publicKey);
  const recipientTokenInfo = await connection.getAccountInfo(recipientTokenAccount.publicKey);

  console.log('   Vault Token Account:', vaultTokenAccount.publicKey.toBase58());
  console.log('   Vault Token Account exists:', !!vaultTokenInfo);
  console.log('   Vault Token Account size:', vaultTokenInfo?.data.length, 'bytes');
  console.log('   Recipient Token Account:', recipientTokenAccount.publicKey.toBase58());
  console.log('   Recipient Token Account exists:', !!recipientTokenInfo)

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🥯 TRANSFER TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nCreated Accounts:');
  console.log('  Vault Token Account:', vaultTokenAccount.publicKey.toBase58());
  console.log('  Recipient Token Account:', recipientTokenAccount.publicKey.toBase58());
  console.log('\nRecipient:', RECIPIENT.toBase58());
  console.log('\nExplorer:');
  console.log('  Vault Token:', `https://orbmarkets.io/account/${vaultTokenAccount.publicKey.toBase58()}?cluster=devnet`);
  console.log('  Recipient Token:', `https://orbmarkets.io/account/${recipientTokenAccount.publicKey.toBase58()}?cluster=devnet`);
}

main().catch(console.error);
