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
import { encryptValue } from '@inco/solana-sdk/encryption';
import { hexToBuffer } from '@inco/solana-sdk/utils';

// Inco Token Program ID (devnet) - from IDL
const INCO_TOKEN_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID || '4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N'
);

// Bagel Program ID (devnet)
const BAGEL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_BAGEL_PROGRAM_ID || 'AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj'
);

// Inco Lightning Program IDs
const INCO_LIGHTNING_ENV = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj'); // For Inco Token Program
const INCO_LIGHTNING_SDK = new PublicKey('5SpaVk72hvLTpxwEgtxDRKNcohJrg2xUavvDnDnE9XV1'); // For covalidator

// USDBagel Mint (devnet) - Created under correct Inco Token Program
const USDBAGEL_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDBAGEL_MINT || 'GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt'
);

// PDA seed for user token account
const USER_TOKEN_SEED = Buffer.from('user_token');

// Discriminators from IDL
const MINT_TO_DISCRIMINATOR = Buffer.from([241, 34, 48, 186, 37, 179, 123, 192]);
const INIT_ACCOUNT_DISCRIMINATOR = Buffer.from([74, 115, 99, 93, 197, 69, 103, 7]);
const INIT_USER_TOKEN_ACCOUNT_DISCRIMINATOR = Buffer.from([227, 229, 112, 158, 27, 71, 169, 75]);
const SET_INCO_TOKEN_ACCOUNT_DISCRIMINATOR = Buffer.from([9, 100, 150, 220, 252, 148, 47, 131]);

// Derive user token account PDA
function getUserTokenAccountPDA(owner: PublicKey, mint: PublicKey = USDBAGEL_MINT): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_TOKEN_SEED, owner.toBuffer(), mint.toBuffer()],
    BAGEL_PROGRAM_ID
  );
}

