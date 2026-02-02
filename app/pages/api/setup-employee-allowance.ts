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
const INCO_LIGHTNING_ENV = new PublicKey('5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj');
const INCO_LIGHTNING_SDK = new PublicKey('5SpaVk72hvLTpxwEgtxDRKNcohJrg2xUavvDnDnE9XV1');

// Payroll Program ID
const PAYROLL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PAYROLL_PROGRAM_ID || 'J11xMm4pLQ6BUEhTpNwF1Mh4UhzUJNZCcw52zvZJspK2'
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

// Extract u128 handle from 32-byte encrypted field (first 16 bytes, little-endian)
function extractHandle(bytes: Buffer): bigint {
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

// Derive Employee PDA
function getEmployeePDA(business: PublicKey, employeeIndex: number): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(BigInt(employeeIndex));
  return PublicKey.findProgramAddressSync(
    [Buffer.from('employee'), business.toBuffer(), indexBuffer],
    PAYROLL_PROGRAM_ID
  );
}

type ResponseData = {
  success: boolean;
  accruedAllowanceTxid?: string;
  salaryAllowanceTxid?: string;
  accruedHandle?: string;
  salaryHandle?: string;
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
    const { businessPDA, employeeIndex, employeeWallet } = req.body;

    if (!businessPDA || employeeIndex === undefined || !employeeWallet) {
      return res.status(400).json({
        success: false,
        error: 'businessPDA, employeeIndex, and employeeWallet required'
      });
    }

    const businessPubkey = new PublicKey(businessPDA);
    const employeeWalletPubkey = new PublicKey(employeeWallet);
    const empIndex = parseInt(employeeIndex);

    const mintAuthority = getMintAuthority();
    if (!mintAuthority) {
      return res.status(500).json({
        success: false,
        error: 'Mint authority not configured',
      });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Get Employee PDA
    const [employeePDA] = getEmployeePDA(businessPubkey, empIndex);
    console.log(`Employee PDA: ${employeePDA.toBase58()}`);

    // Fetch the employee account to get encrypted handles
    const accountInfo = await connection.getAccountInfo(employeePDA);
    if (!accountInfo?.data) {
      return res.status(400).json({
        success: false,
        error: 'Employee account not found',
      });
    }

    // Employee struct layout:
    // 0-8: discriminator
    // 8-40: business (32)
    // 40-48: employee_index (u64)
    // 48-80: encrypted_employee_id (32)
    // 80-112: encrypted_salary_rate (32)
    // 112-144: encrypted_accrued (32)
    const data = accountInfo.data as Buffer;
    const encryptedSalaryRate = data.slice(80, 112);
    const encryptedAccrued = data.slice(112, 144);

    const salaryHandle = extractHandle(encryptedSalaryRate.slice(0, 16) as Buffer);
    const accruedHandle = extractHandle(encryptedAccrued.slice(0, 16) as Buffer);

    console.log(`Salary Handle: ${salaryHandle.toString()}`);
    console.log(`Accrued Handle: ${accruedHandle.toString()}`);
    console.log(`Employee Wallet: ${employeeWalletPubkey.toBase58()}`);

    // Build Inco Lightning "allow" instruction data
    const ALLOW_DISCRIMINATOR = createHash('sha256').update('global:allow').digest().slice(0, 8);

    // Helper to build allow instruction
    const buildAllowInstruction = (handle: bigint, programId: PublicKey) => {
      const handleBuffer = Buffer.alloc(16);
      let h = handle;
      for (let i = 0; i < 16; i++) {
        handleBuffer[i] = Number(h & BigInt(0xff));
        h = h >> BigInt(8);
      }

      const instructionData = Buffer.concat([
        ALLOW_DISCRIMINATOR,
        handleBuffer,
        Buffer.from([1]), // is_allow = true
        employeeWalletPubkey.toBuffer(),
      ]);

      const [allowancePda] = getAllowancePda(handle, employeeWalletPubkey, programId);

      return {
        instruction: new TransactionInstruction({
          programId,
          keys: [
            { pubkey: allowancePda, isSigner: false, isWritable: true },
            { pubkey: mintAuthority.publicKey, isSigner: true, isWritable: true },
            { pubkey: employeeWalletPubkey, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: instructionData,
        }),
        allowancePda,
      };
    };

    let accruedAllowanceTxid = 'already_exists';
    let salaryAllowanceTxid = 'already_exists';

    // Set up allowance for accrued handle (both ENV and SDK)
    if (accruedHandle !== BigInt(0)) {
      const [accruedEnvPda] = getAllowancePda(accruedHandle, employeeWalletPubkey, INCO_LIGHTNING_ENV);
      const existingAccruedEnv = await connection.getAccountInfo(accruedEnvPda);

      if (!existingAccruedEnv) {
        console.log('Creating accrued allowances...');
        const { instruction: envInstr } = buildAllowInstruction(accruedHandle, INCO_LIGHTNING_ENV);
        const { instruction: sdkInstr } = buildAllowInstruction(accruedHandle, INCO_LIGHTNING_SDK);

        const transaction = new Transaction().add(envInstr).add(sdkInstr);
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = mintAuthority.publicKey;
        transaction.sign(mintAuthority);

        accruedAllowanceTxid = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: true,
          maxRetries: 3,
        });

        await connection.confirmTransaction(
          { blockhash, lastValidBlockHeight, signature: accruedAllowanceTxid },
          'confirmed'
        );
        console.log(`✅ Accrued allowances set up! Transaction: ${accruedAllowanceTxid}`);
      }
    }

    // Set up allowance for salary handle (both ENV and SDK)
    if (salaryHandle !== BigInt(0)) {
      const [salaryEnvPda] = getAllowancePda(salaryHandle, employeeWalletPubkey, INCO_LIGHTNING_ENV);
      const existingSalaryEnv = await connection.getAccountInfo(salaryEnvPda);

      if (!existingSalaryEnv) {
        console.log('Creating salary allowances...');
        const { instruction: envInstr } = buildAllowInstruction(salaryHandle, INCO_LIGHTNING_ENV);
        const { instruction: sdkInstr } = buildAllowInstruction(salaryHandle, INCO_LIGHTNING_SDK);

        const transaction = new Transaction().add(envInstr).add(sdkInstr);
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = mintAuthority.publicKey;
        transaction.sign(mintAuthority);

        salaryAllowanceTxid = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: true,
          maxRetries: 3,
        });

        await connection.confirmTransaction(
          { blockhash, lastValidBlockHeight, signature: salaryAllowanceTxid },
          'confirmed'
        );
        console.log(`✅ Salary allowances set up! Transaction: ${salaryAllowanceTxid}`);
      }
    }

    return res.status(200).json({
      success: true,
      accruedAllowanceTxid,
      salaryAllowanceTxid,
      accruedHandle: accruedHandle.toString(),
      salaryHandle: salaryHandle.toString(),
    });
  } catch (error: any) {
    console.error('Setup employee allowance error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to set up employee allowance',
    });
  }
}
