import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

// Program ID and constants
const BAGEL_PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');
const BAGEL_JAR_SEED = Buffer.from('bagel_jar');

// Load keypair from file
const keypairPath = '/Users/thebunnymac/.config/solana/id.json';
const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const employer = Keypair.fromSecretKey(new Uint8Array(secretKey));

// Test employee (your wallet)
const employee = new PublicKey('9hbjYLSqtxVgPHbQMnQHHbDgHXaaJ7wF6133UhTdKc9F');

// Get PDA - ORDER IS IMPORTANT: [seed, employer, employee]
function getPayrollJarPDA() {
  return PublicKey.findProgramAddressSync(
    [BAGEL_JAR_SEED, employer.publicKey.toBuffer(), employee.toBuffer()],
    BAGEL_PROGRAM_ID
  );
}

async function main() {
  console.log('🥯 Testing Bagel Program on Devnet');
  console.log('==================================');
  
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');
  
  console.log('Employer:', employer.publicKey.toBase58());
  console.log('Employee:', employee.toBase58());
  
  const [payrollJarPDA, bump] = getPayrollJarPDA();
  console.log('PayrollJar PDA:', payrollJarPDA.toBase58());
  console.log('Bump:', bump);
  
  // Build discriminator (first 8 bytes of sha256("global:bake_payroll"))
  const discriminator = Buffer.from([0x17, 0x5f, 0x68, 0x61, 0x59, 0xcf, 0xa5, 0x92]);
  
  // Salary: 1000 lamports per second (0.000001 SOL/sec)
  const salaryPerSecond = BigInt(1000);
  const salaryBuffer = Buffer.alloc(8);
  salaryBuffer.writeBigUInt64LE(salaryPerSecond);
  
  const data = Buffer.concat([discriminator, salaryBuffer]);
  console.log('Instruction data:', data.toString('hex'));
  
  // Build instruction - ORDER MUST MATCH PROGRAM!
  // In bake_payroll.rs:
  // 1. employer (signer, mut) 
  // 2. employee (not signer, not mut)
  // 3. payroll_jar (PDA, mut)
  // 4. system_program
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: employer.publicKey, isSigner: true, isWritable: true },
      { pubkey: employee, isSigner: false, isWritable: false },
      { pubkey: payrollJarPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BAGEL_PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  
  console.log('\n📤 Sending transaction to devnet...');
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [employer]);
    console.log('✅ SUCCESS! Transaction:', signature);
    console.log(`🔍 View: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.log('\nProgram logs:');
      error.logs.forEach((log) => console.log('  ', log));
    }
  }
}

main();
