import { Connection, PublicKey } from '@solana/web3.js';

const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');
const USDBAGEL_MINT = new PublicKey('GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt');

async function main() {
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');

  const incoTokenAccount = new PublicKey('2pHFRGd7Tnx4mXKzgVoKwPDLYu21sUmCYAsTpjSrkZdi');

  console.log('🔍 Finding wallet owner from Inco Token account...\n');
  console.log(`Inco Token Account: ${incoTokenAccount.toBase58()}\n`);

  // Get all Bagel PDAs that reference this Inco Token account
  console.log('Searching for Bagel UserToken PDAs...');

  const accounts = await connection.getProgramAccounts(BAGEL_PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 72, // inco_token_account field offset
          bytes: incoTokenAccount.toBase58(),
        },
      },
    ],
  });

  console.log(`Found ${accounts.length} matching account(s)\n`);

  for (const { pubkey, account } of accounts) {
    console.log(`Bagel PDA: ${pubkey.toBase58()}`);
    const owner = new PublicKey(account.data.slice(8, 40));
    const mint = new PublicKey(account.data.slice(40, 72));
    const incoAccount = new PublicKey(account.data.slice(72, 104));

    console.log(`  Owner: ${owner.toBase58()}`);
    console.log(`  Mint: ${mint.toBase58()}`);
    console.log(`  Inco Token Account: ${incoAccount.toBase58()}`);
    console.log('');
  }
}

main().catch(console.error);
