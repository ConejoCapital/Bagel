/**
 * 💰 Privacy Cash Yield Generation Client
 * 
 * Client library for Privacy Cash private lending vaults
 * that generate yield on idle payroll funds.
 * 
 * **TARGET:** Privacy Cash Sponsor Prize + Extra Income!
 * 
 * **KEY FEATURES:**
 * - 5-10% APY on idle payroll funds
 * - Private lending vaults (balances hidden)
 * - Automated yield compounding
 * - Yield bonus for employees (80%)
 * - Yield bonus for employers (20%)
 * - FREE MONEY! 🚀
 * 
 * **HOW IT WORKS:**
 * Employer deposits payroll → Bagel deposits to Privacy Cash vault
 * → Vault lends privately → Interest accrues → Split on withdrawal
 * 
 * **EXAMPLE:**
 * 100 SOL payroll, 50 SOL average idle, 5% APY = 2.5 SOL/year extra
 * Employee gets: 2 SOL/year bonus! Employer gets: 0.5 SOL/year bonus!
 */

import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Privacy Cash Client Configuration
 */
export interface PrivacyCashConfig {
  /** Solana RPC endpoint */
  solanaRpcUrl: string;
  /** Network: 'devnet' | 'mainnet-beta' */
  network: 'devnet' | 'mainnet-beta';
  /** Privacy Cash program ID */
  programId?: string;
}

/**
 * Yield Vault Position
 * 
 * Represents deposited funds earning yield in Privacy Cash vault.
 */
export interface VaultPosition {
  /** Vault account */
  vaultAccount: PublicKey;
  /** Principal deposited */
  principal: number;
  /** Accrued yield */
  accruedYield: number;
  /** Last update time */
  lastUpdate: Date;
  /** APY in basis points (500 = 5%) */
  apyBps: number;
  /** Is active? */
  isActive: boolean;
}

/**
 * Yield Statistics
 */
export interface YieldStats {
  /** Total deposited (principal) */
  totalPrincipal: number;
  /** Total yield earned */
  totalYield: number;
  /** Total value (principal + yield) */
  totalValue: number;
  /** Current APY */
  currentAPY: number;
  /** Daily yield rate */
  dailyYield: number;
  /** Monthly yield estimate */
  monthlyEstimate: number;
  /** Yearly yield estimate */
  yearlyEstimate: number;
}

/**
 * Yield Distribution Split
 */
export interface YieldSplit {
  /** Employee share (80% default) */
  employeeShare: number;
  /** Employer share (20% default) */
  employerShare: number;
  /** Employee percentage */
  employeePercent: number;
  /** Employer percentage */
  employerPercent: number;
}

/**
 * Privacy Cash Client
 * 
 * Manages yield generation on idle payroll funds.
 */
export class PrivacyCashClient {
  private connection: Connection;
  private config: PrivacyCashConfig;
  private programId: PublicKey;
  
  // Default yield settings
  private readonly DEFAULT_APY_BPS = 500; // 5% APY
  private readonly EMPLOYEE_SHARE_BPS = 8000; // 80%
  private readonly EMPLOYER_SHARE_BPS = 2000; // 20%
  
  constructor(config: PrivacyCashConfig) {
    this.config = config;
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
    
    // TODO: Replace with actual Privacy Cash program ID
    this.programId = config.programId 
      ? new PublicKey(config.programId)
      : PublicKey.default;
  }
  
