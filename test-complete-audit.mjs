/**
 * 🧪 COMPLETE SYSTEM AUDIT
 * 
 * This script tests the ENTIRE flow:
 * 1. Employer creates payroll
 * 2. Employer deposits funds
 * 3. Employee withdraws salary
 * 4. Yield accrual (if applicable)
 * 
 * It also audits what's REAL vs MOCKED in the privacy stack.
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

// ========== CONSTANTS ==========
const BAGEL_PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');
const BAGEL_JAR_SEED = Buffer.from('bagel_jar');

function getPayrollJarPDA(employee, employer) {
  return PublicKey.findProgramAddressSync(
    [BAGEL_JAR_SEED, employer.toBuffer(), employee.toBuffer()],
    BAGEL_PROGRAM_ID
  );
}

// ========== SETUP ==========
const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');

// Load employer keypair
const employerSecretKey = JSON.parse(fs.readFileSync('/Users/thebunnymac/.config/solana/id.json', 'utf-8'));
const employerKeypair = Keypair.fromSecretKey(new Uint8Array(employerSecretKey));

// Create new employee keypair
const employeeKeypair = Keypair.generate();

console.log('🔍 COMPLETE SYSTEM AUDIT');
console.log('========================\n');
console.log('👔 Employer:', employerKeypair.publicKey.toBase58());
console.log('👷 Employee:', employeeKeypair.publicKey.toBase58());
console.log('');

// Save employee keypair
fs.writeFileSync('audit-employee.json', JSON.stringify(Array.from(employeeKeypair.secretKey)));
console.log('📁 Employee keypair saved to: audit-employee.json\n');

async function checkBalances(label) {
  const employerBalance = await connection.getBalance(employerKeypair.publicKey);
  const employeeBalance = await connection.getBalance(employeeKeypair.publicKey);
  console.log(`💰 ${label}`);
  console.log(`   Employer: ${(employerBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`   Employee: ${(employeeBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);
  return { employerBalance, employeeBalance };
}

async function test1_CreatePayroll() {
  console.log('═══════════════════════════════════════════');
  console.log('TEST 1: Employer Creates Payroll');
  console.log('═══════════════════════════════════════════\n');
  
  await checkBalances('Before Create');
  
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  console.log('📍 PayrollJar PDA:', payrollJarPDA.toBase58());
  
  const salaryPerSecond = 1000; // 1000 lamports/sec
  console.log('💵 Salary rate:', salaryPerSecond, 'lamports/second\n');
  
  // Build instruction
  const discriminator = Buffer.from([0x17, 0x5f, 0x68, 0x61, 0x59, 0xcf, 0xa5, 0x92]);
  const salaryBuffer = Buffer.alloc(8);
  salaryBuffer.writeBigUInt64LE(BigInt(salaryPerSecond));
  const data = Buffer.concat([discriminator, salaryBuffer]);
  
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
    
    // Verify account was created
    const accountInfo = await connection.getAccountInfo(payrollJarPDA);
    if (accountInfo) {
      console.log('✅ PayrollJar account exists on-chain');
      console.log('   Owner:', accountInfo.owner.toBase58());
      console.log('   Data length:', accountInfo.data.length, 'bytes\n');
      
      // Parse the data
      const d = accountInfo.data;
      let offset = 8;
      const storedEmployer = new PublicKey(d.slice(offset, offset + 32));
      offset += 32;
      const storedEmployee = new PublicKey(d.slice(offset, offset + 32));
      offset += 32;
      const salaryLen = d.readUInt32LE(offset);
      offset += 4;
      const encryptedSalary = d.slice(offset, offset + salaryLen);
      
      console.log('📋 Account Data:');
      console.log('   Employer:', storedEmployer.toBase58());
      console.log('   Employee:', storedEmployee.toBase58());
      console.log('   Encrypted salary (hex):', encryptedSalary.toString('hex'));
      
      // Check if it's actually encrypted or plaintext
      const salaryValue = encryptedSalary.readBigUInt64LE(0);
      if (salaryValue.toString() === salaryPerSecond.toString()) {
        console.log('   ⚠️  STATUS: Salary stored as PLAINTEXT (not encrypted!)');
        console.log('   📝 NOTE: Arcium encryption is MOCKED');
      } else {
        console.log('   ✅ STATUS: Salary appears encrypted');
      }
      console.log('');
    }
    
    await checkBalances('After Create');
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    if (error.logs) error.logs.forEach(l => console.log('  ', l));
    return false;
  }
}

async function test2_DepositDough() {
  console.log('═══════════════════════════════════════════');
  console.log('TEST 2: Employer Deposits Funds');
  console.log('═══════════════════════════════════════════\n');
  
  await checkBalances('Before Deposit');
  
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  const depositAmount = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL
  
  console.log('💵 Depositing:', depositAmount, 'lamports (0.001 SOL)');
  console.log('   Expected: 90% to Kamino, 10% liquid\n');
  
  // Build instruction
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
    
    // Check updated state
    const accountInfo = await connection.getAccountInfo(payrollJarPDA);
    if (accountInfo) {
      const d = accountInfo.data;
      let offset = 8 + 32 + 32;
      const salaryLen = d.readUInt32LE(offset);
      offset += 4 + salaryLen;
      offset += 8; // skip last_withdraw
      const totalAccrued = Number(d.readBigUInt64LE(offset));
      
      console.log('📊 Updated State:');
      console.log('   total_accrued:', totalAccrued, 'lamports');
      console.log('   Expected liquid (10%):', depositAmount * 0.1, 'lamports');
      console.log('');
      
      console.log('🔒 PRIVACY AUDIT:');
      console.log('   ⚠️  Kamino deposit: MOCKED (no actual deposit)');
      console.log('   ⚠️  Arcium C-SPL wrapping: MOCKED (no confidential account)');
      console.log('   ✅ State update: REAL (total_accrued updated)');
      console.log('');
    }
    
    await checkBalances('After Deposit');
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    if (error.logs) error.logs.forEach(l => console.log('  ', l));
    return false;
  }
}

async function test3_WithdrawDough() {
  console.log('═══════════════════════════════════════════');
  console.log('TEST 3: Employee Withdraws Salary');
  console.log('═══════════════════════════════════════════\n');
  
  await checkBalances('Before Withdraw');
  
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  
  console.log('⏳ Waiting 65 seconds for MIN_WITHDRAW_INTERVAL...\n');
  await new Promise(r => setTimeout(r, 65000));
  
  // Build instruction
  const discriminator = Buffer.from([0x53, 0x05, 0xfc, 0xc4, 0xe2, 0x0c, 0x0b, 0x24]);
  const data = discriminator;
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: employeeKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: employerKeypair.publicKey, isSigner: false, isWritable: false },
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });
  
  const tx = new Transaction().add(instruction);
  
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [employeeKeypair]);
    console.log('✅ SUCCESS! Transaction:', sig);
    console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
    
    // Check updated state
    const accountInfo = await connection.getAccountInfo(payrollJarPDA);
    if (accountInfo) {
      const d = accountInfo.data;
      let offset = 8 + 32 + 32;
      const salaryLen = d.readUInt32LE(offset);
      offset += 4 + salaryLen;
      const lastWithdraw = Number(d.readBigInt64LE(offset));
      offset += 8;
      const totalAccrued = Number(d.readBigUInt64LE(offset));
      
      console.log('📊 Updated State:');
      console.log('   last_withdraw:', new Date(lastWithdraw * 1000).toISOString());
      console.log('   total_accrued:', totalAccrued, 'lamports');
      console.log('');
      
      console.log('🔒 PRIVACY AUDIT:');
      console.log('   ⚠️  Arcium MPC calculation: MOCKED (local multiplication)');
      console.log('   ⚠️  ShadowWire transfer: MOCKED (no actual transfer)');
      console.log('   ✅ State update: REAL (total_accrued reduced)');
      console.log('   ❌ SOL transfer: NOT HAPPENING (SPL tokens disabled)');
      console.log('');
    }
    
    await checkBalances('After Withdraw');
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    if (error.logs) error.logs.forEach(l => console.log('  ', l));
    return false;
  }
}

async function auditPrivacyStack() {
  console.log('\n═══════════════════════════════════════════');
  console.log('🔒 PRIVACY STACK AUDIT');
  console.log('═══════════════════════════════════════════\n');
  
  console.log('📋 COMPONENT STATUS:\n');
  
  console.log('1. ARCIUM C-SPL:');
  console.log('   ❌ Encryption: MOCKED (plaintext storage)');
  console.log('   ❌ MPC Computation: MOCKED (local math)');
  console.log('   ❌ Circuit Deployment: NOT DONE');
  console.log('   ❌ C-SPL Confidential Accounts: NOT IMPLEMENTED');
  console.log('   ✅ Crypto Libraries: REAL (@noble/hashes, @noble/curves)');
  console.log('   ✅ Frontend Encryption: REAL (SHA3-256 + x25519)');
  console.log('');
  
  console.log('2. SHADOWWIRE:');
  console.log('   ❌ Bulletproof Proofs: MOCKED (placeholder)');
  console.log('   ❌ Private Transfers: MOCKED (no actual transfer)');
  console.log('   ❌ SDK Integration: NOT CONNECTED');
  console.log('   ❌ Program ID: NOT SET');
  console.log('   ✅ Structure: READY (patterns in place)');
  console.log('');
  
  console.log('3. MAGICBLOCK ER:');
  console.log('   ❌ Ephemeral Rollup: NOT DELEGATED');
  console.log('   ❌ Real-time Streaming: NOT ACTIVE');
  console.log('   ❌ SDK Integration: NOT CONNECTED');
  console.log('   ❌ #[ephemeral] Attribute: NOT ADDED');
  console.log('   ✅ Structure: READY (delegate/undelegate patterns)');
  console.log('');
  
  console.log('4. KAMINO FINANCE:');
  console.log('   ❌ Lend V2 Deposit: MOCKED (no actual deposit)');
  console.log('   ❌ kSOL Tokens: NOT RECEIVED');
  console.log('   ❌ Yield Accrual: NOT HAPPENING');
  console.log('   ❌ SDK Integration: NOT CONNECTED');
  console.log('   ✅ Structure: READY (deposit/withdraw patterns)');
  console.log('');
  
  console.log('5. SOL TRANSFERS:');
  console.log('   ❌ SPL Token Transfers: DISABLED (stack overflow)');
  console.log('   ❌ Employee Payouts: NOT WORKING (no SOL movement)');
  console.log('   ✅ State Updates: REAL (account data changes)');
  console.log('');
}

async function runCompleteAudit() {
  const results = {
    createPayroll: await test1_CreatePayroll(),
    depositDough: await test2_DepositDough(),
    withdrawDough: await test3_WithdrawDough(),
  };
  
  await auditPrivacyStack();
  
  console.log('═══════════════════════════════════════════');
  console.log('📊 AUDIT SUMMARY');
  console.log('═══════════════════════════════════════════\n');
  
  console.log('✅ WHAT WORKS (REAL):');
  console.log('   - PayrollJar account creation on Solana');
  console.log('   - PDA derivation and account structure');
  console.log('   - State management (employer, employee, timestamps)');
  console.log('   - Transaction signatures on devnet');
  console.log('   - Frontend crypto (SHA3-256, x25519)');
  console.log('');
  
  console.log('❌ WHAT DOESN\'T WORK (MOCKED):');
  console.log('   - Salary encryption (stored as plaintext)');
  console.log('   - MPC computation (local multiplication)');
  console.log('   - ShadowWire transfers (no actual transfer)');
  console.log('   - MagicBlock ER streaming (not delegated)');
  console.log('   - Kamino yield deposits (no actual deposit)');
  console.log('   - SOL transfers to employees (SPL disabled)');
  console.log('');
  
  console.log('📋 RESULTS:');
  for (const [name, passed] of Object.entries(results)) {
    console.log(`   ${passed ? '✅' : '❌'} ${name}`);
  }
}

runCompleteAudit().catch(console.error);