// Derive allowance PDA for a handle and wallet (grants decryption permission)
function getAllowancePda(handle: bigint, allowedAddress: PublicKey, programId: PublicKey = INCO_LIGHTNING_ENV): [PublicKey, number] {
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

// Extract handle from account data bytes (little-endian u128 at offset 72-88)
function extractHandle(data: Buffer): bigint {
  const bytes = data.slice(72, 88);
  let result = BigInt(0);
  for (let i = 15; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  return result;
}

// Encrypt value for Inco using real SDK
// Returns raw bytes for inputType=1 format (following SDK documentation pattern)
async function encryptForInco(value: bigint): Promise<Buffer> {
  console.log(`Encrypting value: ${value} using Inco SDK...`);
  const encryptedHex = await encryptValue(value);
  console.log(`Encrypted ciphertext (hex): ${encryptedHex.slice(0, 64)}...`);
  console.log(`Encrypted hex length: ${encryptedHex.length} chars`);
  // Convert hex to raw bytes using SDK utility (inputType=1 = raw bytes)
  const buffer = hexToBuffer(encryptedHex);
  console.log(`Encrypted buffer length: ${buffer.length} bytes`);
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
  initTxid?: string; // Transaction ID for account initialization (if new account)
  amount?: number;
  tokenAccount?: string;
  handleInfo?: { decimal: string; hex: string } | null;
  allowanceSetUp?: boolean; // Whether allowance was set up during mint
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

    // Log program IDs for debugging
    console.log('=== Program IDs ===');
    console.log(`INCO_TOKEN_PROGRAM_ID: ${INCO_TOKEN_PROGRAM_ID.toBase58()}`);
    console.log(`INCO_LIGHTNING_ENV: ${INCO_LIGHTNING_ENV.toBase58()}`);
    console.log(`BAGEL_PROGRAM_ID: ${BAGEL_PROGRAM_ID.toBase58()}`);
    console.log(`USDBAGEL_MINT: ${USDBAGEL_MINT.toBase58()}`);
    console.log(`Mint Authority: ${mintAuthority.publicKey.toBase58()}`);

    // Derive user's Bagel PDA (on-chain registry)
    const [userTokenPDA] = getUserTokenAccountPDA(destination, USDBAGEL_MINT);

    // Check if user's Bagel PDA already exists and if inco_token_account is set
    const pdaAccountInfo = await connection.getAccountInfo(userTokenPDA);
    const pdaExists = pdaAccountInfo !== null;

    // Check if inco_token_account is already set in the PDA
    let existingIncoTokenAccount: PublicKey | null = null;
    if (pdaExists && pdaAccountInfo?.data) {
      // UserTokenAccount layout: discriminator(8) + owner(32) + mint(32) + inco_token_account(32)
      const INCO_TOKEN_ACCOUNT_OFFSET = 8 + 32 + 32;
      const incoTokenAccountBytes = pdaAccountInfo.data.slice(
        INCO_TOKEN_ACCOUNT_OFFSET,
        INCO_TOKEN_ACCOUNT_OFFSET + 32
      );
      const incoTokenAccountPubkey = new PublicKey(incoTokenAccountBytes);
      // Check if it's not the default (all zeros)
      if (!incoTokenAccountPubkey.equals(PublicKey.default)) {
        existingIncoTokenAccount = incoTokenAccountPubkey;
        console.log(`Existing Inco Token account found: ${existingIncoTokenAccount.toBase58()}`);
      }
    }

    // Generate a new Inco Token account for this user (or use existing)
    const tokenAccountKeypair = Keypair.generate();
    const tokenAccount = existingIncoTokenAccount || tokenAccountKeypair.publicKey;

    // Convert amount to lamports (9 decimals)
    const amountWithDecimals = BigInt(amount) * BigInt(1_000_000_000);

    // Encrypt the amount for Inco FHE (using real SDK)
    const encryptedAmount = await encryptForInco(amountWithDecimals);

    // Step 1: Initialize Bagel PDA if it doesn't exist
    // Note: This needs to be signed by the user, so we skip it here
    // The frontend should call initializeUserTokenAccountPDA first
    // For now, we'll just link the account if PDA exists

    // Track if we need to create a new token account
    const isNewTokenAccount = !existingIncoTokenAccount;
    let initTxid: string | undefined;

    // Step 2: Initialize Inco Token account (only if creating new)
    // For new accounts, we init first in a separate tx, then mint with allowance
    if (isNewTokenAccount) {
      console.log(`Creating new Inco Token account: ${tokenAccount.toBase58()}`);

      // Build and send init account transaction first
      const initTransaction = new Transaction();
      const initAccountInstruction = new TransactionInstruction({
        programId: INCO_TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: tokenAccount, isSigner: true, isWritable: true },
          { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false },
          { pubkey: destination, isSigner: false, isWritable: false }, // owner
          { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: INCO_LIGHTNING_ENV, isSigner: false, isWritable: false },
        ],
        data: INIT_ACCOUNT_DISCRIMINATOR,
      });
      initTransaction.add(initAccountInstruction);

      const initBlockhash = await connection.getLatestBlockhash('confirmed');
      initTransaction.recentBlockhash = initBlockhash.blockhash;
      initTransaction.feePayer = mintAuthority.publicKey;
      initTransaction.sign(mintAuthority, tokenAccountKeypair);

      initTxid = await connection.sendRawTransaction(initTransaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction(
        { blockhash: initBlockhash.blockhash, lastValidBlockHeight: initBlockhash.lastValidBlockHeight, signature: initTxid },
        'confirmed'
      );
      console.log(`✅ Inco Token account initialized: ${initTxid}`);

      // Wait a bit for the account to be available
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log(`Using existing Inco Token account: ${tokenAccount.toBase58()}`);
    }

    // Build main transaction (mint and optionally set_inco_token_account)
    const transaction = new Transaction();

    // Step 3: Build mint instruction data
    const inputType = Buffer.alloc(1);
    inputType.writeUInt8(1, 0); // 1 = raw bytes (from hexToBuffer)

    const lengthPrefix = Buffer.alloc(4);
    lengthPrefix.writeUInt32LE(encryptedAmount.length, 0);

    const mintInstructionData = Buffer.concat([
      MINT_TO_DISCRIMINATOR,
      lengthPrefix,
      encryptedAmount,
      inputType,
    ]);

    // Build base mint instruction keys (without remaining_accounts for now)
    const mintInstructionKeys = [
      { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: true },
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true },
      { pubkey: INCO_LIGHTNING_ENV, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    // Simulate mint to get the resulting handle for allowance PDA derivation
    // (Account is guaranteed to exist now - either it existed before or we just created it)
    let allowancePda: PublicKey | null = null;
    console.log('Simulating mint to get resulting handle for allowance...');

    try {
      const simMintInstruction = new TransactionInstruction({
        programId: INCO_TOKEN_PROGRAM_ID,
        keys: mintInstructionKeys,
        data: mintInstructionData,
      });

      const simTransaction = new Transaction().add(simMintInstruction);
      const simBlockhash = await connection.getLatestBlockhash('confirmed');
      simTransaction.recentBlockhash = simBlockhash.blockhash;
      simTransaction.feePayer = mintAuthority.publicKey;
      simTransaction.sign(mintAuthority);

      const simResult = await connection.simulateTransaction(
        simTransaction,
        undefined,
        [tokenAccount] // Request account state after simulation
      );

      if (simResult.value.err) {
        console.error('Simulation failed:', simResult.value.err);
        console.error('Simulation logs:', simResult.value.logs);
        console.log('Proceeding without allowance setup...');
      } else if (simResult.value.accounts && simResult.value.accounts[0]) {
        const accountData = simResult.value.accounts[0].data;
        if (accountData && Array.isArray(accountData) && accountData[0]) {
          const dataBuffer = Buffer.from(accountData[0], 'base64');
          const simulatedHandle = extractHandle(dataBuffer);
          console.log(`Simulated handle: ${simulatedHandle.toString()}`);

          if (simulatedHandle !== BigInt(0)) {
            // Derive allowance PDA from simulated handle
            [allowancePda] = getAllowancePda(simulatedHandle, destination);
            console.log(`Derived allowance PDA: ${allowancePda.toBase58()}`);
            console.log(`Owner for allowance: ${destination.toBase58()}`);
          } else {
            console.log('Simulated handle is zero - this is unexpected');
          }
        } else {
          console.log('No account data in simulation result');
        }
      } else {
        console.log('No accounts in simulation result');
      }
    } catch (simError: any) {
      console.error('Simulation error:', simError.message);
      console.log('Proceeding without allowance setup...');
    }

    // Build final mint instruction with or without remaining_accounts
    const finalMintKeys = [...mintInstructionKeys];

    if (allowancePda) {
      // Add remaining_accounts for allowance setup
      finalMintKeys.push(
        { pubkey: allowancePda, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: false }
      );
      console.log('Mint instruction includes allowance setup via remaining_accounts');
    }

    const mintInstruction = new TransactionInstruction({
      programId: INCO_TOKEN_PROGRAM_ID,
      keys: finalMintKeys,
      data: mintInstructionData,
    });
    transaction.add(mintInstruction);
    console.log(`Built mint instruction (allowance: ${allowancePda ? 'included' : 'not included'})`);

    // Step 4: Link Inco Token account to Bagel PDA (if PDA exists and inco_token_account not yet set)
    if (pdaExists && !existingIncoTokenAccount) {
      // Build set_inco_token_account instruction
      // Data: discriminator (8 bytes) + inco_token_account pubkey (32 bytes)
      const setIncoAccountData = Buffer.concat([
        SET_INCO_TOKEN_ACCOUNT_DISCRIMINATOR,
        tokenAccount.toBuffer(),
      ]);

      const setIncoAccountInstruction = new TransactionInstruction({
        programId: BAGEL_PROGRAM_ID,
        keys: [
          { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true }, // authority
          { pubkey: destination, isSigner: false, isWritable: false }, // owner
          { pubkey: USDBAGEL_MINT, isSigner: false, isWritable: false }, // mint
          { pubkey: userTokenPDA, isSigner: false, isWritable: true }, // user_token_account
        ],
        data: setIncoAccountData,
      });
      transaction.add(setIncoAccountInstruction);
      console.log(`Will link Inco Token account to Bagel PDA: ${userTokenPDA.toBase58()}`);
    } else if (pdaExists && existingIncoTokenAccount) {
      console.log(`Inco Token account already linked to Bagel PDA, skipping SetIncoTokenAccount`);
    } else {
      console.log(`Bagel PDA doesn't exist yet for ${destination.toBase58()}`);
      console.log(`User should call initializeUserTokenAccountPDA first, then mint again`);
    }

    // Sign and send transaction
    // Note: tokenAccountKeypair is no longer needed here since init happens separately
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

    console.log(`✅ Minted ${amount} USDBagel to ${destination.toBase58()}`);
    console.log(`Inco Token Account: ${tokenAccount.toBase58()}`);
    console.log(`Bagel PDA: ${userTokenPDA.toBase58()}`);
    console.log(`Transaction: ${txid}`);

    // PHASE 2: Verify mint and read handle for response
    console.log('\n📊 Phase 2: Verifying mint result...');

    let handleInfo: { decimal: string; hex: string } | null = null;
    try {
      // Fetch the token account to get the actual handle
      const tokenAccountInfo = await connection.getAccountInfo(tokenAccount);
      if (tokenAccountInfo?.data) {
        // IncoAccount layout: discriminator(8) + mint(32) + owner(32) + amount(Euint128 = u128 at offset 72)
        const handle = extractHandle(tokenAccountInfo.data as Buffer);
        console.log(`Actual handle (decimal): ${handle.toString()}`);

        // Convert to hex
        const handleBuffer = Buffer.alloc(16);
        let h = handle;
        for (let i = 0; i < 16; i++) {
          handleBuffer[i] = Number(h & BigInt(0xff));
          h = h >> BigInt(8);
        }
        const handleHex = handleBuffer.toString('hex');
        console.log(`Actual handle (hex): ${handleHex}`);

        if (handle !== BigInt(0)) {
          // Derive the allowance PDA for reference
          const [actualAllowancePda] = getAllowancePda(handle, destination);
          console.log(`Allowance PDA: ${actualAllowancePda.toBase58()}`);
          console.log(`Owner (destination): ${destination.toBase58()}`);

          handleInfo = {
            decimal: handle.toString(),
            hex: handleHex,
          };

          if (allowancePda) {
            console.log('✅ Allowance (ENV) was set up during mint via remaining_accounts');
          } else {
            console.log('⚠️ Allowance (ENV) was NOT set up during mint');
          }

          // CRITICAL: Also create allowance with SDK program ID for covalidator
          try {
            const [sdkAllowancePda] = getAllowancePda(handle, destination, INCO_LIGHTNING_SDK);
            const existingSdkAllowance = await connection.getAccountInfo(sdkAllowancePda);

            if (!existingSdkAllowance) {
              console.log('📝 Creating SDK allowance for covalidator...');

              const ALLOW_DISCRIMINATOR = createHash('sha256').update('global:allow').digest().slice(0, 8);
              const handleBuf = Buffer.alloc(16);
              let h2 = handle;
              for (let i = 0; i < 16; i++) {
                handleBuf[i] = Number(h2 & BigInt(0xff));
                h2 = h2 >> BigInt(8);
              }

              const allowData = Buffer.concat([
                ALLOW_DISCRIMINATOR,
                handleBuf,
                Buffer.from([1]),
                destination.toBuffer(),
              ]);

              const sdkAllowInstruction = new TransactionInstruction({
                programId: INCO_LIGHTNING_SDK,
                keys: [
                  { pubkey: sdkAllowancePda, isSigner: false, isWritable: true },
                  { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true },
                  { pubkey: destination, isSigner: false, isWritable: false },
                  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                data: allowData,
              });

              const sdkTx = new Transaction().add(sdkAllowInstruction);
              const sdkBlockhash = await connection.getLatestBlockhash('confirmed');
              sdkTx.recentBlockhash = sdkBlockhash.blockhash;
              sdkTx.feePayer = mintAuthority.publicKey;
              sdkTx.sign(mintAuthority);

              const sdkTxid = await connection.sendRawTransaction(sdkTx.serialize(), {
                skipPreflight: true,
                maxRetries: 3,
              });

              await connection.confirmTransaction({
                blockhash: sdkBlockhash.blockhash,
                lastValidBlockHeight: sdkBlockhash.lastValidBlockHeight,
                signature: sdkTxid,
              }, 'confirmed');

              console.log('✅ SDK allowance created for covalidator!');
            } else {
              console.log('✅ SDK allowance already exists');
            }
          } catch (sdkAllowErr: any) {
            console.error('⚠️ Failed to create SDK allowance:', sdkAllowErr.message);
            console.error('   Decrypt may not work until SDK allowance is set up');
          }
        } else {
          console.log('⚠️ Handle is zero - check if mint succeeded');
        }
      }
    } catch (debugError: any) {
      console.error('Verification phase failed:', debugError.message);
    }

    return res.status(200).json({
      success: true,
      txid,
      initTxid, // Only present for new accounts
      amount,
      tokenAccount: tokenAccount.toBase58(),
      handleInfo,
      allowanceSetUp: allowancePda !== null,
    });
  } catch (error: any) {
    console.error('Mint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to mint tokens',
    });
  }
}
