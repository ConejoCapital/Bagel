#!/usr/bin/env node
/**
 * Migrate MasterVault from old structure to new structure
 * 
 * This script calls the migrate_vault instruction to upgrade the vault account
 * to include confidential_mint and use_confidential_tokens fields.
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

const PROGRAM_ID = new PublicKey('J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE');
const MASTER_VAULT_SEED = Buffer.from('master_vault');

function loadAuthority() {
  const keyPath = path.join(process.env.HOME, '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function deriveMasterVaultPDA() {
  return PublicKey.findProgramAddressSync([MASTER_VAULT_SEED], PROGRAM_ID);
}

async function main() {
  console.log('🔄 Migrating MasterVault to new structure...\n');
  
  const authority = loadAuthority();
  const connection = new Connection(process.env.HELIUS_RPC || 'https://api.devnet.solana.com', 'confirmed');
  const [masterVaultPDA, bump] = deriveMasterVaultPDA();
  
  console.log(`   Authority: ${authority.publicKey.toBase58()}`);
  console.log(`   Vault: ${masterVaultPDA.toBase58()}`);
  console.log(`   Bump: ${bump}\n`);
  
  // Check if vault exists
  const vaultInfo = await connection.getAccountInfo(masterVaultPDA);
  if (!vaultInfo) {
    console.log('❌ Vault does not exist. Nothing to migrate.\n');
    return;
  }
  
  console.log(`   Current vault size: ${vaultInfo.data.length} bytes`);
  console.log(`   Expected new size: 154 bytes\n`);
  
  if (vaultInfo.data.length >= 154) {
    console.log('✅ Vault already migrated (has new structure)\n');
    return;
  }
  
  // Calculate discriminator for migrate_vault
  const hash = createHash('sha256').update('global:migrate_vault').digest().slice(0, 8);
  const discriminator = Buffer.from(hash);
  
  console.log('   Building migration instruction...');
  
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: masterVaultPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });
  
  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authority.publicKey;
  transaction.sign(authority);
  
  console.log('   Sending migration transaction...\n');
  
  try {
    const tx = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    await connection.confirmTransaction({
      signature: tx,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    console.log(`✅ Vault migrated successfully!`);
    console.log(`   Transaction: https://orbmarkets.io/tx/${tx}?cluster=devnet\n`);
    
    // Verify migration
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newVaultInfo = await connection.getAccountInfo(masterVaultPDA);
    if (newVaultInfo && newVaultInfo.data.length >= 154) {
      console.log(`✅ Verification: Vault now has ${newVaultInfo.data.length} bytes (new structure)\n`);
    } else {
      console.log(`⚠️  Warning: Vault size is ${newVaultInfo?.data.length || 0} bytes (expected >= 154)\n`);
    }
  } catch (error) {
    console.error(`❌ Error migrating vault: ${error.message}\n`);
    throw error;
  }
}

main().catch(console.error);
