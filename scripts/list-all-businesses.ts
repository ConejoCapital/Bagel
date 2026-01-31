import { Connection, PublicKey } from '@solana/web3.js';

const PAYROLL_PROGRAM_ID = new PublicKey('J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2');

async function main() {
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');

  console.log('🔍 Listing all registered businesses...\n');

  // Get all accounts owned by payroll program
  const accounts = await connection.getProgramAccounts(PAYROLL_PROGRAM_ID);

  console.log(`Found ${accounts.length} total account(s) for payroll program\n`);

  for (const { pubkey, account } of accounts) {
    console.log(`Account: ${pubkey.toBase58()}`);
    console.log(`  Size: ${account.data.length} bytes`);
    console.log(`  Owner: ${account.owner.toBase58()}`);

    // Try to parse as Business (expected size around 128 bytes)
    if (account.data.length >= 85) {
      try {
        const owner = new PublicKey(account.data.slice(8, 40));
        const tokenAccount = new PublicKey(account.data.slice(40, 72));
        const totalDeposited = account.data.readBigUInt64LE(72);
        const employeeCount = account.data.readUInt32LE(80);
        const isActive = account.data[84] === 1;

        console.log(`  Type: Business`);
        console.log(`  Owner: ${owner.toBase58()}`);
        console.log(`  Token Account (Vault): ${tokenAccount.toBase58()}`);
        console.log(`  Total Deposits: ${totalDeposited}`);
        console.log(`  Employee Count: ${employeeCount}`);
        console.log(`  Is Active: ${isActive}`);
      } catch (e) {
        console.log(`  Type: Unknown (parse error)`);
      }
    }
    console.log('');
  }
}

main().catch(console.error);
