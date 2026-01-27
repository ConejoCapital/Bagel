#!/usr/bin/env node
/**
 * Simple wallet access test - Transfer 0.01 SOL on devnet
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const HELIUS_RPC = 'https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af';
const EXPECTED_WALLET = '7vgweKTb4UHkReQ1FBTLc54XP6BqiPRXayqhcAJUcTvV';
const RECIPIENT = '9hbjYLSqtxVgPHbQMnQHHbDgHXaaJ7wF6133UhTdKc9F';
const AMOUNT = 0.01; // SOL

// Load wallet
const keyPath = path.join(process.env.HOME, '.config/solana/id.json');
const secretKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const authority = Keypair.fromSecretKey(Uint8Array.from(secretKey));
const walletAddress = authority.publicKey.toBase58();

console.log('\n🔐 Wallet Access Test');
console.log('═══════════════════════════════════════════\n');
console.log('Wallet Address:', walletAddress);

if (walletAddress !== EXPECTED_WALLET) {
  console.log('⚠️  Warning: Wallet address does not match expected');
  console.log('   Expected:', EXPECTED_WALLET);
  console.log('   Actual:  ', walletAddress);
} else {
  console.log('✅ Wallet address verified\n');
}

// Check balance
const connection = new Connection(HELIUS_RPC, 'confirmed');
const balance = await connection.getBalance(authority.publicKey);
const balanceSOL = balance / LAMPORTS_PER_SOL;
console.log('Balance:', balanceSOL, 'SOL');

if (balance < AMOUNT * LAMPORTS_PER_SOL + 0.001 * LAMPORTS_PER_SOL) {
  console.log('❌ Insufficient balance');
  process.exit(1);
}

// Transfer
console.log('\n📤 Transferring', AMOUNT, 'SOL to', RECIPIENT);
console.log('   Network: devnet\n');

const recipient = new PublicKey(RECIPIENT);
const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: authority.publicKey,
    toPubkey: recipient,
    lamports: AMOUNT * LAMPORTS_PER_SOL,
  })
);

console.log('Sending transaction...');
const sig = await sendAndConfirmTransaction(connection, tx, [authority], {
  commitment: 'confirmed'
});

console.log('\n✅ Transfer successful!');
console.log('Signature:', sig);
console.log('Explorer: https://explorer.solana.com/tx/' + sig + '?cluster=devnet');

// Verify
await new Promise(resolve => setTimeout(resolve, 2000));
const recipientBalance = await connection.getBalance(recipient);
console.log('\nRecipient balance:', recipientBalance / LAMPORTS_PER_SOL, 'SOL');
console.log('\n🎉 Wallet access verified!\n');
