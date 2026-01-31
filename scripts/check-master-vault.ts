import { Connection, PublicKey } from '@solana/web3.js';

async function main() {
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af', 'confirmed');

  const masterVault = new PublicKey('4ohqzLMuadzedDxRbmy1Lppuw57Mi7Fr2151q2m82fEW');

  console.log('🔍 Checking Master Vault...\n');
  console.log(`Master Vault PDA: ${masterVault.toBase58()}\n`);

  const accountInfo = await connection.getAccountInfo(masterVault);
  if (!accountInfo) {
    console.log('❌ Master Vault not found!');
    return;
  }

  console.log(`✅ Account exists, size: ${accountInfo.data.length} bytes`);
  console.log(`Owner: ${accountInfo.owner.toBase58()}\n`);

  // Parse MasterVault data
  // Assuming structure: discriminator(8) + entries(Vec) + inco_token_account(32) + ...
  // Need to find the correct offset for inco_token_account

  console.log('Raw data (first 208 bytes):');
  console.log(accountInfo.data.slice(0, Math.min(208, accountInfo.data.length)).toString('hex'));
  console.log('');

  // Try to find inco_token_account at different possible offsets
  const possibleOffsets = [72, 104, 136, 168];
  for (const offset of possibleOffsets) {
    if (offset + 32 <= accountInfo.data.length) {
      const pubkeyBytes = accountInfo.data.slice(offset, offset + 32);
      const pubkey = new PublicKey(pubkeyBytes);
      console.log(`Offset ${offset}: ${pubkey.toBase58()}`);

      // Check if it's a valid Inco Token account
      try {
        const tokenInfo = await connection.getAccountInfo(pubkey);
        if (tokenInfo) {
          console.log(`  Owner: ${tokenInfo.owner.toBase58()}`);
          if (tokenInfo.owner.toBase58() === '4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N') {
            console.log('  ✅ Valid Inco Token account!');
          }
        }
      } catch (e) {}
    }
  }
}

main().catch(console.error);
