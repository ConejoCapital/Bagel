import { Connection, PublicKey } from '@solana/web3.js';
import { createHash } from 'crypto';

// Your wallet address
const WALLET_ADDRESS = process.argv[2];

if (!WALLET_ADDRESS) {
  console.error('Usage: tsx scripts/check-allowance.ts <wallet-address>');
  process.exit(1);
}

const wallet = new PublicKey(WALLET_ADDRESS);
// Use Helius RPC
const rpcUrl = 'https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af';
const connection = new Connection(rpcUrl, 'confirmed');

// Inco Token Program ID
const INCO_TOKEN_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID || '4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N'
);

// Both possible Lightning program IDs
const INCO_LIGHTNING_ENV = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj'); // From env
const INCO_LIGHTNING_SDK = new PublicKey('5SpaVk72hvLTpxwEgtxDRKNcohJrg2xUavvDnDnE9XV1'); // From SDK

const USDBAGEL_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDBAGEL_MINT || 'GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt'
);

const BAGEL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_BAGEL_PROGRAM_ID || 'AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj'
);

// Derive user token account PDA
function getUserTokenAccountPDA(owner: PublicKey, mint: PublicKey): [PublicKey, number] {
  const USER_TOKEN_SEED = Buffer.from('user_token');
  return PublicKey.findProgramAddressSync(
    [USER_TOKEN_SEED, owner.toBuffer(), mint.toBuffer()],
    BAGEL_PROGRAM_ID
  );
}

// Extract handle from account data
function extractHandle(data: Buffer): bigint {
  const bytes = data.slice(72, 88);
  let result = BigInt(0);
  for (let i = 15; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  return result;
}

// Derive allowance PDA
function getAllowancePda(handle: bigint, allowedAddress: PublicKey, programId: PublicKey): [PublicKey, number] {
  const handleBuffer = Buffer.alloc(16);
  let h = handle;
  for (let i = 0; i < 16; i++) {
    handleBuffer[i] = Number(h & BigInt(0xff));
    h = h >> BigInt(8);
  }
  return PublicKey.findProgramAddressSync(
    [handleBuffer, allowedAddress.toBuffer()],
    programId
  );
}

async function checkAllowance() {
  console.log('\n🔍 Checking Allowance Status\n');
  console.log('Wallet:', wallet.toBase58());
  console.log('RPC:', rpcUrl);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Get user's Bagel PDA
  const [userTokenPDA] = getUserTokenAccountPDA(wallet, USDBAGEL_MINT);
  console.log('1️⃣  User Token PDA:', userTokenPDA.toBase58());

  const pdaAccount = await connection.getAccountInfo(userTokenPDA);
  if (!pdaAccount) {
    console.log('   ❌ Bagel PDA not found - user needs to initialize first');
    return;
  }
  console.log('   ✅ Bagel PDA exists');

  // 2. Get Inco Token account from PDA
  const INCO_TOKEN_ACCOUNT_OFFSET = 8 + 32 + 32;
  const incoTokenAccountBytes = pdaAccount.data.slice(
    INCO_TOKEN_ACCOUNT_OFFSET,
    INCO_TOKEN_ACCOUNT_OFFSET + 32
  );
  const incoTokenAccount = new PublicKey(incoTokenAccountBytes);

  if (incoTokenAccount.equals(PublicKey.default)) {
    console.log('   ❌ Inco Token account not linked in Bagel PDA');
    return;
  }

  console.log('\n2️⃣  Inco Token Account:', incoTokenAccount.toBase58());

  const tokenAccount = await connection.getAccountInfo(incoTokenAccount);
  if (!tokenAccount?.data) {
    console.log('   ❌ Inco Token account not found on-chain');
    return;
  }
  console.log('   ✅ Inco Token account exists');

  // 3. Extract handle
  const handle = extractHandle(tokenAccount.data as Buffer);
  console.log('\n3️⃣  Encrypted Handle:', handle.toString());
  console.log('   Hex:', handle.toString(16).padStart(32, '0'));

  if (handle === BigInt(0)) {
    console.log('   ❌ Handle is zero - no balance to decrypt');
    return;
  }
  console.log('   ✅ Handle is valid (non-zero)');

  // 4. Check both possible allowance PDAs
  console.log('\n4️⃣  Allowance PDAs:');

  // Check with ENV program ID
  const [allowancePdaEnv] = getAllowancePda(handle, wallet, INCO_LIGHTNING_ENV);
  console.log('\n   Using ENV Lightning Program (5sjEb...):', INCO_LIGHTNING_ENV.toBase58());
  console.log('   Allowance PDA:', allowancePdaEnv.toBase58());

  const allowanceAccountEnv = await connection.getAccountInfo(allowancePdaEnv);
  if (allowanceAccountEnv) {
    console.log('   ✅ Allowance EXISTS with ENV program ID');
    console.log('      Owner:', allowanceAccountEnv.owner.toBase58());
    console.log('      Size:', allowanceAccountEnv.data.length, 'bytes');
  } else {
    console.log('   ❌ Allowance DOES NOT EXIST with ENV program ID');
  }

  // Check with SDK program ID
  const [allowancePdaSdk] = getAllowancePda(handle, wallet, INCO_LIGHTNING_SDK);
  console.log('\n   Using SDK Lightning Program (5SpaV...):', INCO_LIGHTNING_SDK.toBase58());
  console.log('   Allowance PDA:', allowancePdaSdk.toBase58());

  const allowanceAccountSdk = await connection.getAccountInfo(allowancePdaSdk);
  if (allowanceAccountSdk) {
    console.log('   ✅ Allowance EXISTS with SDK program ID');
    console.log('      Owner:', allowanceAccountSdk.owner.toBase58());
    console.log('      Size:', allowanceAccountSdk.data.length, 'bytes');
  } else {
    console.log('   ❌ Allowance DOES NOT EXIST with SDK program ID');
  }

  // 5. Conclusion
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Summary:\n');

  if (!allowanceAccountEnv && !allowanceAccountSdk) {
    console.log('❌ NO ALLOWANCE FOUND with either program ID');
    console.log('   → You need to set up an allowance before you can decrypt');
    console.log('   → Try minting tokens again, or call the setup-allowance API');
  } else if (allowanceAccountEnv && !allowanceAccountSdk) {
    console.log('✅ Allowance found with ENV program ID');
    console.log('   → This should work if covalidator uses ENV program ID');
  } else if (!allowanceAccountEnv && allowanceAccountSdk) {
    console.log('✅ Allowance found with SDK program ID');
    console.log('   → This should work if covalidator uses SDK program ID');
  } else {
    console.log('✅ Allowance found with BOTH program IDs');
    console.log('   → Decrypt should definitely work!');
  }

  console.log('');
}

checkAllowance().catch(console.error);
