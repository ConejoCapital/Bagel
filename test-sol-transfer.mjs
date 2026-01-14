/**
 * Test SOL Transfer Fix
 * 
 * This tests that employees can actually receive SOL when withdrawing
 */
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  TransactionInstruction, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import fs from 'fs';

const BAGEL_PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');
const BAGEL_JAR_SEED = Buffer.from('bagel_jar');

function getPayrollJarPDA(employee, employer) {
  return PublicKey.findProgramAddressSync(
    [BAGEL_JAR_SEED, employer.toBuffer(), employee.toBuffer()],
    BAGEL_PROGRAM_ID
  );
}

const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');

// Load keypairs
const employerSecretKey = JSON.parse(fs.readFileSync('/Users/thebunnymac/.config/solana/id.json', 'utf-8'));
const employerKeypair = Keypair.fromSecretKey(new Uint8Array(employerSecretKey));

const employeeSecretKey = JSON.parse(fs.readFileSync('audit-employee.json', 'utf-8'));
const employeeKeypair = Keypair.fromSecretKey(new Uint8Array(employeeSecretKey));

console.log('🧪 Testing SOL Transfer Fix');
console.log('===========================\n');
console.log('👔 Employer:', employerKeypair.publicKey.toBase58());
console.log('👷 Employee:', employeeKeypair.publicKey.toBase58());

async function checkBalances(label) {
  const employerBalance = await connection.getBalance(employerKeypair.publicKey);
  const employeeBalance = await connection.getBalance(employeeKeypair.publicKey);
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  const jarBalance = await connection.getBalance(payrollJarPDA);
  
  console.log(`💰 ${label}`);
  console.log(`   Employer: ${(employerBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`   Employee: ${(employeeBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`   PayrollJar: ${(jarBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);
  return { employerBalance, employeeBalance, jarBalance };
}

async function testDeposit() {
  console.log('═══════════════════════════════════════════');
  console.log('STEP 1: Deposit SOL to PayrollJar');
  console.log('═══════════════════════════════════════════\n');
  
  await checkBalances('Before Deposit');
  
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  const depositAmount = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL
  
  console.log('💵 Depositing:', depositAmount, 'lamports (0.01 SOL)');
  console.log('   Expected: 10% to PayrollJar, 90% to Kamino (mocked)\n');
  
  const discriminator = Buffer.from([0x43, 0x0f, 0x35, 0x88, 0x19, 0xdb, 0x27, 0x5f]);
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(depositAmount));
  const data = Buffer.concat([discriminator, amountBuffer]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: employerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: employeeKeypair.publicKey, isSigner: false, isWritable: false },
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });
  
  const tx = new Transaction().add(instruction);
  
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [employerKeypair]);
    console.log('✅ SUCCESS! Transaction:', sig);
    console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
    
    await checkBalances('After Deposit');
    
    // Check if PayrollJar actually received SOL
    const jarBalance = await connection.getBalance(payrollJarPDA);
    const expectedLiquid = depositAmount * 0.1; // 10%
    console.log('📊 PayrollJar Balance Check:');
    console.log('   Actual balance:', jarBalance, 'lamports');
    console.log('   Expected liquid (10%):', expectedLiquid, 'lamports');
    if (jarBalance > 2436000) {
      console.log('   ✅ SOL transfer working!');
    } else {
      console.log('   ⚠️  Only rent in account');
    }
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    if (error.logs) error.logs.forEach(l => console.log('  ', l));
    return false;
  }
}

async function testWithdraw() {
  console.log('═══════════════════════════════════════════');
  console.log('STEP 2: Employee Withdraws (with SOL transfer)');
  console.log('═══════════════════════════════════════════\n');
  
  await checkBalances('Before Withdraw');
  
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  
  // Fund employee for fees
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: employerKeypair.publicKey,
      toPubkey: employeeKeypair.publicKey,
      lamports: 0.01 * LAMPORTS_PER_SOL,
    })
  );
  await sendAndConfirmTransaction(connection, fundTx, [employerKeypair]);
  console.log('✅ Funded employee for transaction fees\n');
  
  console.log('⏳ Waiting 65 seconds for MIN_WITHDRAW_INTERVAL...\n');
  await new Promise(r => setTimeout(r, 65000));
  
  const discriminator = Buffer.from([0x53, 0x05, 0xfc, 0xc4, 0xe2, 0x0c, 0x0b, 0x24]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: employeeKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: employerKeypair.publicKey, isSigner: false, isWritable: false },
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BAGEL_PROGRAM_ID,
    data: discriminator,
  });
  
  const tx = new Transaction().add(instruction);
  
  try {
    const employeeBalanceBefore = await connection.getBalance(employeeKeypair.publicKey);
    
    const sig = await sendAndConfirmTransaction(connection, tx, [employeeKeypair]);
    console.log('✅ SUCCESS! Transaction:', sig);
    console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
    
    await checkBalances('After Withdraw');
    
    const employeeBalanceAfter = await connection.getBalance(employeeKeypair.publicKey);
    const balanceChange = employeeBalanceAfter - employeeBalanceBefore;
    
    console.log('📊 Withdrawal Verification:');
    console.log('   Employee balance change:', balanceChange, 'lamports');
    if (balanceChange > 0) {
      console.log('   ✅ EMPLOYEE RECEIVED SOL! Core functionality working!');
    } else {
      console.log('   ⚠️  No balance increase (may have been used for fees)');
    }
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    if (error.logs) {
      console.log('\n📋 Program Logs:');
      error.logs.forEach(l => console.log('  ', l));
    }
    return false;
  }
}

async function runTest() {
  const depositResult = await testDeposit();
  if (depositResult) {
    await testWithdraw();
  }
}

runTest().catch(console.error);
