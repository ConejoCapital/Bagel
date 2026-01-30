import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';

// The CORRECT Inco Token Program ID that the covalidator monitors
const INCO_TOKEN_PROGRAM_ID = new PublicKey('4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N');
const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');

// Discriminators from the Inco template IDL
// initialize_mint discriminator from IDL: [209, 42, 195, 4, 129, 85, 209, 44]
const INITIALIZE_MINT_DISCRIMINATOR = Buffer.from([209, 42, 195, 4, 129, 85, 209, 44]);

async function createMint() {
  // Mint authority from env (base64 encoded)
  const mintAuthoritySecret = process.env.MINT_AUTHORITY_KEYPAIR;
  if (!mintAuthoritySecret) {
    console.error('MINT_AUTHORITY_KEYPAIR not set');
    process.exit(1);
  }

  const secretKey = Buffer.from(mintAuthoritySecret, 'base64');
  const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log('Mint Authority:', mintAuthority.publicKey.toBase58());

  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  // Generate new mint keypair
  const mintKeypair = Keypair.generate();
  console.log('New Mint Address:', mintKeypair.publicKey.toBase58());

  // Build initialize_mint instruction
  // Args: decimals (u8), mint_authority (Pubkey), freeze_authority (Option<Pubkey>)
  const decimals = 9; // 9 decimals like SOL

  // Instruction data format:
  // - discriminator: 8 bytes
  // - decimals: 1 byte (u8)
  // - mint_authority: 32 bytes (Pubkey)
  // - freeze_authority: 1 byte (Some=1/None=0) + 32 bytes if Some
  const instructionData = Buffer.alloc(8 + 1 + 32 + 1 + 32);
  let offset = 0;

  // Discriminator
  INITIALIZE_MINT_DISCRIMINATOR.copy(instructionData, offset);
  offset += 8;

  // Decimals
  instructionData.writeUInt8(decimals, offset);
  offset += 1;

  // Mint authority pubkey
  mintAuthority.publicKey.toBuffer().copy(instructionData, offset);
  offset += 32;

  // Freeze authority: Some(mint_authority)
  instructionData.writeUInt8(1, offset); // 1 = Some
  offset += 1;
  mintAuthority.publicKey.toBuffer().copy(instructionData, offset);

  const instruction = new TransactionInstruction({
    programId: INCO_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true }, // mint
      { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true }, // payer
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = mintAuthority.publicKey;
  transaction.sign(mintAuthority, mintKeypair);

  console.log('Sending transaction...');
  const txid = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  await connection.confirmTransaction(
    { blockhash, lastValidBlockHeight, signature: txid },
    'confirmed'
  );

  console.log('\n✅ New USDBagel Mint Created!');
  console.log('Transaction:', txid);
  console.log('\n📋 Update your .env.local with:');
  console.log(`NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID=4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N`);
  console.log(`NEXT_PUBLIC_USDBAGEL_MINT=${mintKeypair.publicKey.toBase58()}`);

  // Save mint keypair for backup
  console.log('\n🔑 Mint keypair (save this):');
  console.log(Buffer.from(mintKeypair.secretKey).toString('base64'));
}

createMint().catch(console.error);
