/**
 * BagelClient: Clean API Layer for Frontend
 * 
 * Abstracts away all Anchor/Inco/ShadowWire complexity.
 * Provides strongly-typed methods for the UI.
 */

import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  getAccount
} from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { web3 } from '@coral-xyz/anchor';
import * as bagelClient from './bagel-client';
import { ShadowWireClient } from './shadowwire';

// Program ID (with confidential tokens enabled by default)
const BAGEL_PROGRAM_ID = new PublicKey('AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj');

/**
 * BagelClient: High-level API for Bagel operations
 */
export class BagelClient {
  private connection: Connection;
  private wallet: WalletContextState;
  private shadowwireClient: ShadowWireClient;

  constructor(connection: Connection, wallet: WalletContextState) {
    this.connection = connection;
    this.wallet = wallet;
    
    // Initialize ShadowWire client (only needs debug flag)
    // The SDK handles RPC connection internally via wallet adapter
    this.shadowwireClient = new ShadowWireClient({
      debug: process.env.NODE_ENV === 'development',
    });
  }

  /**
   * Initialize employer vault (register business and add employee)
   * 
   * @param employeeAddress - Employee's wallet address
   * @param salaryPerSecond - Salary in lamports per second
   * @returns Transaction signature (for backward compatibility, returns txid string)
   * 
   * **PRIVACY:** This method encrypts the salary via Inco Lightning on-chain.
   */
  async initEmployer(
    employeeAddress: string,
    salaryPerSecond: number
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('Initializing employer vault...');
    console.log('   Employee:', employeeAddress);
    console.log('   Salary:', salaryPerSecond, 'lamports/second');
    console.log('   [ENCRYPTED] Salary will be encrypted via Inco Lightning before on-chain storage');

    // Step 1: Register business (if not already registered)
    let entryIndex: number;
    try {
      entryIndex = await bagelClient.getCurrentBusinessIndex(this.connection);
      console.log('   Business already registered with index:', entryIndex);
    } catch {
      // Business not registered, register it
      console.log('   Registering new business...');
      const result = await bagelClient.registerBusiness(this.connection, this.wallet);
      entryIndex = result.entryIndex;
      console.log('   Business registered with index:', entryIndex);
    }

    // Step 2: Add employee
    console.log('   Adding employee...');
    const employeeResult = await bagelClient.addEmployee(
      this.connection,
      this.wallet,
      entryIndex,
      new PublicKey(employeeAddress),
      salaryPerSecond
    );

    console.log('[SUCCESS] Employer vault initialized');
    console.log('   Entry Index:', entryIndex);
    console.log('   Employee Index:', employeeResult.employeeIndex);
    console.log('   [ENCRYPTED] Salary stored as Inco Euint128 ciphertext on-chain');
    
    return employeeResult.txid;
  }

  /**
   * Deposit dough to business
   * 
   * @param employeeAddress - Employee address (for backward compatibility, but entryIndex is used)
   * @param amountSOL - Amount in SOL (will be converted to lamports)
   * @returns Transaction signature
   */
  async depositDough(
    employeeAddress: string,
    amountSOL: number
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Get entry index (business must be registered first)
    let businessEntryIndex: number;
    try {
      businessEntryIndex = await bagelClient.getCurrentBusinessIndex(this.connection);
    } catch {
      throw new Error('Business not registered. Please initialize employer vault first.');
    }

    const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
    console.log('Depositing to Master Vault...');
    console.log('   Amount:', amountSOL, 'SOL (', amountLamports, 'lamports)');
    console.log('   Business Entry Index:', businessEntryIndex);

    // Check balance
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    const requiredBalance = amountLamports + (0.01 * LAMPORTS_PER_SOL); // + fees

    if (balance < requiredBalance) {
      throw new Error(
        `Insufficient balance. Required: ${requiredBalance / LAMPORTS_PER_SOL} SOL, ` +
        `Available: ${balance / LAMPORTS_PER_SOL} SOL`
      );
    }

    // Get token accounts for confidential transfer (from on-chain Bagel PDA)
    const depositorTokenAccount = await bagelClient.resolveUserTokenAccount(
      this.connection,
      this.wallet.publicKey,
      bagelClient.USDBAGEL_MINT
    );

    if (!depositorTokenAccount) {
      throw new Error('No token account found. Please mint USDBagel tokens first.');
    }
    const vaultTokenAccountStr = process.env.NEXT_PUBLIC_VAULT_TOKEN_ACCOUNT || 'C2nZ8CK2xqRJj7uQuipmi111hqXf3sRK2Zq4aQhmSYJu';
    const vaultTokenAccount = new PublicKey(vaultTokenAccountStr);

    const signature = await bagelClient.deposit(
      this.connection,
      this.wallet,
      businessEntryIndex,
      amountLamports,
      depositorTokenAccount,
      vaultTokenAccount
    );

    console.log('[SUCCESS] Deposit complete:', signature);
    return signature;
  }

