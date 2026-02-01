/**
 * Create Master Vault Inco Token Account
 *
 * This script creates a proper Inco Token account for the master vault
 * and updates the environment variable.
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as fs from 'fs';
import * as os from 'os';

const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');
const INCO_TOKEN_PROGRAM_ID = new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N');
const INCO_LIGHTNING_ENV = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
const USDBAGEL_MINT = new PublicKey('GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt');
const MASTER_VAULT_PDA = new PublicKey('4ohqzLMuadzedDxRbmy1Lppuw57Mi7Fr2151q2m82fEW');

const INIT_ACCOUNT_DISCRIMINATOR = Buffer.from([74, 115, 99, 93, 197, 69, 103, 7]);

async function main() {
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');

  console.log('🏗️  Creating Master Vault Inco Token Account\n');

  // Load authority wallet
  const walletPath = `${os.homedir()}/.config/solana/id.json`;
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log(`Authority: ${authority.publicKey.toBase58()}`);
  console.log(`Master Vault: ${MASTER_VAULT_PDA.toBase58()}\n`);

  // Create a new keypair for the vault's Inco Token account
  const vaultTokenAccount = Keypair.generate();
  console.log(`New Vault Token Account: ${vaultTokenAccount.publicKey.toBase58()}\n`);

  // Build initialize instruction for Inco Token account
  // This follows the same pattern as mint.ts
  // Owner is the mint authority for management purposes

  const initializeIx = new TransactionInstruction({
    programId: INCO_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: vaultTokenAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: false, isWritable: false }, // owner
      { pubkey: authority.publicKey, isSigner: true, isWritable: true }, // payer
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ENV, isSigner: false, isWritable: false },
    ],
    data: INIT_ACCOUNT_DISCRIMINATOR,
  });

  console.log('📝 Building transaction...');
  const tx = new Transaction().add(initializeIx);

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = authority.publicKey;
  tx.sign(authority, vaultTokenAccount);

  console.log('📤 Sending transaction...');
  const sig = await connection.sendRawTransaction(tx.serialize());
  console.log(`Transaction: ${sig}`);

  await connection.confirmTransaction(sig, 'confirmed');
  console.log('✅ Vault token account created!\n');

  console.log('📋 Next Steps:');
  console.log(`1. Update app/.env.local:`);
  console.log(`   NEXT_PUBLIC_VAULT_TOKEN_ACCOUNT=${vaultTokenAccount.publicKey.toBase58()}\n`);
  console.log(`2. Save the vault keypair (optional backup):`);
  console.log(`   echo '[${Array.from(vaultTokenAccount.secretKey)}]' > vault-token-account.json\n`);
  console.log(`3. Restart your dev server to pick up the new env var\n`);

  console.log(`🔗 Explorer: https://orbmarkets.io/address/${vaultTokenAccount.publicKey.toBase58()}?cluster=devnet`);
}

main().catch(console.error);
