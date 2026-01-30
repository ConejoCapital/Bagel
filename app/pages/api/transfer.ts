import type { NextApiRequest, NextApiResponse } from 'next';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { createHash } from 'crypto';

// Inco Token Program ID (from IDL)
const INCO_TOKEN_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID || '4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N'
);

// Inco Lightning Program ID
const INCO_LIGHTNING_ID = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');

// Transfer discriminator from IDL
const TRANSFER_DISCRIMINATOR = Buffer.from([163, 52, 200, 231, 140, 3, 69, 186]);

// Encrypt value for Inco (simulated FHE)
function encryptForInco(value: bigint): Buffer {
  const buffer = Buffer.alloc(16);
  buffer.writeBigUInt64LE(value, 0);
  const hash = createHash('sha256').update(buffer).update(Date.now().toString()).digest();
  hash.copy(buffer, 8, 0, 8);
  return buffer;
}

// Load transfer authority (same as mint authority for now)
function getTransferAuthority(): Keypair | null {
  const authoritySecret = process.env.MINT_AUTHORITY_KEYPAIR;
  if (!authoritySecret) {
    return null;
  }

  try {
    const secretKey = Buffer.from(authoritySecret, 'base64');
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch {
    return null;
  }
}

type ResponseData = {
  success: boolean;
  txid?: string;
  amount?: number;
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
    const { amount, fromTokenAccount, toTokenAccount, senderPubkey } = req.body;

    // Validate inputs
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (!fromTokenAccount || !toTokenAccount) {
      return res.status(400).json({ success: false, error: 'Token accounts required' });
    }

    let fromAccount: PublicKey;
    let toAccount: PublicKey;
    let sender: PublicKey;
    try {
      fromAccount = new PublicKey(fromTokenAccount);
      toAccount = new PublicKey(toTokenAccount);
      sender = new PublicKey(senderPubkey);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid account addresses' });
    }

    // Get transfer authority
    const authority = getTransferAuthority();
    if (!authority) {
      return res.status(500).json({
        success: false,
        error: 'Transfer authority not configured.',
      });
    }

    // Connect to Solana
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Convert amount to lamports with 9 decimals
    const amountWithDecimals = BigInt(Math.floor(amount * 1_000_000_000));

    // Encrypt the amount for Inco FHE
    const encryptedAmount = encryptForInco(amountWithDecimals);

    // Build instruction data: discriminator + amount (bytes) + input_type (u8)
    const inputType = Buffer.alloc(1);
    inputType.writeUInt8(0, 0); // 0 = ciphertext

    const lengthPrefix = Buffer.alloc(4);
    lengthPrefix.writeUInt32LE(encryptedAmount.length, 0);

    const instructionData = Buffer.concat([
      TRANSFER_DISCRIMINATOR,
      lengthPrefix,
      encryptedAmount,
      inputType,
    ]);

    // Build transfer instruction
    // The authority (owner of from account) must sign
    const transferInstruction = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: fromAccount, isSigner: false, isWritable: true },
        { pubkey: toAccount, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: false }, // Use server authority
        { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    // Build and sign transaction
    const transaction = new Transaction().add(transferInstruction);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);

    // Send transaction
    const txid = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
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

    console.log(`Transferred ${amount} USDBagel`);
    console.log(`From: ${fromAccount.toBase58()}`);
    console.log(`To: ${toAccount.toBase58()}`);
    console.log(`Transaction: ${txid}`);

    return res.status(200).json({
      success: true,
      txid,
      amount,
    });
  } catch (error: any) {
    console.error('Transfer error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to transfer tokens',
    });
  }
}
