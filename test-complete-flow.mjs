/**
 * Complete E2E Test - ALL Instructions
 * Tests: bake_payroll, deposit_dough, get_dough, close_jar
 */
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

// Constants
const BAGEL_PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');
const BAGEL_JAR_SEED = Buffer.from('bagel_jar');

function getPayrollJarPDA(employee, employer) {
  return PublicKey.findProgramAddressSync(
    [BAGEL_JAR_SEED, employer.toBuffer(), employee.toBuffer()],
    BAGEL_PROGRAM_ID
  );
}

// Load employer keypair
const keypairPath = '/Users/thebunnymac/.config/solana/id.json';
const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const employerKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

// Generate a random employee for this test
const employeeKeypair = Keypair.generate();

const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');

async function testBakePayroll() {
  console.log('\n=== TEST 1: bake_payroll ===');
  
  const employer = employerKeypair.publicKey;
  const employee = employeeKeypair.publicKey;
  
  console.log('Employer:', employer.toBase58());
  console.log('Employee:', employee.toBase58());
  
  const [payrollJarPDA, bump] = getPayrollJarPDA(employee, employer);
  console.log('PayrollJar PDA:', payrollJarPDA.toBase58());
  
  // Account order: employer, employee, payroll_jar, system_program
  const discriminator = Buffer.from([0x17, 0x5f, 0x68, 0x61, 0x59, 0xcf, 0xa5, 0x92]);
  const salaryBuffer = Buffer.alloc(8);
  salaryBuffer.writeBigUInt64LE(BigInt(1000)); // 1000 lamports/sec
  const data = Buffer.concat([discriminator, salaryBuffer]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: employer, isSigner: true, isWritable: true },       // 1. employer
      { pubkey: employee, isSigner: false, isWritable: false },     // 2. employee  
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true }, // 3. payroll_jar
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 4. system
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [employerKeypair]);
    console.log('✅ SUCCESS!', signature);
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    if (error.logs) error.logs.forEach(l => console.log('  ', l));
    return false;
  }
}

async function testDepositDough() {
  console.log('\n=== TEST 2: deposit_dough ===');
  
  const employer = employerKeypair.publicKey;
  const employee = employeeKeypair.publicKey;
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);
  
  // Account order: employer, employee, payroll_jar, system_program
  const discriminator = Buffer.from([0x43, 0x0f, 0x35, 0x88, 0x19, 0xdb, 0x27, 0x5f]);
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(100000)); // 0.0001 SOL
  const data = Buffer.concat([discriminator, amountBuffer]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: employer, isSigner: true, isWritable: true },       // 1. employer
      { pubkey: employee, isSigner: false, isWritable: false },     // 2. employee  
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true }, // 3. payroll_jar
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 4. system
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [employerKeypair]);
    console.log('✅ SUCCESS!', signature);
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    if (error.logs) error.logs.forEach(l => console.log('  ', l));
    return false;
  }
}

async function testGetDough() {
  console.log('\n=== TEST 3: get_dough ===');
  console.log('(Note: This will fail because MIN_WITHDRAW_INTERVAL not met - that\'s expected!)');
  
  const employer = employerKeypair.publicKey;
  const employee = employeeKeypair.publicKey;
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);
  
  // Account order: employee, employer, payroll_jar, system_program
  const discriminator = Buffer.from([0x53, 0x05, 0xfc, 0xc4, 0xe2, 0x0c, 0x0b, 0x24]);
  const data = discriminator;
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: employee, isSigner: true, isWritable: true },        // 1. employee
      { pubkey: employer, isSigner: false, isWritable: false },      // 2. employer  
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true },  // 3. payroll_jar
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 4. system
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  
  try {
    // Employee needs to sign
    const signature = await sendAndConfirmTransaction(connection, transaction, [employeeKeypair]);
    console.log('✅ SUCCESS!', signature);
    return true;
  } catch (error) {
    if (error.message.includes('WithdrawTooSoon') || error.message.includes('0x1772')) {
      console.log('⏳ Expected error: WithdrawTooSoon (need to wait MIN_WITHDRAW_INTERVAL)');
      return true; // This is actually correct behavior
    }
    console.error('❌ FAILED:', error.message);
    if (error.logs) error.logs.forEach(l => console.log('  ', l));
    return false;
  }
}

async function testCloseJar() {
  console.log('\n=== TEST 4: close_jar ===');
  
  const employer = employerKeypair.publicKey;
  const employee = employeeKeypair.publicKey;
  const [payrollJarPDA] = getPayrollJarPDA(employee, employer);
  
  // Account order: employer, employee, payroll_jar, system_program
  const discriminator = Buffer.from([0x5c, 0xbd, 0x72, 0x24, 0xba, 0x7b, 0x00, 0xa3]);
  const data = discriminator;
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: employer, isSigner: true, isWritable: true },        // 1. employer
      { pubkey: employee, isSigner: false, isWritable: false },      // 2. employee  
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true },  // 3. payroll_jar
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 4. system
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [employerKeypair]);
    console.log('✅ SUCCESS!', signature);
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    if (error.logs) error.logs.forEach(l => console.log('  ', l));
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 COMPLETE E2E TEST SUITE');
  console.log('===========================');
  console.log('Program:', BAGEL_PROGRAM_ID.toBase58());
  
  const results = {
    bake_payroll: await testBakePayroll(),
    deposit_dough: await testDepositDough(),
    get_dough: await testGetDough(),
    close_jar: await testCloseJar(),
  };
  
  console.log('\n===========================');
  console.log('📊 RESULTS SUMMARY');
  console.log('===========================');
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${name}`);
  }
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ Some tests failed'));
}

runAllTests().catch(console.error);
