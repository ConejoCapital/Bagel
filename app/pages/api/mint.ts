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

// Inco Token Program ID (devnet)
const INCO_TOKEN_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID || 'HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22'
);

// Inco Lightning Program ID
const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');

// USDBagel Mint (devnet)
const USDBAGEL_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDBAGEL_MINT || 'A3G2NBGL7xH9T6BYwVkwRGsSYxtFPdg4HSThfTmV94ht'
);

// mint_to discriminator from Inco Token IDL
// This is the sighash of "global:mint_to"
const MINT_TO_DISCRIMINATOR = Buffer.from([241, 34, 48, 186, 37, 179, 123, 192]);

// Encrypt value for Inco (simulated FHE)
function encryptForInco(value: bigint): Buffer {
  const buffer = Buffer.alloc(16);
  buffer.writeBigUInt64LE(value, 0);
  const hash = createHash('sha256').update(buffer).update(Date.now().toString()).digest();
  hash.copy(buffer, 8, 0, 8);
  return buffer;
}

// Load mint authority from environment
function getMintAuthority(): Keypair | null {
  const mintAuthoritySecret = process.env.MINT_AUTHORITY_KEYPAIR;
  if (!mintAuthoritySecret) {
    return null;
  }

  try {
    // Decode base64 encoded secret key
    const secretKey = Buffer.from(mintAuthoritySecret, 'base64');
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch {
    return null;
  }
}

type ResponseData = {
  success: boolean;
  txid?: string;
  amount?: number;
  tokenAccount?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { amount, destinationAccount } = req.body;

    // Validate inputs
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (!destinationAccount) {
      return res.status(400).json({ success: false, error: 'Destination account required' });
    }

    let destination: PublicKey;
    try {
      destination = new PublicKey(destinationAccount);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid destination account' });
    }

    // Get mint authority
    const mintAuthority = getMintAuthority();
    if (!mintAuthority) {
      return res.status(500).json({
        success: false,
        error: 'Mint authority not configured. Set MINT_AUTHORITY_KEYPAIR environment variable.',
      });
    }

    // Connect to Solana
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Convert amount to lamports (9 decimals)
    const amountWithDecimals = BigInt(amount) * BigInt(1_000_000_000);

    // Encrypt the amount for Inco FHE
    const encryptedAmount = encryptForInco(amountWithDecimals);

    // Build instruction data: discriminator + ciphertext (bytes) + input_type (u8)
    // Anchor encodes bytes as: length (u32 LE) + data
    const inputType = Buffer.alloc(1);
    inputType.writeUInt8(0, 0); // 0 = hex-encoded ciphertext

    const lengthPrefix = Buffer.alloc(4);
    lengthPrefix.writeUInt32LE(encryptedAmount.length, 0);

    const instructionData = Buffer.concat([
      MINT_TO_DISCRIMINATOR,
      lengthPrefix,
      encryptedAmount,
      inputType,
    ]);

    // Build mint_to instruction
    const mintInstruction = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true },
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    // Build and sign transaction
    const transaction = new Transaction().add(mintInstruction);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = mintAuthority.publicKey;
    transaction.sign(mintAuthority);

    // Send transaction
    const txid = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    // Wait for confirmation
    await connection.confirmTransaction(
      {
        blockhash,
        lastValidBlockHeight,
        signature: txid,
      },
      'confirmed'
    );

    console.log(`Minted ${amount} USDBagel to ${destination.toBase58()}`);
    console.log(`Transaction: ${txid}`);

    return res.status(200).json({
      success: true,
      txid,
      amount,
      tokenAccount: destination.toBase58(),
    });
  } catch (error: any) {
    console.error('Mint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to mint tokens',
    });
  }
}
