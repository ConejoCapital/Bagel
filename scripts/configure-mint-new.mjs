#!/usr/bin/env node
/**
 * Configure Confidential Mint for New Bagel Vault
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// New program ID
const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');
const USDBAGEL_MINT = new PublicKey('8rQ7zU5iJ8o6prw4UGUq7fVNhQaw489rdtkaK5Gh8qsV');
const MASTER_VAULT_SEED = Buffer.from('master_vault');

// configure_confidential_mint discriminator from IDL
const CONFIGURE_MINT_DISCRIMINATOR = Buffer.from([198, 91, 213, 144, 110, 202, 95, 200]);

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
  console.log('Configuring Confidential Mint for Bagel Vault\n');

  const RPC_URL = process.env.HELIUS_RPC || 'https://api.devnet.solana.com';
  const connection = new Connection(RPC_URL, 'confirmed');
  const authority = loadAuthority();

  console.log(`Program: ${BAGEL_PROGRAM_ID.toBase58()}`);
  console.log(`Authority: ${authority.publicKey.toBase58()}`);
  console.log(`USDBagel Mint: ${USDBAGEL_MINT.toBase58()}`);

  const [masterVault, bump] = deriveMasterVaultPDA();
  console.log(`Master Vault PDA: ${masterVault.toBase58()}\n`);

  // Build instruction data: discriminator + mint (32 bytes) + enable (1 byte)
  const instructionData = Buffer.concat([
    CONFIGURE_MINT_DISCRIMINATOR,
    USDBAGEL_MINT.toBuffer(),
    Buffer.from([1])  // enable = true
  ]);

  const instruction = new TransactionInstruction({
    programId: BAGEL_PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: masterVault, isSigner: false, isWritable: true },
    ],
    data: instructionData,
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
  console.log(`Explorer: https://solscan.io/tx/${tx}?cluster=devnet`);

  // Verify by reading vault data
  await new Promise(r => setTimeout(r, 2000));
  const vaultInfo = await connection.getAccountInfo(masterVault);
  if (vaultInfo) {
    // Read use_confidential_tokens and confidential_mint from account
    // Offset for confidential_mint: 8(discrim) + 32(authority) + 8(balance) + 16(enc_biz) + 16(enc_emp) + 8(next_idx) + 1(active) + 1(bump) = 90
    const mintBytes = vaultInfo.data.slice(90, 122);
    const configuredMint = new PublicKey(mintBytes);
    const useConfidential = vaultInfo.data[122] === 1;

    console.log(`\nVerification:`);
    console.log(`  Confidential Mint: ${configuredMint.toBase58()}`);
    console.log(`  Use Confidential: ${useConfidential}`);
  }
}

main().catch(console.error);
