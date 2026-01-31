import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { createHash } from 'crypto';

// Hardcoded values
const INCO_LIGHTNING_SDK = new PublicKey('5SpaVk72hvLTpxwEgtxDRKNcohJrg2xUavvDnDnE9XV1'); // SDK's program ID
const HANDLE = BigInt('290318754637647375126674509775105300905'); // From diagnostic
const OWNER = new PublicKey('Fcqa5QLsoXaX3Q5sLbdp1MiJfvAmewK3Nh3GSoPEcSqw'); // Your wallet

// Mint authority from env - REPLACE WITH YOUR OWN
const MINT_AUTHORITY_SECRET = process.env.MINT_AUTHORITY_KEYPAIR || '';

if (!MINT_AUTHORITY_SECRET) {
  console.error('Error: MINT_AUTHORITY_KEYPAIR environment variable not set');
  process.exit(1);
}

const rpcUrl = 'https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af';
const connection = new Connection(rpcUrl, 'confirmed');

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

async function setupAllowance() {
  console.log('\n🔧 Setting up allowance with SDK Lightning Program\n');
  console.log('Handle:', HANDLE.toString());
  console.log('Owner:', OWNER.toBase58());
  console.log('Lightning Program (SDK):', INCO_LIGHTNING_SDK.toBase58());

  // Decode mint authority
  const secretKey = Buffer.from(MINT_AUTHORITY_SECRET, 'base64');
  const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log('Mint Authority:', mintAuthority.publicKey.toBase58());

  // Derive allowance PDA with SDK program ID
  const [allowancePda] = getAllowancePda(HANDLE, OWNER, INCO_LIGHTNING_SDK);
  console.log('Allowance PDA:', allowancePda.toBase58());

  // Check if already exists
  const existing = await connection.getAccountInfo(allowancePda);
  if (existing) {
    console.log('\n✅ Allowance already exists!');
    console.log('   Owner:', existing.owner.toBase58());
    console.log('   Size:', existing.data.length, 'bytes');
    return;
  }

  console.log('\n📝 Creating allowance...');

  // Build "allow" instruction
  const ALLOW_DISCRIMINATOR = createHash('sha256').update('global:allow').digest().slice(0, 8);

  // Convert handle to 16-byte little-endian buffer
  const handleBuffer = Buffer.alloc(16);
  let h = HANDLE;
  for (let i = 0; i < 16; i++) {
    handleBuffer[i] = Number(h & BigInt(0xff));
    h = h >> BigInt(8);
  }

  // Instruction data: discriminator(8) + handle(16) + is_allow(1) + allowed_pubkey(32)
  const allowInstructionData = Buffer.concat([
    ALLOW_DISCRIMINATOR,
    handleBuffer,
    Buffer.from([1]), // is_allow = true
    OWNER.toBuffer(),
  ]);

  const allowInstruction = new TransactionInstruction({
    programId: INCO_LIGHTNING_SDK,
    keys: [
      { pubkey: allowancePda, isSigner: false, isWritable: true },
      { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true },
      { pubkey: OWNER, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: allowInstructionData,
  });

  const transaction = new Transaction().add(allowInstruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = mintAuthority.publicKey;
  transaction.sign(mintAuthority);

  console.log('Sending transaction...');
  const txid = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  });

  await connection.confirmTransaction(
    { blockhash, lastValidBlockHeight, signature: txid },
    'confirmed'
  );

  console.log('\n✅ Allowance created!');
  console.log('   Transaction:', txid);
  console.log('   PDA:', allowancePda.toBase58());
  console.log('\n🎉 Now decrypt should work!');
}

setupAllowance().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
