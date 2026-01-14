/**
 * COMPLETE END-TO-END TEST WITH REAL SOL
 * 
 * This tests the ACTUAL flow a user would experience:
 * 1. Employer creates payroll
 * 2. Employer deposits SOL
 * 3. Employee claims (withdraws) salary
 * 
 * We'll also inspect what the privacy layer is ACTUALLY doing.
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

// Create new employee keypair for this test
const employeeKeypair = Keypair.generate();

console.log('🧪 COMPLETE E2E TEST WITH REAL SOL');
console.log('===================================\n');
console.log('👔 Employer:', employerKeypair.publicKey.toBase58());
console.log('👷 Employee:', employeeKeypair.publicKey.toBase58());
console.log('');

// Save employee keypair for reference
fs.writeFileSync('e2e-test-employee.json', JSON.stringify(Array.from(employeeKeypair.secretKey)));
console.log('📁 Employee keypair saved to: e2e-test-employee.json\n');

async function checkBalances(label) {
  const employerBalance = await connection.getBalance(employerKeypair.publicKey);
  const employeeBalance = await connection.getBalance(employeeKeypair.publicKey);
  console.log(`💰 ${label}`);
  console.log(`   Employer: ${(employerBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`   Employee: ${(employeeBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);
  return { employerBalance, employeeBalance };
}

async function step1_FundEmployee() {
  console.log('═══════════════════════════════════════════');
  console.log('STEP 1: Fund Employee Wallet with 0.05 SOL');
  console.log('═══════════════════════════════════════════\n');
  
  await checkBalances('Before Transfer');
  
  // Transfer 0.05 SOL to employee
  const transferTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: employerKeypair.publicKey,
      toPubkey: employeeKeypair.publicKey,
      lamports: 0.05 * LAMPORTS_PER_SOL, // 0.05 SOL
    })
  );
  
  const sig = await sendAndConfirmTransaction(connection, transferTx, [employerKeypair]);
  console.log('✅ Transfer complete:', sig);
  console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
  
  await checkBalances('After Transfer');
}

async function step2_CreatePayroll() {
  console.log('═══════════════════════════════════════════');
  console.log('STEP 2: Employer Creates Payroll');
  console.log('═══════════════════════════════════════════\n');
  
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  console.log('📍 PayrollJar PDA:', payrollJarPDA.toBase58());
  
  // Salary: 1000 lamports per second (tiny amount for testing)
  const salaryPerSecond = 1000;
  console.log('💵 Salary rate:', salaryPerSecond, 'lamports/second');
  console.log('');
  
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
  const sig = await sendAndConfirmTransaction(connection, tx, [employerKeypair]);
  
  console.log('✅ Payroll created!');
  console.log('📝 Transaction:', sig);
  console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
  
  // Fetch and display the created PayrollJar
  const accountInfo = await connection.getAccountInfo(payrollJarPDA);
  if (accountInfo) {
    console.log('📋 PayrollJar Account Data:');
    console.log('   Owner:', accountInfo.owner.toBase58());
    console.log('   Lamports (rent):', accountInfo.lamports);
    console.log('   Data length:', accountInfo.data.length, 'bytes');
    
    // Parse the data
    const d = accountInfo.data;
    let offset = 8; // skip discriminator
    const storedEmployer = new PublicKey(d.slice(offset, offset + 32));
    offset += 32;
    const storedEmployee = new PublicKey(d.slice(offset, offset + 32));
    offset += 32;
    const salaryLen = d.readUInt32LE(offset);
    offset += 4;
    const encryptedSalary = d.slice(offset, offset + salaryLen);
    offset += salaryLen;
    const lastWithdraw = Number(d.readBigInt64LE(offset));
    offset += 8;
    const totalAccrued = Number(d.readBigUInt64LE(offset));
    
    console.log('\n   Parsed Fields:');
    console.log('   - employer:', storedEmployer.toBase58());
    console.log('   - employee:', storedEmployee.toBase58());
    console.log('   - encrypted_salary:', encryptedSalary.toString('hex'));
    console.log('   - last_withdraw:', new Date(lastWithdraw * 1000).toISOString());
    console.log('   - total_accrued:', totalAccrued, 'lamports');
    console.log('');
    
    // PRIVACY ANALYSIS
    console.log('🔒 PRIVACY ANALYSIS:');
    console.log('   The salary is stored as:', encryptedSalary.toString('hex'));
    
    // Check if it's actually encrypted or just raw bytes
    const salaryValue = encryptedSalary.readBigUInt64LE(0);
    console.log('   Decoded as u64:', salaryValue.toString());
    
    if (salaryValue.toString() === salaryPerSecond.toString()) {
      console.log('   ⚠️  STATUS: Currently using MOCK encryption (plaintext stored)');
      console.log('   📝 NOTE: In production with Arcium SDK, this would be encrypted');
    } else {
      console.log('   ✅ STATUS: Data appears encrypted');
    }
  }
  console.log('');
}

async function step3_DepositDough() {
  console.log('═══════════════════════════════════════════');
  console.log('STEP 3: Employer Deposits 0.001 SOL');
  console.log('═══════════════════════════════════════════\n');
  
  await checkBalances('Before Deposit');
  
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  const depositAmount = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL = 1,000,000 lamports
  
  console.log('💵 Depositing:', depositAmount, 'lamports (0.001 SOL)');
  
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
  const sig = await sendAndConfirmTransaction(connection, tx, [employerKeypair]);
  
  console.log('✅ Deposit complete!');
  console.log('📝 Transaction:', sig);
  console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
  
  // Check updated state
  const accountInfo = await connection.getAccountInfo(payrollJarPDA);
  if (accountInfo) {
    const d = accountInfo.data;
    let offset = 8 + 32 + 32; // skip discriminator, employer, employee
    const salaryLen = d.readUInt32LE(offset);
    offset += 4 + salaryLen;
    offset += 8; // skip last_withdraw
    const totalAccrued = Number(d.readBigUInt64LE(offset));
    console.log('📊 Updated total_accrued:', totalAccrued, 'lamports');
  }
  
  await checkBalances('After Deposit');
  
  console.log('🔒 PRIVACY NOTE: deposit_dough currently updates state but');
  console.log('   does NOT transfer actual SOL (SPL tokens disabled).');
  console.log('   This is a limitation during hackathon - full implementation');
  console.log('   would use SPL token transfers.\n');
}

async function step4_WaitAndWithdraw() {
  console.log('═══════════════════════════════════════════');
  console.log('STEP 4: Employee Withdraws Salary');
  console.log('═══════════════════════════════════════════\n');
  
  await checkBalances('Before Withdraw');
  
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  
  console.log('⏳ Waiting 2 seconds for salary to accrue...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
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
    console.log('✅ Withdrawal complete!');
    console.log('📝 Transaction:', sig);
    console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
    
    await checkBalances('After Withdraw');
    
  } catch (error) {
    console.log('❌ Withdrawal failed:', error.message);
    
    if (error.logs) {
      console.log('\n📋 Program Logs:');
      error.logs.forEach(log => console.log('  ', log));
    }
    
    // Common expected errors
    if (error.message.includes('0x1772') || error.message.includes('WithdrawTooSoon')) {
      console.log('\n⏳ This error means MIN_WITHDRAW_INTERVAL not met yet.');
      console.log('   The program requires a minimum time between withdrawals.');
    } else if (error.message.includes('InsufficientFunds')) {
      console.log('\n💸 This error means the jar doesn\'t have enough funds.');
    }
    
    console.log('\n🔒 PRIVACY LAYER STATUS:');
    console.log('   The get_dough instruction tries to:');
    console.log('   1. Calculate accrued salary using arcium::calculate_accrued_mpc()');
    console.log('   2. Decrypt using arcium::decrypt_for_transfer()');
    console.log('   3. Execute transfer via shadowwire::execute_private_payout()');
    console.log('');
    console.log('   Currently these are MOCK implementations that:');
    console.log('   - Store salary as plaintext (not encrypted)');
    console.log('   - Don\'t actually transfer SOL (SPL tokens disabled)');
    console.log('   - Log operations but don\'t call real privacy APIs');
  }
}

async function step5_Summary() {
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 FINAL SUMMARY');
  console.log('═══════════════════════════════════════════\n');
  
  await checkBalances('Final Balances');
  
  const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  const accountInfo = await connection.getAccountInfo(payrollJarPDA);
  
  console.log('🏦 PayrollJar Status:');
  if (accountInfo) {
    console.log('   ✅ Account exists');
    console.log('   📍 Address:', payrollJarPDA.toBase58());
    console.log('   💰 Rent:', accountInfo.lamports, 'lamports');
  } else {
    console.log('   ❌ Account closed or not found');
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('🔒 PRIVACY FEATURES - HONEST ASSESSMENT');
  console.log('═'.repeat(50));
  console.log(`
┌─────────────────────┬───────────┬─────────────────────────┐
│ Feature             │ Status    │ Notes                   │
├─────────────────────┼───────────┼─────────────────────────┤
│ Arcium MPC          │ MOCKED    │ Patterns ready,         │
│                     │           │ awaiting prod API       │
├─────────────────────┼───────────┼─────────────────────────┤
│ ShadowWire ZK       │ MOCKED    │ Transfer structure      │
│                     │           │ ready, no prod API      │
├─────────────────────┼───────────┼─────────────────────────┤
│ MagicBlock PERs     │ MOCKED    │ Streaming simulation    │
│                     │           │ working, awaiting main  │
├─────────────────────┼───────────┼─────────────────────────┤
│ Kamino Finance      │ PLANNED   │ Post-hackathon          │
├─────────────────────┼───────────┼─────────────────────────┤
│ Real SOL Transfers  │ DISABLED  │ SPL token stack issue   │
│                     │           │ (temporary)             │
└─────────────────────┴───────────┴─────────────────────────┘

✅ WHAT'S REAL:
   - PayrollJar account creation on Solana devnet
   - PDA derivation and Anchor program structure
   - Transaction signatures on real blockchain
   - State management (employer, employee, timestamps)

⚠️ WHAT'S MOCKED:
   - Salary encryption (stored as plaintext)
   - Private transfers (no actual SOL movement)
   - Zero-knowledge proofs (logged but not computed)
   - Yield generation (simulated values)

📝 FOR PRODUCTION:
   - Integrate Arcium C-SPL SDK when available
   - Connect ShadowWire Bulletproofs
   - Enable MagicBlock streaming on mainnet
   - Add Kamino for yield generation
   - Re-enable SPL token transfers
`);
}

async function runFullTest() {
  try {
    await step1_FundEmployee();
    await step2_CreatePayroll();
    await step3_DepositDough();
    await step4_WaitAndWithdraw();
    await step5_Summary();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runFullTest();
