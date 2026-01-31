import { Connection, PublicKey } from '@solana/web3.js';

const PAYROLL_PROGRAM_ID = new PublicKey('J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2');

async function main() {
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');

  const vaultAccount = new PublicKey('C2nZ8CK2xqRJj7uQuipmi111hqXf3sRK2Zq4aQhmSYJu');

  console.log('🔍 Finding business by vault account...\n');
  console.log(`Vault Account: ${vaultAccount.toBase58()}\n`);

  // Get all Business PDAs that reference this vault
  console.log('Searching for Business PDAs...');

  const accounts = await connection.getProgramAccounts(PAYROLL_PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 40, // token_account field offset (discriminator 8 + owner 32)
          bytes: vaultAccount.toBase58(),
        },
      },
    ],
  });

  console.log(`Found ${accounts.length} matching business(es)\n`);

  for (const { pubkey, account } of accounts) {
    console.log(`Business PDA: ${pubkey.toBase58()}`);
    const owner = new PublicKey(account.data.slice(8, 40));
    const tokenAccount = new PublicKey(account.data.slice(40, 72));
    const totalDeposited = account.data.readBigUInt64LE(72);
    const employeeCount = account.data.readUInt32LE(80);
    const isActive = account.data[84] === 1;

    console.log(`  Owner: ${owner.toBase58()}`);
    console.log(`  Token Account (Vault): ${tokenAccount.toBase58()}`);
    console.log(`  Total Deposits: ${totalDeposited}`);
    console.log(`  Employee Count: ${employeeCount}`);
    console.log(`  Is Active: ${isActive}`);
    console.log('');
  }
}

main().catch(console.error);
