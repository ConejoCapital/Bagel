#!/usr/bin/env node
/**
 * Initialize New Bagel Master Vault
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// New program ID (deployed with confidential tokens enabled by default)
const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');
const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
const MASTER_VAULT_SEED = Buffer.from('master_vault');

// initialize_vault discriminator from IDL
const INIT_VAULT_DISCRIMINATOR = Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]);

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
  console.log('Initializing New Bagel Master Vault\n');

  const RPC_URL = process.env.HELIUS_RPC || 'https://api.devnet.solana.com';
  const connection = new Connection(RPC_URL, 'confirmed');
  const authority = loadAuthority();

  console.log(`Program: ${BAGEL_PROGRAM_ID.toBase58()}`);
  console.log(`Authority: ${authority.publicKey.toBase58()}`);

  const balance = await connection.getBalance(authority.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);

  const [masterVault, bump] = deriveMasterVaultPDA();
  console.log(`Master Vault PDA: ${masterVault.toBase58()}`);
  console.log(`Bump: ${bump}\n`);

  // Check if vault already exists
  const existing = await connection.getAccountInfo(masterVault);
  if (existing) {
    console.log('Master vault already initialized!');
    return;
  }

  // Build initialize_vault instruction
  const instruction = new TransactionInstruction({
    programId: BAGEL_PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: masterVault, isSigner: false, isWritable: true },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INIT_VAULT_DISCRIMINATOR,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authority.publicKey;
  transaction.sign(authority);

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
  console.log(`Explorer: https://orbmarkets.io/tx/${tx}?cluster=devnet`);
  console.log(`\nMaster Vault: ${masterVault.toBase58()}`);
}

main().catch(console.error);