  /**
   * Wrap native SOL to WSOL (helper for token operations)
   * 
   * @param amountLamports - Amount in lamports to wrap
   * @returns Transaction signature and WSOL token account
   */
  async wrapSOL(amountLamports: number): Promise<{ signature: string; wsolAccount: PublicKey }> {
    if (!this.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('Wrapping SOL to WSOL...');
    console.log('   Amount:', amountLamports / LAMPORTS_PER_SOL, 'SOL');

    // Get or create WSOL ATA
    const wsolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      this.wallet.publicKey
    );

    const transaction = new Transaction();

    // Check if ATA exists
    try {
      await getAccount(this.connection, wsolAccount);
      console.log('   WSOL ATA already exists');
    } catch {
      // Create ATA if it doesn't exist
      console.log('   Creating WSOL ATA...');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.wallet.publicKey,
          wsolAccount,
          this.wallet.publicKey,
          NATIVE_MINT
        )
      );
    }

    // Transfer SOL to WSOL account
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: wsolAccount,
        lamports: amountLamports,
      })
    );

    // Sync native (wrap)
    transaction.add(createSyncNativeInstruction(wsolAccount));

    // Send transaction
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.wallet.publicKey;

    const signature = await this.wallet.sendTransaction(transaction, this.connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    await this.connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    }, 'confirmed');

    // Verify transaction actually succeeded
    const { verifyTransactionSuccess } = await import('./transaction-utils');
    const verification = await verifyTransactionSuccess(this.connection, signature);
    
    if (!verification.success) {
      throw new Error(`Transaction failed: ${verification.error}`);
    }

    console.log('[SUCCESS] SOL wrapped to WSOL:', signature);
    return { signature, wsolAccount };
  }

  /**
   * Bake payroll (register business and add employee)
   * 
   * @param employeeAddress - Employee's wallet address
   * @param salaryPerSecond - Salary in lamports per second
   * @returns Transaction signature
   */
  async bakePayroll(
    employeeAddress: string,
    salaryPerSecond: number
  ): Promise<string> {
    // Use initEmployer which does the same thing
    return await this.initEmployer(employeeAddress, salaryPerSecond);
  }

  /**
   * Withdraw salary (handles ShadowWire proof + MagicBlock undelegate + withdrawal)
   * 
   * @param employerAddress - Employer address (for backward compatibility, but indices are needed)
   * @returns Transaction signature
   */
  async withdrawSalary(
    employerAddress: string
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('Withdrawing salary...');
    console.log('   Employee:', this.wallet.publicKey.toBase58());
    console.log('   Employer:', employerAddress);
    console.warn('   NOTE: New architecture requires entryIndex and employeeIndex. Using default amount.');

    // In the new architecture, we need entryIndex and employeeIndex
    // For backward compatibility, we'll throw an error asking for these
    throw new Error('Withdrawal requires business entry index and employee index. Please use requestWithdrawal directly with these indices.');

    // Check if privacy features are enabled
    const SHADOW_WIRE_ENABLED = process.env.NEXT_PUBLIC_SHADOWWIRE_ENABLED === 'true';
    const MAGIC_BLOCK_ENABLED = process.env.NEXT_PUBLIC_MAGICBLOCK_ENABLED === 'true';

    // Step 1: MagicBlock - Commit PER state back to L1 if enabled
    if (MAGIC_BLOCK_ENABLED) {
      try {
        console.log('   [MAGICBLOCK] Committing PER state to L1...');
        // MagicBlock commit happens on-chain via instruction
        // Full implementation would call commit_from_tee instruction
        console.log('   [MAGICBLOCK] State commit ready (on-chain instruction)');
      } catch (err) {
        console.warn('   [WARNING] MagicBlock commit failed, continuing with direct withdrawal:', err);
      }
    }

    // This method is deprecated - use requestWithdrawal directly
    throw new Error('This method is deprecated. Use requestWithdrawal with entryIndex and employeeIndex.');
  }

  /**
   * Get payroll information
   * 
   * NOTE: In the new index-based architecture, payrolls cannot be fetched by employee/employer pubkeys.
   * This method is deprecated and returns null.
   * 
   * @param employeeAddress - Employee address (deprecated, not used)
   * @param employerAddress - Employer address (deprecated, not used)
   * @returns Payroll account data (always null in new architecture)
   */
  async getPayroll(
    employeeAddress: string,
    employerAddress: string
  ): Promise<any> {
    // In the new architecture, we would need to read the EmployeeEntry account
    // This requires the business entry PDA and employee entry PDA
    // For backward compatibility, return null
    console.warn('getPayroll: New architecture requires entryIndex and employeeIndex. This method returns null.');
    return null;
  }

  /**
   * Calculate accrued salary (client-side)
   * 
   * @param lastWithdraw - Last withdrawal timestamp
   * @param salaryPerSecond - Salary in lamports per second
   * @returns Accrued amount in lamports
   */
  calculateAccrued(lastWithdraw: number, salaryPerSecond: number): number {
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsed = currentTime - lastWithdraw;
    if (elapsed <= 0) return 0;
    return elapsed * salaryPerSecond;
  }

  /**
   * Format lamports to SOL
   */
  lamportsToSOL(lamports: number): number {
    return bagelClient.lamportsToSOL(lamports);
  }

  /**
   * Format SOL to lamports
   */
  solToLamports(sol: number): number {
    return bagelClient.solToLamports(sol);
  }
}

/**
 * Create a BagelClient instance
 */
export function createBagelClient(
  connection: Connection,
  wallet: WalletContextState
): BagelClient {
  return new BagelClient(connection, wallet);
}
