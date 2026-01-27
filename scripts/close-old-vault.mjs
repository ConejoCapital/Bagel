#!/usr/bin/env node
/**
 * Close old MasterVault account using close_vault instruction
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
  console.log('🗑️  Closing old MasterVault account...\n');
  
  const authority = loadAuthority();
  const connection = new Connection(process.env.HELIUS_RPC || 'https://api.devnet.solana.com', 'confirmed');
  const [masterVaultPDA, bump] = deriveMasterVaultPDA();
  
  console.log(`   Authority: ${authority.publicKey.toBase58()}`);
  console.log(`   Vault: ${masterVaultPDA.toBase58()}\n`);
  
  // Check if vault exists
  const vaultInfo = await connection.getAccountInfo(masterVaultPDA);
  if (!vaultInfo) {
    console.log('✅ Vault already closed or doesn\'t exist\n');
    return;
  }
  
  console.log(`   Vault balance: ${vaultInfo.lamports / 1e9} SOL`);
  console.log(`   Vault data size: ${vaultInfo.data.length} bytes\n`);
  
  // Calculate discriminator for close_vault
  const hash = createHash('sha256').update('global:close_vault').digest().slice(0, 8);
  const discriminator = Buffer.from(hash);
  
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: masterVaultPDA, isSigner: false, isWritable: true },
    ],
    data: discriminator,
  });
  
  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authority.publicKey;
  transaction.sign(authority);
  
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
    
    console.log(`✅ Vault closed successfully!`);
    console.log(`   Transaction: https://orbmarkets.io/tx/${tx}?cluster=devnet\n`);
  } catch (error) {
    console.error(`❌ Error closing vault: ${error.message}\n`);
    if (error.message.includes('total_balance == 0')) {
      console.log('   Note: Vault must have zero balance to close.');
      console.log('   You may need to withdraw all funds first.\n');
    }
    throw error;
  }
}

main().catch(console.error);
