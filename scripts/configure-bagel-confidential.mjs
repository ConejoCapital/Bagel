#!/usr/bin/env node
/**
 * Configure Bagel Program to Use Confidential Tokens
 * 
 * This script calls the configure_confidential_mint instruction on the Bagel program
 * to enable confidential token transfers.
 */

import anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Load configuration
function loadConfig() {
  const configPath = '.confidential-token-config';
  if (!fs.existsSync(configPath)) {
    throw new Error('Configuration file not found. Run setup scripts first.');
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

// Derive Master Vault PDA
function deriveMasterVaultPDA() {
  const BAGEL_PROGRAM_ID = new PublicKey('J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE');
  const MASTER_VAULT_SEED = Buffer.from('master_vault');
  return PublicKey.findProgramAddressSync([MASTER_VAULT_SEED], BAGEL_PROGRAM_ID);
}

async function main() {
  console.log('⚙️  Configuring Bagel Program for Confidential Tokens\n');
  
  // Load configuration
  const config = loadConfig();
  const USDBAGEL_MINT = config.USDBAGEL_MINT ? new PublicKey(config.USDBAGEL_MINT) : null;
  const RPC_URL = process.env.HELIUS_RPC || 'https://api.devnet.solana.com';
  const BAGEL_PROGRAM_ID = new PublicKey('J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE');
  
  if (!USDBAGEL_MINT) {
    throw new Error('USDBAGEL_MINT not found in config. Run initialize-usdbagel-mint.mjs first.');
  }
  
  console.log(`   Bagel Program: ${BAGEL_PROGRAM_ID.toBase58()}`);
  console.log(`   USDBagel Mint: ${USDBAGEL_MINT.toBase58()}`);
  console.log(`   RPC: ${RPC_URL}\n`);
  
  // Load authority
  const authority = loadAuthority();
  const connection = new Connection(RPC_URL, 'confirmed');
  
  console.log(`   Authority: ${authority.publicKey.toBase58()}`);
  
  // Check balance
  const balance = await connection.getBalance(authority.publicKey);
  console.log(`   Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);
  
  // Derive Master Vault PDA
  const [masterVault, bump] = deriveMasterVaultPDA();
  console.log(`   Master Vault: ${masterVault.toBase58()}`);
  console.log(`   Bump: ${bump}\n`);
  
  // Load Bagel program IDL
  const idlPath = path.join(process.cwd(), 'target/idl/bagel.json');
  if (!fs.existsSync(idlPath)) {
    throw new Error(`Bagel IDL not found at ${idlPath}. Run 'anchor build' first.`);
  }
  
  // Calculate discriminator for configure_confidential_mint
  // Anchor uses: sha256("global:<instruction_name>")[0:8]
  const { createHash } = await import('crypto');
  const hash = createHash('sha256').update('global:configure_confidential_mint').digest().slice(0, 8);
  const discriminator = Buffer.from(hash);
  
  // Build instruction data: discriminator + mint (pubkey, 32 bytes) + enable (bool, 1 byte)
  const mintBuffer = USDBAGEL_MINT.toBuffer();
  const enableBuffer = Buffer.alloc(1);
  enableBuffer.writeUInt8(1, 0); // true = 1
  
  const instructionData = Buffer.concat([
    discriminator,
    mintBuffer,
    enableBuffer
  ]);
  
  try {
    console.log('   Calling configure_confidential_mint instruction...\n');
    
    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: BAGEL_PROGRAM_ID,
        keys: [
          { pubkey: authority.publicKey, isSigner: true, isWritable: true },
          { pubkey: masterVault, isSigner: false, isWritable: true },
        ],
        data: instructionData,
      })
    );
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);
    
    const tx = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    await connection.confirmTransaction({
      signature: tx,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    console.log(`✅ Configuration successful!`);
    console.log(`   Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
    
    // Verify configuration by reading account data directly
    await sleep(2000);
    const vaultAccountInfo = await connection.getAccountInfo(masterVault);
    if (vaultAccountInfo) {
      // Read use_confidential_tokens flag (offset 122 in MasterVault)
      // Structure: discriminator(8) + authority(32) + total_balance(8) + encrypted_business_count(16) + encrypted_employee_count(16) + next_business_index(8) + is_active(1) + bump(1) + confidential_mint(32) + use_confidential_tokens(1)
      // Total: 8+32+8+16+16+8+1+1+32+1 = 123, but account is 154 (with padding)
      const useConfidentialTokens = vaultAccountInfo.data[122] === 1;
      const confidentialMintBytes = vaultAccountInfo.data.slice(90, 122);
      const confidentialMint = new PublicKey(confidentialMintBytes);
      
      if (useConfidentialTokens && confidentialMint.equals(USDBAGEL_MINT)) {
        console.log('✅ Verification: Confidential tokens are enabled');
        console.log(`   Mint: ${confidentialMint.toBase58()}`);
        console.log(`   Enabled: ${useConfidentialTokens}\n`);
      } else {
        console.log('⚠️  Warning: Configuration may not have taken effect');
        console.log(`   Expected mint: ${USDBAGEL_MINT.toBase58()}`);
        console.log(`   Actual mint: ${confidentialMint.toBase58()}`);
        console.log(`   Enabled: ${useConfidentialTokens}\n`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error configuring Bagel program: ${error.message}`);
    console.error(`   Full error: ${error}\n`);
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
