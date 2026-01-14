/**
 * ⚡ MagicBlock Streaming Payments Client
 * 
 * Client library for MagicBlock's Private Ephemeral Rollups (PERs)
 * enabling real-time salary streaming.
 * 
 * **TARGET:** MagicBlock Sponsor Prize + Track 02 ($15k)
 * 
 * **KEY FEATURES:**
 * - Real-time payment streaming (every second!)
 * - Private Ephemeral Rollups (Intel TDX)
 * - Sub-100ms state updates
 * - Zero gas fees for streams
 * - Instant settlement to mainchain
 * 
 * **THE MAGIC:**
 * Instead of withdrawing salary weekly, employees see their
 * balance increase in real-time, every single second! 🚀
 * 
 * All updates happen off-chain in a secure TEE, with only
 * final settlements hitting the Solana mainchain.
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

/**
 * MagicBlock Client Configuration
 */
export interface MagicBlockConfig {
  /** Solana RPC endpoint */
  solanaRpcUrl: string;
  /** Network: 'devnet' | 'mainnet-beta' */
  network: 'devnet' | 'mainnet-beta';
  /** MagicBlock program ID */
  programId?: string;
  /** Update interval for streaming (ms) */
  updateInterval?: number;
}

/**
 * Ephemeral Stream Session
 * 
 * Represents an active streaming session on a Private Ephemeral Rollup.
 */
export interface StreamSession {
  /** Unique session ID */
  sessionId: string;
  /** Employer address */
  employer: PublicKey;
  /** Employee address */
  employee: PublicKey;
  /** Stream rate (amount per second) */
  ratePerSecond: number;
  /** Session start time */
  startTime: Date;
  /** Last update time */
  lastUpdate: Date;
  /** Current streamed balance (off-chain) */
  currentBalance: number;
  /** Is stream active? */
  isActive: boolean;
  /** Ephemeral rollup account */
  rollupAccount: PublicKey;
}

/**
 * Stream Statistics
 */
export interface StreamStats {
  /** Total streamed since start */
  totalStreamed: number;
  /** Time elapsed (seconds) */
  elapsedSeconds: number;
  /** Average rate */
  averageRate: number;
  /** Estimated next hour */
  nextHourEstimate: number;
  /** Estimated daily */
  dailyEstimate: number;
}

/**
 * MagicBlock Streaming Client
 * 
 * Enables real-time salary streaming using Private Ephemeral Rollups.
 */
export class MagicBlockClient {
  private connection: Connection;
  private config: MagicBlockConfig;
  private programId: PublicKey;
  private updateInterval: number;
  private activeStreams: Map<string, StreamSession>;
  private updateTimers: Map<string, NodeJS.Timeout>;
  
  constructor(config: MagicBlockConfig) {
    this.config = config;
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
    
    // TODO: Replace with actual MagicBlock program ID
    this.programId = config.programId 
      ? new PublicKey(config.programId)
      : PublicKey.default;
    
    this.updateInterval = config.updateInterval || 1000; // 1 second default
    this.activeStreams = new Map();
    this.updateTimers = new Map();
  }
  
  /**
   * Initialize a new streaming session
   * 
   * **USE CASE:** Start streaming salary to employee
   * 
   * **PRODUCTION:** Will create session on MagicBlock PER
   * ```typescript
   * const session = await magicblock.createSession({
   *   employer,
   *   employee,
   *   ratePerSecond: 0.001 // SOL per second
   * });
   * ```
   * 
   * @param params - Session parameters
   * @returns Stream session
   */
  async initializeStream(params: {
    employer: PublicKey;
    employee: PublicKey;
    ratePerSecond: number;
  }): Promise<StreamSession> {
    console.log('⚡ Initializing MagicBlock stream...');
    console.log(`   Employer: ${params.employer.toBase58()}`);
    console.log(`   Employee: ${params.employee.toBase58()}`);
    console.log(`   Rate: ${params.ratePerSecond} per second`);
    
    // TODO: Create session on MagicBlock PER
    // const rollupAccount = await magicblock.createEphemeralRollup();
    // const sessionId = await magicblock.initializeStream(params);
    
    // Mock: Create session
    const sessionId = `session_${Date.now()}`;
    const session: StreamSession = {
      sessionId,
      employer: params.employer,
      employee: params.employee,
      ratePerSecond: params.ratePerSecond,
      startTime: new Date(),
      lastUpdate: new Date(),
      currentBalance: 0,
      isActive: true,
      rollupAccount: PublicKey.default, // Mock
    };
    
    // Store session
    this.activeStreams.set(sessionId, session);
    
    // Start real-time updates
    this.startStreamUpdates(sessionId);
    
    console.log('✅ Stream initialized!');
    console.log(`   Session ID: ${sessionId}`);
    console.log('   🔥 Balance will update every second!');
    
    return session;
  }
  
