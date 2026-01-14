/**
 * Retry withdrawal after waiting MIN_WITHDRAW_INTERVAL (60 seconds)
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

const employeeSecretKey = JSON.parse(fs.readFileSync('e2e-test-employee.json', 'utf-8'));
const employeeKeypair = Keypair.fromSecretKey(new Uint8Array(employeeSecretKey));

console.log('👔 Employer:', employerKeypair.publicKey.toBase58());
console.log('👷 Employee:', employeeKeypair.publicKey.toBase58());

const [payrollJarPDA] = getPayrollJarPDA(employeeKeypair.publicKey, employerKeypair.publicKey);
console.log('📍 PayrollJar:', payrollJarPDA.toBase58());

// First check current state
async function checkState() {
  const accountInfo = await connection.getAccountInfo(payrollJarPDA);
  if (!accountInfo) {
    console.log('❌ PayrollJar not found!');
    return null;
  }
  
  const d = accountInfo.data;
  let offset = 8 + 32 + 32; // skip discriminator, employer, employee
  const salaryLen = d.readUInt32LE(offset);
  offset += 4;
  const encryptedSalary = d.slice(offset, offset + salaryLen);
  offset += salaryLen;
  const lastWithdraw = Number(d.readBigInt64LE(offset));
  offset += 8;
  const totalAccrued = Number(d.readBigUInt64LE(offset));
  
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - lastWithdraw;
  const canWithdraw = elapsed >= 60;
  
  console.log('\n📊 Current State:');
  console.log('   Salary rate:', encryptedSalary.readBigUInt64LE(0).toString(), 'lamports/sec');
  console.log('   Total accrued:', totalAccrued, 'lamports');
  console.log('   Last withdraw:', new Date(lastWithdraw * 1000).toISOString());
  console.log('   Time elapsed:', elapsed, 'seconds');
  console.log('   Can withdraw now?', canWithdraw ? 'YES ✅' : `NO (need ${60 - elapsed}s more)`);
  
  return { lastWithdraw, totalAccrued, elapsed, canWithdraw };
}

async function tryWithdraw() {
  const state = await checkState();
  if (!state) return;
  
  if (!state.canWithdraw) {
    const waitTime = 60 - state.elapsed + 5; // Add 5 second buffer
    console.log(`\n⏳ Waiting ${waitTime} seconds...`);
    await new Promise(r => setTimeout(r, waitTime * 1000));
    await checkState();
  }
  
  console.log('\n💰 Attempting withdrawal...');
  
  // Check balances
  const empBalance = await connection.getBalance(employeeKeypair.publicKey);
  console.log('   Employee balance before:', empBalance / LAMPORTS_PER_SOL, 'SOL');
  
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
    const sig = await sendAndConfirmTransaction(connection, tx, [employeeKeypair]);
    console.log('✅ SUCCESS!');
    console.log('📝 TX:', sig);
    console.log(`🔗 https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    
    // Check new balances
    const newEmpBalance = await connection.getBalance(employeeKeypair.publicKey);
    console.log('\n   Employee balance after:', newEmpBalance / LAMPORTS_PER_SOL, 'SOL');
    console.log('   Balance change:', (newEmpBalance - empBalance) / LAMPORTS_PER_SOL, 'SOL');
    
    // Check updated state
    await checkState();
    
    console.log('\n🔒 PRIVACY STATUS:');
    console.log('   The withdrawal executed successfully!');
    console.log('   However, due to SPL tokens being disabled:');
    console.log('   - State was updated (total_accrued reduced)');
    console.log('   - NO actual SOL was transferred');
    console.log('   - In production, private transfer would happen here');
    
  } catch (error) {
    console.log('❌ Failed:', error.message);
    if (error.logs) {
      console.log('\n📋 Logs:');
      error.logs.forEach(log => console.log('  ', log));
    }
  }
}

tryWithdraw();
