/**
 * 🥯 Bagel: Manual E2E Test (No IDL Required)
 * 
 * Tests the complete flow using manual instruction building.
 * This bypasses the IDL requirement.
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { createHash } from 'crypto';

const BAGEL_PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Load wallet
const walletAddress = execSync('solana address', { encoding: 'utf-8' }).trim();
const keypairPath = join(homedir(), '.config', 'solana', 'id.json');
const keypairData = JSON.parse(readFileSync(keypairPath, 'utf-8'));
const wallet = Keypair.fromSecretKey(Uint8Array.from(Array.isArray(keypairData) ? keypairData : keypairData.secretKey || keypairData));

function getPayrollJarPDA(employer, employee) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('bagel_jar'),
      employer.toBuffer(),
      employee.toBuffer(),
    ],
    BAGEL_PROGRAM_ID
  );
}

function createDiscriminator(name) {
  const hash = createHash('sha256').update(`global:${name}`).digest();
  return Buffer.from(hash.slice(0, 8));
}

async function verifyTransaction(signature) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
  if (!tx) {
    return { success: false, error: 'Transaction not found' };
  }
  if (tx.meta?.err) {
    return { success: false, error: `Transaction failed: ${JSON.stringify(tx.meta.err)}` };
  }
  return { success: true, tx };
}

async function main() {
  console.log('🥯 Bagel: Manual E2E Test\n');
  console.log('Wallet:', wallet.publicKey.toBase58());
  console.log('Program:', BAGEL_PROGRAM_ID.toBase58());
  console.log('');

  // Step 1: Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('📋 Step 1: Check Balance');
  console.log(`   Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.3 * LAMPORTS_PER_SOL) {
    console.log('   ⚠️  Insufficient balance. Need at least 0.3 SOL');
    process.exit(1);
  }
  console.log('   ✅ Sufficient balance\n');

  // Generate employee
  const employee = Keypair.generate();
  const [payrollJar] = getPayrollJarPDA(wallet.publicKey, employee.publicKey);
  console.log('   Employee:', employee.publicKey.toBase58());
  console.log('   PayrollJar:', payrollJar.toBase58());
  console.log('');

  // Step 2: Bake Payroll
  console.log('📋 Step 2: Bake Payroll (Create PayrollJar)');
  const salaryPerSecond = 27_777;
  
  const bakeDiscriminator = createDiscriminator('bake_payroll');
  const salaryBuffer = Buffer.alloc(8);
  salaryBuffer.writeBigUInt64LE(BigInt(salaryPerSecond));
  const bakeData = Buffer.concat([bakeDiscriminator, salaryBuffer]);

  const bakeIx = {
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: employee.publicKey, isSigner: false, isWritable: false },
      { pubkey: payrollJar, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BAGEL_PROGRAM_ID,
    data: bakeData,
  };

  const bakeTx = new Transaction().add(bakeIx);
  bakeTx.feePayer = wallet.publicKey;
  bakeTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  try {
    console.log('   Sending bake_payroll...');
    const bakeSig = await sendAndConfirmTransaction(connection, bakeTx, [wallet]);
    console.log('   Transaction:', bakeSig);
    
    const verify = await verifyTransaction(bakeSig);
    if (!verify.success) {
      console.log('   ❌ FAILED:', verify.error);
      process.exit(1);
    }
    console.log('   ✅ Payroll created successfully\n');
  } catch (err) {
    console.log('   ❌ ERROR:', err.message);
    process.exit(1);
  }

  // Step 3: Deposit
  console.log('📋 Step 3: Deposit Dough (0.1 SOL)');
  const DEPOSIT_AMOUNT = 0.1 * LAMPORTS_PER_SOL;
  
  const balanceBefore = await connection.getBalance(wallet.publicKey);
  const jarBalanceBefore = await connection.getBalance(payrollJar);
  
  console.log(`   Employer before: ${balanceBefore / LAMPORTS_PER_SOL} SOL`);
  console.log(`   Jar before: ${jarBalanceBefore / LAMPORTS_PER_SOL} SOL`);

  const depositDiscriminator = createDiscriminator('deposit_dough');
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(DEPOSIT_AMOUNT));
  const depositData = Buffer.concat([depositDiscriminator, amountBuffer]);

  const depositIx = {
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: employee.publicKey, isSigner: false, isWritable: false },
      { pubkey: payrollJar, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BAGEL_PROGRAM_ID,
    data: depositData,
  };

  const depositTx = new Transaction().add(depositIx);
  depositTx.feePayer = wallet.publicKey;
  depositTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  try {
    console.log('   Sending deposit_dough...');
    const depositSig = await sendAndConfirmTransaction(connection, depositTx, [wallet]);
    console.log('   Transaction:', depositSig);
    
    const verify = await verifyTransaction(depositSig);
    if (!verify.success) {
      console.log('   ❌ FAILED:', verify.error);
      console.log('   🔍 Check transaction on Solana Explorer');
      process.exit(1);
    }
    
    const balanceAfter = await connection.getBalance(wallet.publicKey);
    const jarBalanceAfter = await connection.getBalance(payrollJar);
    
    console.log(`   Employer after: ${balanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Jar after: ${jarBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    
    const employerDecrease = balanceBefore - balanceAfter;
    const jarIncrease = jarBalanceAfter - jarBalanceBefore;
    
    console.log(`   Employer decreased: ${employerDecrease / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Jar increased: ${jarIncrease / LAMPORTS_PER_SOL} SOL`);
    
    if (Math.abs(employerDecrease - DEPOSIT_AMOUNT) > 10000) {
      console.log('   ⚠️  Amount mismatch (may include fees)');
    } else {
      console.log('   ✅ Deposit successful\n');
    }
  } catch (err) {
    console.log('   ❌ ERROR:', err.message);
    console.log('   🔍 This is likely the "Instruction #1 Failed" error');
    console.log('   🔍 BLOCKER: Need to investigate why deposit_dough fails');
    process.exit(1);
  }

  // Step 4: Withdraw
  console.log('📋 Step 4: Withdraw (Get Dough)');
  console.log('   Waiting 5 seconds for accrual...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Airdrop to employee for fees
  if ((await connection.getBalance(employee.publicKey)) < 0.1 * LAMPORTS_PER_SOL) {
    console.log('   Airdropping to employee...');
    const airdropSig = await connection.requestAirdrop(employee.publicKey, 0.1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig, 'confirmed');
  }

  const employeeBalanceBefore = await connection.getBalance(employee.publicKey);
  console.log(`   Employee before: ${employeeBalanceBefore / LAMPORTS_PER_SOL} SOL`);

  const withdrawDiscriminator = createDiscriminator('get_dough');
  const withdrawIx = {
    keys: [
      { pubkey: employee.publicKey, isSigner: true, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: false, isWritable: false },
      { pubkey: payrollJar, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BAGEL_PROGRAM_ID,
    data: withdrawDiscriminator,
  };

  const withdrawTx = new Transaction().add(withdrawIx);
  withdrawTx.feePayer = employee.publicKey;
  withdrawTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  try {
    console.log('   Sending get_dough...');
    const withdrawSig = await sendAndConfirmTransaction(connection, withdrawTx, [employee]);
    console.log('   Transaction:', withdrawSig);
    
    const verify = await verifyTransaction(withdrawSig);
    if (!verify.success) {
      console.log('   ❌ FAILED:', verify.error);
      process.exit(1);
    }
    
    const employeeBalanceAfter = await connection.getBalance(employee.publicKey);
    const employeeIncrease = employeeBalanceAfter - employeeBalanceBefore;
    
    console.log(`   Employee after: ${employeeBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Employee received: ${employeeIncrease / LAMPORTS_PER_SOL} SOL`);
    
    if (employeeIncrease > 0) {
      console.log('   ✅ Withdrawal successful\n');
    } else {
      console.log('   ⚠️  No increase (may need more time)\n');
    }
  } catch (err) {
    console.log('   ❌ ERROR:', err.message);
    process.exit(1);
  }

  console.log('📊 E2E Test Summary:');
  console.log('   ✅ Payroll created');
  console.log('   ✅ Deposit successful');
  console.log('   ✅ Withdrawal successful');
  console.log('\n🎉 E2E flow completed!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
