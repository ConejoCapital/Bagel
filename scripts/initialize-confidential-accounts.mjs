#!/usr/bin/env node
/**
 * Initialize Confidential Token Accounts
 * 
 * This script initializes confidential token accounts for:
 * - Depositor (employer)
 * - Master Vault
 * - Employee
 * 
 * It also mints initial USDBagel tokens to the depositor account.
 */

import anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// Load configuration
function loadConfig() {
  const configPath = '.confidential-token-config';
  if (!fs.existsSync(configPath)) {
    throw new Error('Configuration file not found. Run deploy-confidential-mint.sh first.');
  }
  
  const config = {};
  const content = fs.readFileSync(configPath, 'utf8');
  for (const line of content.split('\n')) {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      config[key.trim()] = value.trim();
    }
  }
  
  return config;
}

// Load authority keypair
function loadAuthority() {
  const keyPath = path.join(process.env.HOME, '.config/solana/id.json');
  if (!fs.existsSync(keyPath)) {
    throw new Error('Solana keypair not found. Please configure Solana CLI.');
  }
  const secretKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

// Encrypt value for Inco (mock - in production use Inco SDK)
function encryptForInco(value) {
  const buffer = Buffer.alloc(16);
  buffer.writeBigUInt64LE(BigInt(value), 0);
  const hash = createHash('sha256').update(buffer).update(Date.now().toString()).digest();
  hash.copy(buffer, 8, 0, 8);
  return buffer;
}

// Derive Master Vault PDA
function deriveMasterVaultPDA() {
  const BAGEL_PROGRAM_ID = new PublicKey('J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE');
  const MASTER_VAULT_SEED = Buffer.from('master_vault');
  return PublicKey.findProgramAddressSync([MASTER_VAULT_SEED], BAGEL_PROGRAM_ID);
}

async function main() {
  console.log('🔒 Initializing Confidential Token Accounts\n');
  
  // Load configuration
  const config = loadConfig();
  const INCO_TOKEN_PROGRAM_ID = new PublicKey(config.INCO_TOKEN_PROGRAM_ID);
  const USDBAGEL_MINT = config.USDBAGEL_MINT ? new PublicKey(config.USDBAGEL_MINT) : null;
  const RPC_URL = process.env.HELIUS_RPC || 'https://api.devnet.solana.com';
  
  if (!USDBAGEL_MINT) {
    throw new Error('USDBAGEL_MINT not found in config. Run initialize-usdbagel-mint.mjs first.');
  }
  
  console.log(`   Program ID: ${INCO_TOKEN_PROGRAM_ID.toBase58()}`);
  console.log(`   Mint: ${USDBAGEL_MINT.toBase58()}`);
  console.log(`   RPC: ${RPC_URL}\n`);
  
  // Load authority
  const authority = loadAuthority();
  const connection = new Connection(RPC_URL, 'confirmed');
  
  console.log(`   Authority: ${authority.publicKey.toBase58()}`);
  
  // Check balance
  const balance = await connection.getBalance(authority.publicKey);
  console.log(`   Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log('⚠️  Low balance. Requesting airdrop...');
    const airdropSig = await connection.requestAirdrop(authority.publicKey, 1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig, 'confirmed');
    console.log('✅ Airdrop received\n');
  }
  
  // Generate token account keypairs
  const depositorTokenAccount = Keypair.generate();
  const [masterVault] = deriveMasterVaultPDA();
  const vaultTokenAccount = Keypair.generate();
  const employeeKeypair = Keypair.generate();
  const employeeTokenAccount = Keypair.generate();
  
  console.log('   Token Accounts:');
  console.log(`   - Depositor: ${depositorTokenAccount.publicKey.toBase58()}`);
  console.log(`   - Vault: ${vaultTokenAccount.publicKey.toBase58()}`);
  console.log(`   - Employee: ${employeeTokenAccount.publicKey.toBase58()}\n`);
  
  // Try to load IDL
  const incoRepoDir = '/tmp/inco-confidential-token';
  const idlPath = path.join(incoRepoDir, 'target/idl/inco_token.json');
  
  let idl = null;
  if (fs.existsSync(idlPath)) {
    try {
      idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
      console.log('   ✅ IDL loaded from repository\n');
    } catch (error) {
      console.log(`   ⚠️  Could not load IDL: ${error.message}\n`);
    }
  }
  
  if (!idl) {
    throw new Error('IDL not found. Cannot initialize accounts.');
  }
  
  const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
  
  // Get discriminators from IDL
  const initAccountIx = idl.instructions.find(ix => ix.name === 'initialize_account');
  const mintToIx = idl.instructions.find(ix => ix.name === 'mint_to');
  
  if (!initAccountIx || !mintToIx) {
    throw new Error('Required instructions not found in IDL');
  }
  
  const initAccountDiscriminator = Buffer.from(initAccountIx.discriminator);
  const mintToDiscriminator = Buffer.from(mintToIx.discriminator);
  
  // Initialize depositor token account
  console.log('   Initializing depositor token account...');
  try {
    const instructionData = Buffer.from(initAccountDiscriminator); // No args for initialize_account
    
    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: INCO_TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: depositorTokenAccount.publicKey, isSigner: true, isWritable: true },
          { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
          { pubkey: authority.publicKey, isSigner: false, isWritable: false }, // owner
          { pubkey: authority.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      })
    );
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(depositorTokenAccount, authority);
    
    const tx1 = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    await connection.confirmTransaction({
      signature: tx1,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    console.log(`   ✅ Depositor account initialized: ${tx1}`);
  } catch (error) {
    console.error(`   ❌ Error initializing depositor account: ${error.message}`);
    throw error;
  }
  
  await sleep(2000);
  
  // Initialize vault token account (owner is master vault PDA)
  console.log('   Initializing vault token account...');
  try {
    const instructionData = Buffer.from(initAccountDiscriminator);
    
    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: INCO_TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: vaultTokenAccount.publicKey, isSigner: true, isWritable: true },
          { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
          { pubkey: masterVault, isSigner: false, isWritable: false }, // owner
          { pubkey: authority.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      })
    );
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(vaultTokenAccount, authority);
    
    const tx2 = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    await connection.confirmTransaction({
      signature: tx2,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    console.log(`   ✅ Vault account initialized: ${tx2}`);
  } catch (error) {
    console.error(`   ❌ Error initializing vault account: ${error.message}`);
    throw error;
  }
  
  await sleep(2000);
  
  // Initialize employee token account
  console.log('   Initializing employee token account...');
  try {
    const instructionData = Buffer.from(initAccountDiscriminator);
    
    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: INCO_TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: employeeTokenAccount.publicKey, isSigner: true, isWritable: true },
          { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
          { pubkey: employeeKeypair.publicKey, isSigner: false, isWritable: false }, // owner
          { pubkey: authority.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      })
    );
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(employeeTokenAccount, authority);
    
    const tx3 = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    await connection.confirmTransaction({
      signature: tx3,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    console.log(`   ✅ Employee account initialized: ${tx3}`);
  } catch (error) {
    console.error(`   ❌ Error initializing employee account: ${error.message}`);
    throw error;
  }
  
  await sleep(2000);
  
  // Mint initial tokens to depositor account
  console.log('\n   Minting initial USDBagel tokens to depositor...');
  const mintAmount = 10000000; // 10 tokens (9 decimals = 10 * 10^9)
  const encryptedMintAmount = encryptForInco(mintAmount);
  
  try {
    // Build instruction data: discriminator + ciphertext (bytes) + input_type (u8)
    // Anchor encodes bytes as: length (u32 LE) + data
    const inputType = Buffer.alloc(1);
    inputType.writeUInt8(0, 0); // 0 = hex-encoded
    
    const lengthPrefix = Buffer.alloc(4);
    lengthPrefix.writeUInt32LE(encryptedMintAmount.length, 0);
    
    const instructionData = Buffer.concat([
      mintToDiscriminator,
      lengthPrefix, // u32 length prefix for bytes
      encryptedMintAmount,
      inputType
    ]);
    
    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: INCO_TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: true },
          { pubkey: depositorTokenAccount.publicKey, isSigner: false, isWritable: true },
          { pubkey: authority.publicKey, isSigner: true, isWritable: true }, // mint_authority
          { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      })
    );
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);
    
    const tx4 = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    await connection.confirmTransaction({
      signature: tx4,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    console.log(`   ✅ Tokens minted: ${tx4}`);
    console.log(`   Amount: ${mintAmount / 1e9} USDBagel (encrypted on-chain)\n`);
  } catch (error) {
    console.error(`   ❌ Error minting tokens: ${error.message}`);
    throw error;
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Save account addresses to config
  const configPath = '.confidential-token-config';
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Remove existing entries if present
  const keysToRemove = ['DEPOSITOR_TOKEN_ACCOUNT', 'VAULT_TOKEN_ACCOUNT', 'EMPLOYEE_TOKEN_ACCOUNT', 'EMPLOYEE_KEYPAIR'];
  configContent = configContent.split('\n').filter(line => {
    return !keysToRemove.some(key => line.startsWith(`${key}=`));
  }).join('\n');
  
  // Add new account addresses
  const newEntries = [
    `DEPOSITOR_TOKEN_ACCOUNT=${depositorTokenAccount.publicKey.toBase58()}`,
    `VAULT_TOKEN_ACCOUNT=${vaultTokenAccount.publicKey.toBase58()}`,
    `EMPLOYEE_TOKEN_ACCOUNT=${employeeTokenAccount.publicKey.toBase58()}`,
    `EMPLOYEE_KEYPAIR=${Buffer.from(employeeKeypair.secretKey).toString('base64')}`,
  ];
  
  const updatedConfig = configContent + '\n' + newEntries.join('\n') + '\n';
  fs.writeFileSync(configPath, updatedConfig);
  
  console.log('✅ All token accounts initialized and tokens minted!');
  console.log('\n📝 Next: Configure Bagel program with: node scripts/configure-bagel-confidential.mjs\n');
}

main().catch(console.error);