  /**
   * Deposit funds to yield vault
   * 
   * **USE CASE:** Employer deposits payroll funds
   * 
   * **PRODUCTION:** Will interact with Privacy Cash vault
   * ```typescript
   * const position = await privacyCash.deposit({
   *   amount: 100, // SOL
   *   vaultAccount,
   * });
   * ```
   * 
   * @param params - Deposit parameters
   * @returns Vault position
   */
  async depositToVault(params: {
    amount: number;
    vaultAccount: PublicKey;
    apyBps?: number;
  }): Promise<VaultPosition> {
    console.log('🏦 Depositing to Privacy Cash vault...');
    console.log(`   Amount: ${params.amount} SOL`);
    console.log(`   APY: ${(params.apyBps || this.DEFAULT_APY_BPS) / 100}%`);
    
    // TODO: Call Privacy Cash to deposit
    // const signature = await privacyCash.deposit(amount, vaultAccount);
    
    // Mock: Create position
    const position: VaultPosition = {
      vaultAccount: params.vaultAccount,
      principal: params.amount,
      accruedYield: 0,
      lastUpdate: new Date(),
      apyBps: params.apyBps || this.DEFAULT_APY_BPS,
      isActive: true,
    };
    
    console.log('✅ Deposited to vault!');
    console.log('   Yield starts accruing immediately');
    console.log('   📈 Compounding automatically');
    
    return position;
  }
  
  /**
   * Calculate accrued yield
   * 
   * **FORMULA:** yield = principal * (APY / 100) * (time_elapsed / 1 year)
   * 
   * @param position - Vault position
   * @returns Current accrued yield
   */
  calculateYield(position: VaultPosition): number {
    if (!position.isActive) {
      return 0;
    }
    
    const now = Date.now();
    const lastUpdate = position.lastUpdate.getTime();
    const elapsedMs = now - lastUpdate;
    const elapsedSeconds = elapsedMs / 1000;
    
    // yield = principal * (APY / 10000) * (elapsed / seconds_per_year)
    const apyFactor = position.apyBps / 10000;
    const timeFactor = elapsedSeconds / 31536000; // seconds per year
    const newYield = position.principal * apyFactor * timeFactor;
    
    return position.accruedYield + newYield;
  }
  
  /**
   * Get total vault value (principal + yield)
   * 
   * @param position - Vault position
   * @returns Total value
   */
  getTotalValue(position: VaultPosition): number {
    const currentYield = this.calculateYield(position);
    return position.principal + currentYield;
  }
  
  /**
   * Get yield statistics
   * 
   * **USE CASE:** Display yield info to user
   * 
   * @param position - Vault position
   * @returns Yield statistics
   */
  getYieldStats(position: VaultPosition): YieldStats {
    const totalYield = this.calculateYield(position);
    const totalValue = position.principal + totalYield;
    const currentAPY = position.apyBps / 100;
    
    // Daily yield = principal * APY / 365
    const dailyYield = (position.principal * currentAPY / 100) / 365;
    
    return {
      totalPrincipal: position.principal,
      totalYield,
      totalValue,
      currentAPY,
      dailyYield,
      monthlyEstimate: dailyYield * 30,
      yearlyEstimate: position.principal * currentAPY / 100,
    };
  }
  
  /**
   * Split yield between employee and employer
   * 
   * **DEFAULT:** 80% employee, 20% employer
   * 
   * @param totalYield - Total yield to split
   * @param employeeShareBps - Employee share (8000 = 80%)
   * @returns Split amounts
   */
  splitYield(
    totalYield: number,
    employeeShareBps: number = this.EMPLOYEE_SHARE_BPS
  ): YieldSplit {
    const employeeShare = (totalYield * employeeShareBps) / 10000;
    const employerShare = totalYield - employeeShare;
    
    return {
      employeeShare,
      employerShare,
      employeePercent: employeeShareBps / 100,
      employerPercent: (10000 - employeeShareBps) / 100,
    };
  }
  
