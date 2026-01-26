#!/usr/bin/env node
/**
 * Initialize USDBagel Confidential Mint
 * 
 * This script creates a confidential token mint for USDBagel using the
 * Inco Confidential Token program.
 */

import anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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

// Get Inco program IDL path (from cloned repo)
function getIncoProgramIdl() {
  const incoRepoDir = '/tmp/inco-confidential-token';
  const idlPath = path.join(incoRepoDir, 'target/idl/inco_token.json');
  
  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL not found at ${idlPath}. Make sure deploy-confidential-mint.sh was run successfully.`);
  }
  
  return JSON.parse(fs.readFileSync(idlPath, 'utf8'));
}

async function main() {
  console.log('🔒 Initializing USDBagel Confidential Mint\n');
  
  // Load configuration
  const config = loadConfig();
  const INCO_TOKEN_PROGRAM_ID = new PublicKey(config.INCO_TOKEN_PROGRAM_ID);
  const RPC_URL = process.env.HELIUS_RPC || 'https://api.devnet.solana.com';
  
  console.log(`   Program ID: ${INCO_TOKEN_PROGRAM_ID.toBase58()}`);
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
  
  // Generate mint keypair
  const mintKeypair = Keypair.generate();
  console.log(`   Mint Address: ${mintKeypair.publicKey.toBase58()}`);
  
  // Try to load IDL from cloned repo
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
  } else {
    console.log(`   ⚠️  IDL not found at ${idlPath}`);
    console.log('   Make sure deploy-confidential-mint.sh was run successfully.\n');
  }
  
  if (!idl) {
    throw new Error('IDL not found. Cannot initialize mint.');
  }
  
  const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
  
  // Build instruction manually using IDL structure
  try {
    console.log('   Initializing mint via raw instruction...\n');
    
    // Get discriminator for initialize_mint
    const initMintIx = idl.instructions.find(ix => ix.name === 'initialize_mint');
    if (!initMintIx) {
      throw new Error('initialize_mint instruction not found in IDL');
    }
    
    const discriminator = Buffer.from(initMintIx.discriminator);
    
    // Build instruction data: discriminator + decimals (u8) + mint_authority (pubkey) + freeze_authority (option<pubkey>)
    const decimals = Buffer.alloc(1);
    decimals.writeUInt8(9, 0);
    
    const mintAuthority = authority.publicKey.toBuffer();
    const freezeAuthority = Buffer.alloc(1); // Option: 0 = None
    freezeAuthority.writeUInt8(0, 0);
    
    const instructionData = Buffer.concat([
      discriminator,
      decimals,
      mintAuthority,
      freezeAuthority
    ]);
    
    // Build transaction
    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: INCO_TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: authority.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      })
    );
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;
    
    transaction.sign(mintKeypair, authority);
    
    const tx = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    await connection.confirmTransaction({
      signature: tx,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    console.log(`✅ Mint initialized successfully!`);
    console.log(`   Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
    
    // Verify mint was created
    await sleep(2000);
    const mintInfo = await connection.getAccountInfo(mintKeypair.publicKey);
    if (mintInfo) {
      console.log('✅ Verification: Mint account exists on-chain\n');
    } else {
      console.log('⚠️  Warning: Mint account not found after initialization\n');
    }
  } catch (error) {
    console.error(`❌ Error initializing mint: ${error.message}`);
    console.error(`   Full error: ${error}\n`);
    throw error;
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Save mint address to config
  const configPath = '.confidential-token-config';
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Remove existing USDBAGEL_MINT if present
  configContent = configContent.split('\n').filter(line => !line.startsWith('USDBAGEL_MINT=')).join('\n');
  
  // Add new mint address
  const updatedConfig = configContent + `\nUSDBAGEL_MINT=${mintKeypair.publicKey.toBase58()}\n`;
  fs.writeFileSync(configPath, updatedConfig);
  
  console.log(`✅ Mint address saved to config: ${mintKeypair.publicKey.toBase58()}`);
  console.log(`\n📝 Next: Initialize token accounts with: node scripts/initialize-confidential-accounts.mjs\n`);
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

main().catch(console.error);
