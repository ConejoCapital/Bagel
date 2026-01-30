import type { NextApiRequest, NextApiResponse } from 'next';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { createHash } from 'crypto';

// Inco Lightning Program IDs
const INCO_LIGHTNING_ENV = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj'); // For Inco Token Program
const INCO_LIGHTNING_SDK = new PublicKey('5SpaVk72hvLTpxwEgtxDRKNcohJrg2xUavvDnDnE9XV1'); // For covalidator

// Inco Token Program ID (from env)
const INCO_TOKEN_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID || '4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N'
);

// Derive allowance PDA for a handle and wallet
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

// Extract handle from account data (u128 at offset 72)
function extractHandle(data: Buffer): bigint {
  const bytes = data.slice(72, 88);
  let result = BigInt(0);
  for (let i = 15; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  return result;
}

// Load mint authority from environment
function getMintAuthority(): Keypair | null {
  const mintAuthoritySecret = process.env.MINT_AUTHORITY_KEYPAIR;
  if (!mintAuthoritySecret) {
    return null;
  }
  try {
    const secretKey = Buffer.from(mintAuthoritySecret, 'base64');
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch {
    return null;
  }
}

type ResponseData = {
  success: boolean;
  txid?: string;
  sdkTxid?: string;
  allowancePda?: string;
  handle?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { tokenAccount, ownerAddress } = req.body;

    if (!tokenAccount || !ownerAddress) {
      return res.status(400).json({
        success: false,
        error: 'tokenAccount and ownerAddress required'
      });
    }

    const tokenAccountPubkey = new PublicKey(tokenAccount);
    const owner = new PublicKey(ownerAddress);

    const mintAuthority = getMintAuthority();
    if (!mintAuthority) {
      return res.status(500).json({
        success: false,
        error: 'Mint authority not configured',
      });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Fetch the token account to get the handle
    const accountInfo = await connection.getAccountInfo(tokenAccountPubkey);
    if (!accountInfo?.data) {
      return res.status(400).json({
        success: false,
        error: 'Token account not found',
      });
    }

    const handle = extractHandle(accountInfo.data as Buffer);
    console.log(`Handle (decimal): ${handle.toString()}`);
    console.log(`Inco Lightning Program ID (ENV): ${INCO_LIGHTNING_ENV.toBase58()}`);
    console.log(`Inco Lightning Program ID (SDK): ${INCO_LIGHTNING_SDK.toBase58()}`);

    if (handle === BigInt(0)) {
      return res.status(400).json({
        success: false,
        error: 'Handle is zero - no balance to decrypt',
      });
    }

    // Derive the allowance PDA using the configured Inco Lightning program
    const [allowancePda] = getAllowancePda(handle, owner, INCO_LIGHTNING_ENV);
    console.log(`Allowance PDA (using ${INCO_LIGHTNING_ENV.toBase58()}): ${allowancePda.toBase58()}`);
    console.log(`Owner: ${owner.toBase58()}`);

    // Also show what the PDA would be with the alternate program ID for debugging
    const altProgramId = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
    if (!altProgramId.equals(INCO_LIGHTNING_ENV)) {
      const [altPda] = getAllowancePda(handle, owner, altProgramId);
      console.log(`Alternate PDA (using 5sjE...): ${altPda.toBase58()}`);
    }

    // Build Inco Lightning "allow" instruction data (needed for both ENV and SDK)
    // Discriminator: first 8 bytes of sha256("global:allow")
    const ALLOW_DISCRIMINATOR = createHash('sha256').update('global:allow').digest().slice(0, 8);
    console.log('Allow discriminator:', ALLOW_DISCRIMINATOR.toString('hex'));

    // Convert handle to 16-byte little-endian buffer
    const handleBuffer = Buffer.alloc(16);
    let h = handle;
    for (let i = 0; i < 16; i++) {
      handleBuffer[i] = Number(h & BigInt(0xff));
      h = h >> BigInt(8);
    }

    // Instruction data: discriminator(8) + handle(16) + is_allow(1) + allowed_pubkey(32)
    const allowInstructionData = Buffer.concat([
      ALLOW_DISCRIMINATOR,
      handleBuffer,
      Buffer.from([1]), // is_allow = true
      owner.toBuffer(),
    ]);

    // Check if ENV allowance already exists
    const existingAllowance = await connection.getAccountInfo(allowancePda);
    let txid: string;

    if (existingAllowance) {
      console.log('ENV Allowance already exists!');
      txid = 'already_exists';
    } else {
      const allowInstruction = new TransactionInstruction({
        programId: INCO_LIGHTNING_ENV,
        keys: [
          { pubkey: allowancePda, isSigner: false, isWritable: true },
          { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true },
          { pubkey: owner, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: allowInstructionData,
      });

      const transaction = new Transaction().add(allowInstruction);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = mintAuthority.publicKey;
      transaction.sign(mintAuthority);

      console.log('Sending allow transaction...');
      txid = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true, // Skip preflight for Inco instructions
        maxRetries: 3,
      });

      await connection.confirmTransaction(
        { blockhash, lastValidBlockHeight, signature: txid },
        'confirmed'
      );

      console.log(`✅ ENV Allowance set up! Transaction: ${txid}`);
    }

    // CRITICAL: Also create SDK allowance for covalidator
    let sdkTxid: string | undefined;
    try {
      const [sdkAllowancePda] = getAllowancePda(handle, owner, INCO_LIGHTNING_SDK);
      console.log(`SDK Allowance PDA: ${sdkAllowancePda.toBase58()}`);

      const existingSdkAllowance = await connection.getAccountInfo(sdkAllowancePda);
      if (!existingSdkAllowance) {
        console.log('Creating SDK allowance for covalidator...');

        const sdkAllowInstruction = new TransactionInstruction({
          programId: INCO_LIGHTNING_SDK,
          keys: [
            { pubkey: sdkAllowancePda, isSigner: false, isWritable: true },
            { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: allowInstructionData,
        });

        const sdkTransaction = new Transaction().add(sdkAllowInstruction);
        const sdkBlockhash = await connection.getLatestBlockhash('confirmed');
        sdkTransaction.recentBlockhash = sdkBlockhash.blockhash;
        sdkTransaction.feePayer = mintAuthority.publicKey;
        sdkTransaction.sign(mintAuthority);

        sdkTxid = await connection.sendRawTransaction(sdkTransaction.serialize(), {
          skipPreflight: true,
          maxRetries: 3,
        });

        await connection.confirmTransaction(
          { blockhash: sdkBlockhash.blockhash, lastValidBlockHeight: sdkBlockhash.lastValidBlockHeight, signature: sdkTxid },
          'confirmed'
        );

        console.log(`✅ SDK Allowance set up! Transaction: ${sdkTxid}`);
      } else {
        console.log('SDK allowance already exists');
        sdkTxid = 'already_exists';
      }
    } catch (sdkErr: any) {
      console.error('⚠️ Failed to create SDK allowance:', sdkErr.message);
      console.error('   Decrypt may not work until SDK allowance is set up');
    }

    return res.status(200).json({
      success: true,
      txid,
      sdkTxid,
      allowancePda: allowancePda.toBase58(),
      handle: handle.toString(),
    });
  } catch (error: any) {
    console.error('Setup allowance error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to set up allowance',
    });
  }
}
