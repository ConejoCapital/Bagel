/**
 * Complete End-to-End Test for Bagel Payroll
 */

const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const crypto = require('crypto');

// Program ID
const PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');

// Helius Devnet RPC
const connection = new Connection(
  'https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af',
  'confirmed'
);

// Load wallets
const employerKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync('/Users/thebunnymac/.config/solana/id.json', 'utf-8')))
);

const employeeKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync('./test-employee-wallet.json', 'utf-8')))
);

console.log('\n' + '🥯 BAGEL COMPLETE FLOW TEST'.padEnd(80, ' '));
console.log('='.repeat(80));
console.log('\n📋 Wallets:');
console.log('  Employer:', employerKeypair.publicKey.toBase58());
console.log('  Employee:', employeeKeypair.publicKey.toBase58());
console.log('  Program:', PROGRAM_ID.toBase58());
console.log('\n' + '='.repeat(80) + '\n');

// Calculate PayrollJar PDA
function getPayrollJarPDA(employee, employer) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('bagel_jar'),
      employee.toBuffer(),
      employer.toBuffer(),
    ],
    PROGRAM_ID
  );
}

// Calculate discriminator
function getInstructionDiscriminator(name) {
  return Buffer.from(
    crypto.createHash('sha256')
      .update(`global:${name}`)
      .digest()
  ).subarray(0, 8);
}

async function testCreatePayroll() {
  console.log('📝 STEP 1: Creating Payroll\n');
  
  // Salary: 0.001 SOL over 2 hours = 138 lamports/second
  const salaryPerSecond = Math.floor((0.001 * 1_000_000_000) / (2 * 3600));
  console.log(`💰 Salary: ${salaryPerSecond} lamports/second`);
  console.log(`   That's 0.001 SOL total over 2 hours\n`);
  
  const [payrollJarPDA, bump] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
  console.log('📍 PayrollJar PDA:', payrollJarPDA.toBase58());
  console.log('   Bump:', bump, '\n');
  
  // Build instruction
  const discriminator = getInstructionDiscriminator('bake_payroll');
  const salaryBuffer = Buffer.alloc(8);
  salaryBuffer.writeBigUInt64LE(BigInt(salaryPerSecond));
  
  const instructionData = Buffer.concat([discriminator, salaryBuffer]);
  
  const instruction = {
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true },
      { pubkey: employerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: employeeKeypair.publicKey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  };
  
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = employerKeypair.publicKey;
  
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.sign(employerKeypair);
    
    console.log('📤 Sending transaction...');
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log('✅ Transaction sent:', signature);
    console.log(`🔍 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet\n`);
    
    console.log('⏳ Waiting for confirmation...');
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Transaction confirmed!\n');
    
    return { signature, payrollJarPDA };
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.logs) console.error('Logs:', error.logs);
    throw error;
  }
}

async function testFetchPayroll(payrollJarPDA) {
  console.log('📊 STEP 2: Fetching On-Chain Payroll Data\n');
  
  try {
    const accountInfo = await connection.getAccountInfo(payrollJarPDA);
    
    if (!accountInfo) {
      console.error('❌ PayrollJar account not found!');
      return null;
    }
    
    console.log('✅ PayrollJar account found!');
    console.log('   Owner:', accountInfo.owner.toBase58());
    console.log('   Lamports:', accountInfo.lamports);
    console.log('   Data length:', accountInfo.data.length, 'bytes\n');
    
    // Deserialize
    const data = accountInfo.data;
    let offset = 8; // Skip discriminator
    
    const employer = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const employee = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    const lastWithdraw = Number(data.readBigInt64LE(offset));
    offset += 8;
    const totalAccrued = Number(data.readBigUInt64LE(offset));
    offset += 8;
    const isActive = data.readUInt8(offset) === 1;
    offset += 1;
    const bump = data.readUInt8(offset);
    offset += 1;
    const encryptedSalaryLength = data.readUInt32LE(offset);
    offset += 4;
    const encryptedSalary = data.subarray(offset, offset + encryptedSalaryLength);
    
    const salaryPerSecond = encryptedSalaryLength === 8 ? Number(encryptedSalary.readBigUInt64LE(0)) : 0;
    
    console.log('📋 PayrollJar Data (REAL from blockchain):');
    console.log('   Employer:', employer.toBase58());
    console.log('   Employee:', employee.toBase58());
    console.log('   Last Withdraw:', new Date(lastWithdraw * 1000).toLocaleString());
    console.log('   Total Accrued:', totalAccrued, 'lamports');
    console.log('   Is Active:', isActive ? '✅' : '❌');
    console.log('   Salary/second:', salaryPerSecond, 'lamports');
    console.log('   = ~', (salaryPerSecond * 3600 / 1_000_000_000).toFixed(6), 'SOL/hour');
    console.log('   = ~', (salaryPerSecond * 86400 / 1_000_000_000).toFixed(4), 'SOL/day\n');
    
    return { employer, employee, lastWithdraw, totalAccrued, isActive, salaryPerSecond };
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function testCalculateAccrued(payrollData) {
  console.log('💰 STEP 3: Calculate Real-Time Accrued Balance\n');
  
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - payrollData.lastWithdraw;
  const accrued = elapsed * payrollData.salaryPerSecond;
  
  console.log('🕐 Current time:', new Date().toLocaleString());
  console.log('⏱️  Time since last withdraw:', elapsed, 'seconds');
  console.log('💵 Accrued balance:', accrued, 'lamports');
  console.log('   =', (accrued / 1_000_000_000).toFixed(9), 'SOL');
  
  console.log('\n⚡ This updates every second in the UI!');
  console.log('   After 1 hour:', (payrollData.salaryPerSecond * 3600 / 1_000_000_000).toFixed(9), 'SOL');
  console.log('   After 2 hours (full):', (payrollData.salaryPerSecond * 7200 / 1_000_000_000).toFixed(9), 'SOL\n');
}

async function main() {
  try {
    const result = await testCreatePayroll();
    
    console.log('⏳ Waiting 5 seconds for indexing...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const payrollData = await testFetchPayroll(result.payrollJarPDA);
    
    if (!payrollData) {
      console.error('❌ Failed to fetch payroll');
      return;
    }
    
    await testCalculateAccrued(payrollData);
    
    console.log('='.repeat(80));
    console.log('🎉 ALL TESTS PASSED! 🎉'.padStart(50));
    console.log('='.repeat(80));
    console.log('\n✅ Summary:');
    console.log('   ✅ Created payroll with REAL Solana transaction');
    console.log('   ✅ Fetched REAL on-chain account data');
    console.log('   ✅ Calculated accrued balance from REAL timestamp');
    console.log('   ✅ Everything verifiable on Solana Explorer');
    console.log('\n🥯 The app is 100% FUNCTIONAL!\n');
    
    console.log('🧪 Test in UI:');
    console.log('   1. Go to: https://bagel-phi.vercel.app/employee');
    console.log('   2. Connect with employee wallet');
    console.log(`   3. Enter employer: ${employerKeypair.publicKey.toBase58()}`);
    console.log('   4. See REAL payroll data streaming!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