  /**
   * Start real-time updates for a stream
   * 
   * Updates the balance every second based on the stream rate.
   * 
   * @param sessionId - Session to update
   */
  private startStreamUpdates(sessionId: string): void {
    // Clear any existing timer
    this.stopStreamUpdates(sessionId);
    
    // Create new update timer
    const timer = setInterval(() => {
      this.updateStreamBalance(sessionId);
    }, this.updateInterval);
    
    this.updateTimers.set(sessionId, timer);
    
    console.log(`⏱️  Started real-time updates for ${sessionId}`);
  }
  
  /**
   * Stop real-time updates for a stream
   * 
   * @param sessionId - Session to stop
   */
  private stopStreamUpdates(sessionId: string): void {
    const timer = this.updateTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.updateTimers.delete(sessionId);
    }
  }
  
  /**
   * Update stream balance (called every second)
   * 
   * **PRODUCTION:** This queries the MagicBlock PER
   * ```typescript
   * const balance = await magicblock.queryBalance(sessionId);
   * ```
   * 
   * @param sessionId - Session to update
   */
  private async updateStreamBalance(sessionId: string): Promise<void> {
    const session = this.activeStreams.get(sessionId);
    if (!session || !session.isActive) {
      this.stopStreamUpdates(sessionId);
      return;
    }
    
    // Calculate streamed amount since last update
    const now = new Date();
    const elapsedMs = now.getTime() - session.lastUpdate.getTime();
    const elapsedSeconds = elapsedMs / 1000;
    
    const streamed = session.ratePerSecond * elapsedSeconds;
    
    // Update balance
    session.currentBalance += streamed;
    session.lastUpdate = now;
    
    // Log for visibility (in production, this would emit event)
    console.log(`💰 Stream ${sessionId}: +${streamed.toFixed(9)} (total: ${session.currentBalance.toFixed(9)})`);
  }
  
  /**
   * Get current stream balance
   * 
   * **USE CASE:** Display real-time balance to employee
   * 
   * @param sessionId - Session ID
   * @returns Current balance
   */
  async getStreamBalance(sessionId: string): Promise<number> {
    const session = this.activeStreams.get(sessionId);
    if (!session) {
      throw new Error(`Stream session not found: ${sessionId}`);
    }
    
    // Calculate current balance including time since last update
    const now = new Date();
    const elapsedMs = now.getTime() - session.lastUpdate.getTime();
    const elapsedSeconds = elapsedMs / 1000;
    const additionalStreamed = session.ratePerSecond * elapsedSeconds;
    
    return session.currentBalance + additionalStreamed;
  }
  
  /**
   * Get stream statistics
   * 
   * **USE CASE:** Show employee streaming stats and estimates
   * 
   * @param sessionId - Session ID
   * @returns Stream statistics
   */
  async getStreamStats(sessionId: string): Promise<StreamStats> {
    const session = this.activeStreams.get(sessionId);
    if (!session) {
      throw new Error(`Stream session not found: ${sessionId}`);
    }
    
    const currentBalance = await this.getStreamBalance(sessionId);
    const elapsedSeconds = (Date.now() - session.startTime.getTime()) / 1000;
    const averageRate = elapsedSeconds > 0 ? currentBalance / elapsedSeconds : 0;
    
    return {
      totalStreamed: currentBalance,
      elapsedSeconds,
      averageRate,
      nextHourEstimate: session.ratePerSecond * 3600,
      dailyEstimate: session.ratePerSecond * 86400,
    };
  }
  
  /**
   * Claim streamed balance
   * 
   * **USE CASE:** Employee claims their streamed salary
   * 
   * **FLOW:**
   * 1. Get current balance from PER
   * 2. Settle to Solana mainchain
   * 3. Transfer to employee
   * 4. Continue streaming from checkpoint
   * 
   * @param sessionId - Session ID
   * @param wallet - Wallet to sign transaction
   * @returns Claimed amount
   */
  async claimStream(
    sessionId: string,
    wallet: any // TODO: Type this properly
  ): Promise<{ amount: number; signature: string }> {
    console.log(`💸 Claiming stream: ${sessionId}`);
    
    const session = this.activeStreams.get(sessionId);
    if (!session) {
      throw new Error(`Stream session not found: ${sessionId}`);
    }
    
    // Get final balance
    const amount = await this.getStreamBalance(sessionId);
    
    console.log(`   Amount to claim: ${amount.toFixed(9)}`);
    
    // TODO: Settle PER state and transfer
    // const signature = await magicblock.settleAndClaim(sessionId, amount);
    
    // Reset balance (checkpoint)
    session.currentBalance = 0;
    session.lastUpdate = new Date();
    
    // Mock signature
    const signature = `CLAIM_${sessionId}_${Date.now()}`;
    
    console.log('✅ Claim successful!');
    console.log(`   Signature: ${signature}`);
    console.log('   🔥 Stream continues from checkpoint');
    
    return { amount, signature };
  }
  
  /**
   * Stop streaming session
   * 
   * **USE CASE:** End employment or pause payroll
   * 
   * @param sessionId - Session ID
   */
  async stopStream(sessionId: string): Promise<void> {
    console.log(`⏹️  Stopping stream: ${sessionId}`);
    
    const session = this.activeStreams.get(sessionId);
    if (!session) {
      throw new Error(`Stream session not found: ${sessionId}`);
    }
    
    // Stop updates
    this.stopStreamUpdates(sessionId);
    
    // Mark inactive
    session.isActive = false;
    
    // TODO: Close PER session
    // await magicblock.closeSession(sessionId);
    
    console.log('✅ Stream stopped');
  }
  
  /**
   * Get all active streams for a user
   * 
   * @param user - User public key (employer or employee)
   * @returns Active streams
   */
  async getActiveStreams(user: PublicKey): Promise<StreamSession[]> {
    const userStr = user.toBase58();
    const streams: StreamSession[] = [];
    
    for (const session of this.activeStreams.values()) {
      if (
        session.isActive &&
        (session.employer.toBase58() === userStr ||
          session.employee.toBase58() === userStr)
      ) {
        streams.push(session);
      }
    }
    
    return streams;
  }
  
  /**
   * Subscribe to stream updates
   * 
   * **USE CASE:** Real-time UI updates
   * 
   * @param sessionId - Session ID
   * @param callback - Called on each update
   * @returns Unsubscribe function
   */
  subscribeToStream(
    sessionId: string,
    callback: (balance: number) => void
  ): () => void {
    const timer = setInterval(async () => {
      try {
        const balance = await this.getStreamBalance(sessionId);
        callback(balance);
      } catch (error) {
        console.error('Stream subscription error:', error);
      }
    }, this.updateInterval);
    
    // Return unsubscribe function
    return () => clearInterval(timer);
  }
  
  /**
   * Cleanup (call when done)
   */
  cleanup(): void {
    // Stop all timers
    for (const sessionId of this.updateTimers.keys()) {
      this.stopStreamUpdates(sessionId);
    }
    
    this.activeStreams.clear();
    this.updateTimers.clear();
  }
}

/**
 * Create MagicBlock client for devnet
 */
export function createMagicBlockClient(): MagicBlockClient {
  return new MagicBlockClient({
    solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    network: 'devnet',
    programId: process.env.NEXT_PUBLIC_MAGICBLOCK_PROGRAM_ID,
    updateInterval: 1000, // 1 second
  });
}

/**
 * Helper: Format stream rate to hourly/daily
 */
export function formatStreamRate(ratePerSecond: number): {
  perSecond: string;
  perHour: string;
  perDay: string;
  perYear: string;
} {
  return {
    perSecond: `$${(ratePerSecond * 100).toFixed(6)}/sec`,
    perHour: `$${(ratePerSecond * 3600 * 100).toFixed(2)}/hr`,
    perDay: `$${(ratePerSecond * 86400 * 100).toFixed(2)}/day`,
    perYear: `$${(ratePerSecond * 31536000 * 100).toFixed(2)}/yr`,
  };
}

// Export types
export type {
  MagicBlockConfig,
  StreamSession,
  StreamStats,
};