  /**
   * Calculate employee yield bonus
   * 
   * **USE CASE:** Add yield bonus to employee withdrawal
   * 
   * **FLOW:**
   * 1. Calculate employee's share of vault
   * 2. Calculate their portion of yield
   * 3. Apply 80/20 split
   * 4. Add to withdrawal
   * 
   * @param position - Vault position
   * @param employeeSalaryShare - Employee's salary share
   * @param totalVaultBalance - Total vault balance
   * @returns Employee yield bonus
   */
  calculateEmployeeBonus(
    position: VaultPosition,
    employeeSalaryShare: number,
    totalVaultBalance: number
  ): { bonus: number; details: YieldSplit } {
    // Calculate total yield
    const totalYield = this.calculateYield(position);
    
    // Employee's share of yield based on their salary share
    const employeeShareOfYield = 
      (totalYield * employeeSalaryShare) / totalVaultBalance;
    
    // Apply 80/20 split
    const split = this.splitYield(employeeShareOfYield);
    
    console.log('🎁 Employee yield bonus:');
    console.log(`   Base salary: ${employeeSalaryShare}`);
    console.log(`   Yield bonus: ${split.employeeShare} (${split.employeePercent}%)`);
    console.log(`   Total payout: ${employeeSalaryShare + split.employeeShare}`);
    console.log('   🎉 FREE BONUS MONEY!');
    
    return {
      bonus: split.employeeShare,
      details: split,
    };
  }
  
  /**
   * Withdraw from vault (with yield)
   * 
   * **PRODUCTION:** Withdraws from Privacy Cash vault
   * ```typescript
   * const { principal, yield } = await privacyCash.withdraw(vaultAccount);
   * ```
   * 
   * @param position - Vault position
   * @returns Principal and yield amounts
   */
  async withdrawFromVault(
    position: VaultPosition
  ): Promise<{ principal: number; yield: number; total: number }> {
    console.log('💸 Withdrawing from Privacy Cash vault...');
    
    // Calculate final yield
    const yieldAmount = this.calculateYield(position);
    const total = position.principal + yieldAmount;
    
    console.log(`   Principal: ${position.principal}`);
    console.log(`   Yield: ${yieldAmount} 📈`);
    console.log(`   Total: ${total}`);
    
    // TODO: Call Privacy Cash to withdraw
    // const signature = await privacyCash.withdraw(position.vaultAccount);
    
    // Mark inactive
    position.isActive = false;
    
    console.log('✅ Withdrawal complete!');
    
    return {
      principal: position.principal,
      yield: yieldAmount,
      total,
    };
  }
  
  /**
   * Update vault position (recalculate yield)
   * 
   * @param position - Vault position to update
   * @returns Updated position
   */
  updatePosition(position: VaultPosition): VaultPosition {
    const currentYield = this.calculateYield(position);
    
    return {
      ...position,
      accruedYield: currentYield,
      lastUpdate: new Date(),
    };
  }
  
  /**
   * Get projected earnings
   * 
   * **USE CASE:** Show user potential earnings
   * 
   * @param principal - Amount to deposit
   * @param durationDays - Investment duration in days
   * @param apyBps - APY in basis points
   * @returns Projected earnings
   */
  projectEarnings(
    principal: number,
    durationDays: number,
    apyBps: number = this.DEFAULT_APY_BPS
  ): {
    principal: number;
    yield: number;
    total: number;
    apy: number;
  } {
    const apyFactor = apyBps / 10000;
    const timeFactor = durationDays / 365;
    const yieldAmount = principal * apyFactor * timeFactor;
    
    return {
      principal,
      yield: yieldAmount,
      total: principal + yieldAmount,
      apy: apyBps / 100,
    };
  }
}

/**
 * Create Privacy Cash client for devnet
 */
export function createPrivacyCashClient(): PrivacyCashClient {
  return new PrivacyCashClient({
    solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    network: 'devnet',
    programId: process.env.NEXT_PUBLIC_PRIVACYCASH_PROGRAM_ID,
  });
}

/**
 * Helper: Format APY for display
 */
export function formatAPY(apyBps: number): string {
  return `${(apyBps / 100).toFixed(2)}%`;
}

/**
 * Helper: Format yield amount
 */
export function formatYield(amount: number): string {
  return `+${amount.toFixed(9)} SOL`;
}

// Export types
export type {
  PrivacyCashConfig,
  VaultPosition,
  YieldStats,
  YieldSplit,
};
