/**
 * This test EXACTLY mimics what the frontend bagel-client.ts does
 * to help debug any mismatches
 */
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

// ====== EXACT COPY FROM bagel-client.ts ======
const BAGEL_PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');
const BAGEL_JAR_SEED = Buffer.from('bagel_jar');

function getPayrollJarPDA(employee, employer) {
  return PublicKey.findProgramAddressSync(
    [
      BAGEL_JAR_SEED,
      employer.toBuffer(),  // employer FIRST (matches program)
      employee.toBuffer(),  // employee SECOND (matches program)
    ],
    BAGEL_PROGRAM_ID
  );
}
// ====== END COPY ======

// Load keypair
const keypairPath = '/Users/thebunnymac/.config/solana/id.json';
const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const employerKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

// Use a RANDOM new employee each time to avoid "already exists" error
const randomEmployee = Keypair.generate();

async function testFrontendFlow() {
  console.log('🧪 Testing EXACT Frontend Flow');
  console.log('================================\n');
  
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');
  
  const employer = employerKeypair.publicKey;
  const employee = randomEmployee.publicKey;
  
  console.log('Employer:', employer.toBase58());
  console.log('Employee (random):', employee.toBase58());
  
  const [payrollJarPDA, bump] = getPayrollJarPDA(employee, employer);
  console.log('PayrollJar PDA:', payrollJarPDA.toBase58());
  console.log('Bump:', bump);
  
  // EXACT discriminator from bagel-client.ts
  const discriminator = Buffer.from([0x17, 0x5f, 0x68, 0x61, 0x59, 0xcf, 0xa5, 0x92]);
  
  // Salary: 1000 lamports per second
  const salaryPerSecond = 1000;
  const salaryBuffer = Buffer.alloc(8);
  salaryBuffer.writeBigUInt64LE(BigInt(Math.floor(salaryPerSecond)));
  
  const data = Buffer.concat([discriminator, salaryBuffer]);
  console.log('\nInstruction data (hex):', data.toString('hex'));
  
  // EXACT account order from bagel-client.ts (lines 94-99)
  console.log('\nAccount order in instruction:');
  console.log('  0. payrollJarPDA (writable):', payrollJarPDA.toBase58());
  console.log('  1. employer (signer, writable):', employer.toBase58());
  console.log('  2. employee (not signer, not writable):', employee.toBase58());
  console.log('  3. SystemProgram:', SystemProgram.programId.toBase58());
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true },
      { pubkey: employer, isSigner: true, isWritable: true },
      { pubkey: employee, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  
  console.log('\n📤 Sending transaction...\n');
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [employerKeypair]);
    console.log('✅ SUCCESS! Transaction:', signature);
    console.log(`🔍 View: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.log('\n📋 Program logs:');
      error.logs.forEach((log) => console.log('  ', log));
    }
    return false;
  }
}

testFrontendFlow();
