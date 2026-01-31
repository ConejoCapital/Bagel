import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as os from 'os';

const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');
const PAYROLL_PROGRAM_ID = new PublicKey('J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2');
const USDBAGEL_MINT = new PublicKey('GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt');
const INCO_TOKEN_PROGRAM = new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N');

async function main() {
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');

  // Allow wallet address as command-line argument
  let ownerPubkey: PublicKey;
  if (process.argv[2]) {
    ownerPubkey = new PublicKey(process.argv[2]);
    console.log('🔍 Debug Payroll Accounts (Custom Wallet)\n');
  } else {
    // Load wallet from file
    const walletPath = `${os.homedir()}/.config/solana/id.json`;
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const keypairBytes = new Uint8Array(walletData);
    ownerPubkey = new PublicKey(keypairBytes.slice(32, 64));
    console.log('🔍 Debug Payroll Accounts (CLI Wallet)\n');
  }

  console.log(`Wallet: ${ownerPubkey.toBase58()}\n`);

  // 1. Check Bagel PDA
  console.log('1️⃣  Checking Bagel UserToken PDA...');
  const [bagelPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('user_token'), ownerPubkey.toBuffer(), USDBAGEL_MINT.toBuffer()],
    BAGEL_PROGRAM_ID
  );
  console.log(`   PDA: ${bagelPDA.toBase58()}`);

  const bagelAccount = await connection.getAccountInfo(bagelPDA);
  if (!bagelAccount) {
    console.log('   ❌ Bagel PDA not found!');
    return;
  }

  console.log(`   ✅ Account exists, size: ${bagelAccount.data.length} bytes`);
  const bagelOwner = new PublicKey(bagelAccount.data.slice(8, 40));
  const bagelMint = new PublicKey(bagelAccount.data.slice(40, 72));
  const incoTokenAccount = new PublicKey(bagelAccount.data.slice(72, 104));

  console.log(`   Owner: ${bagelOwner.toBase58()}`);
  console.log(`   Mint: ${bagelMint.toBase58()}`);
  console.log(`   Inco Token Account: ${incoTokenAccount.toBase58()}`);

  // Check if inco_token_account is owned by Inco Token Program
  const incoAccount = await connection.getAccountInfo(incoTokenAccount);
  if (!incoAccount) {
    console.log(`   ❌ Inco Token Account doesn't exist!`);
  } else {
    console.log(`   Inco Token Account Owner: ${incoAccount.owner.toBase58()}`);
    if (incoAccount.owner.equals(INCO_TOKEN_PROGRAM)) {
      console.log(`   ✅ Correctly owned by Inco Token Program`);
    } else {
      console.log(`   ❌ WRONG OWNER! Expected: ${INCO_TOKEN_PROGRAM.toBase58()}`);
    }
  }

  console.log('');

  // 2. Check Business PDA
  console.log('2️⃣  Checking Payroll Business PDA...');
  const [businessPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('business'), ownerPubkey.toBuffer()],
    PAYROLL_PROGRAM_ID
  );
  console.log(`   PDA: ${businessPDA.toBase58()}`);

  const businessAccount = await connection.getAccountInfo(businessPDA);
  if (!businessAccount) {
    console.log('   ❌ Business not registered!');
    return;
  }

  console.log(`   ✅ Business exists, size: ${businessAccount.data.length} bytes`);
  const businessOwner = new PublicKey(businessAccount.data.slice(8, 40));
  const businessTokenAccount = new PublicKey(businessAccount.data.slice(40, 72));

  console.log(`   Business Owner: ${businessOwner.toBase58()}`);
  console.log(`   Business Token Account: ${businessTokenAccount.toBase58()}`);

  // Check business token account owner
  const businessTokenInfo = await connection.getAccountInfo(businessTokenAccount);
  if (!businessTokenInfo) {
    console.log(`   ❌ Business Token Account doesn't exist!`);
  } else {
    console.log(`   Business Token Account Owner: ${businessTokenInfo.owner.toBase58()}`);
    if (businessTokenInfo.owner.equals(INCO_TOKEN_PROGRAM)) {
      console.log(`   ✅ Correctly owned by Inco Token Program`);
    } else {
      console.log(`   ❌ WRONG OWNER! Expected: ${INCO_TOKEN_PROGRAM.toBase58()}`);
    }
  }

  console.log('');

  // 3. Summary
  console.log('📊 Summary:');
  console.log(`   Bagel PDA Inco Account: ${incoTokenAccount.toBase58()}`);
  console.log(`   Business Vault Account: ${businessTokenAccount.toBase58()}`);

  if (incoTokenAccount.equals(businessTokenAccount)) {
    console.log('   ℹ️  They are the SAME account (owner\'s personal account used as vault)');
  } else {
    console.log('   ⚠️  They are DIFFERENT accounts');
  }

  console.log('');
  console.log('💡 Solution:');
  console.log('   The business vault should be the owner\'s Inco Token account.');
  console.log('   You need to re-register the business with the correct token account.');
}

main().catch(console.error);
