#!/usr/bin/env node
/**
 * Initialize Vault Token Account for the new Bagel deployment
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');
const INCO_TOKEN_PROGRAM_ID = new PublicKey('HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22');
const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
const USDBAGEL_MINT = new PublicKey('8rQ7zU5iJ8o6prw4UGUq7fVNhQaw489rdtkaK5Gh8qsV');
const MASTER_VAULT_SEED = Buffer.from('master_vault');

// initialize_account discriminator
const INIT_ACCOUNT_DISCRIMINATOR = (() => {
  const hash = createHash('sha256').update('global:initialize_account').digest();
  return hash.slice(0, 8);
})();

function loadAuthority() {
  const keyPath = path.join(process.env.HOME, '.config/solana/id.json');
  if (!fs.existsSync(keyPath)) {
    throw new Error('Solana keypair not found.');
  }
  const secretKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function deriveMasterVaultPDA() {
  return PublicKey.findProgramAddressSync([MASTER_VAULT_SEED], BAGEL_PROGRAM_ID);
}

async function main() {
  console.log('Initializing Vault Token Account\n');

  const RPC_URL = process.env.HELIUS_RPC || 'https://api.devnet.solana.com';
  const connection = new Connection(RPC_URL, 'confirmed');
  const authority = loadAuthority();

  const [masterVault] = deriveMasterVaultPDA();
  console.log(`Master Vault: ${masterVault.toBase58()}`);
  console.log(`Authority: ${authority.publicKey.toBase58()}`);

  // Generate a new keypair for the vault token account
  const vaultTokenAccount = Keypair.generate();
  console.log(`Vault Token Account: ${vaultTokenAccount.publicKey.toBase58()}\n`);

  // Build initialize_account instruction
  // Owner is the master vault PDA (so Bagel program can transfer from it)
  const instruction = new TransactionInstruction({
    programId: INCO_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: vaultTokenAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
      { pubkey: masterVault, isSigner: false, isWritable: false }, // owner = master vault
      { pubkey: authority.publicKey, isSigner: true, isWritable: true }, // payer
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
    ],
    data: INIT_ACCOUNT_DISCRIMINATOR,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authority.publicKey;
  transaction.sign(authority, vaultTokenAccount);

  console.log('Sending transaction...');

  const tx = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  await connection.confirmTransaction({
    signature: tx,
    blockhash,
    lastValidBlockHeight,
  }, 'confirmed');

  console.log(`\nSuccess! Transaction: ${tx}`);
  console.log(`Explorer: https://solscan.io/tx/${tx}?cluster=devnet`);
  console.log(`\nVault Token Account: ${vaultTokenAccount.publicKey.toBase58()}`);
  console.log('\nAdd this to .confidential-token-config:');
  console.log(`VAULT_TOKEN_ACCOUNT=${vaultTokenAccount.publicKey.toBase58()}`);
}

main().catch(console.error);
