/**
 * ShadowWire Private Transfer Client (Lean Bagel Stack)
 *
 * REAL SDK Implementation using @radr/shadowwire
 *
 * **LEAN BAGEL STACK**
 * Documentation: https://github.com/Radrdotfun/ShadowWire
 *
 * **KEY FEATURES:**
 * - Zero-knowledge private transfers (Bulletproofs)
 * - Amount privacy (on-chain amount is HIDDEN)
 * - Supports SOL, USDC, RADR, and 13+ other tokens
 * - Internal transfers are fully private
 *
 * **INTEGRATION FLOW:**
 * 1. MagicBlock commits state to L1
 * 2. ShadowWire executes private transfer
 * 3. Employee receives funds (amount hidden on-chain)
 */

import { ShadowWireClient as RealShadowWireClient } from '@radr/shadowwire';
import { Connection, PublicKey } from '@solana/web3.js';

// Re-export from real SDK for convenience
export { ShadowWireClient as RealShadowWireClient } from '@radr/shadowwire';

// ShadowWire Constants
const SHADOWWIRE_PROGRAM_ID = process.env.NEXT_PUBLIC_SHADOWWIRE_PROGRAM_ID || 'GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD';

// Token fees (from ShadowWire docs) - 1% relayer fee
const TOKEN_FEES: Record<string, number> = {
  SOL: 1.0,    // 1%
  USDC: 1.0,   // 1%
  USD1: 1.0,   // 1%
  RADR: 1.0,   // 1%
  BONK: 1.0,   // 1%
};

// Token decimals
const TOKEN_DECIMALS: Record<string, number> = {
  SOL: 9,
  USDC: 6,
  USD1: 6,
  RADR: 9,
  BONK: 5,
};

/**
 * ShadowWire Client Configuration
 */
export interface ShadowWireConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Custom API endpoint (optional) */
  apiBaseUrl?: string;
}

/**
 * Transfer Result from ShadowWire
 */
export interface TransferResult {
  success: boolean;
  tx_signature?: string;
  amount_hidden: boolean;
  error?: string;
}

/**
 * Balance Info from ShadowWire
 */
export interface BalanceInfo {
  available: number;
  pool_address: string;
}

/**
 * ShadowWire Client Wrapper
 * 
 * Wraps the real @radr/shadowwire SDK for use in Bagel
 */
export class ShadowWireClient {
  private client: RealShadowWireClient;
  private debug: boolean;
  
  constructor(config: ShadowWireConfig = {}) {
    this.debug = config.debug || false;
    this.client = new RealShadowWireClient({
      debug: this.debug,
      ...(config.apiBaseUrl ? { apiBaseUrl: config.apiBaseUrl } : {}),
    });
  }
  
  /**
   * Get balance for a wallet
   * 
   * @param wallet - Wallet address
   * @param token - Token symbol (default: SOL)
   * @returns Balance info
   */
  async getBalance(wallet: string, token: string = 'SOL'): Promise<BalanceInfo> {
    if (this.debug) {
      console.log(`🔍 Getting ShadowWire balance for ${wallet}`);
    }
    
    try {
      const balance = await this.client.getBalance(wallet, token);
      return {
        available: balance.available,
        pool_address: balance.pool_address,
      };
    } catch (error) {
      console.error('Failed to get balance:', error);
      return { available: 0, pool_address: '' };
    }
  }
  
  /**
   * Execute private transfer using real ShadowWire SDK
   * 
   * @param params - Transfer parameters
   * @returns Transfer result
   */
  async transfer(params: {
    sender: string;
    recipient: string;
    amount: number;
    token: 'SOL' | 'USDC' | 'USD1' | 'RADR' | 'BONK';
    type: 'internal' | 'external';
    wallet: {
      signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    };
  }): Promise<TransferResult> {
    console.log('🔒 Executing ShadowWire private transfer...');
    console.log(`   Amount: ${params.amount} ${params.token}`);
    console.log(`   Type: ${params.type} (amount ${params.type === 'internal' ? 'HIDDEN' : 'visible'})`);
    console.log(`   Recipient: ${params.recipient.slice(0, 8)}...`);
    
    try {
      const result = await this.client.transfer({
        sender: params.sender,
        recipient: params.recipient,
        amount: params.amount,
        token: params.token,
        type: params.type,
        wallet: {
          signMessage: params.wallet.signMessage,
        },
      });
      
      console.log('✅ Private transfer complete!');
      console.log(`   Signature: ${result.tx_signature}`);
      console.log(`   Amount hidden: ${result.amount_hidden}`);
      
      return {
        success: true,
        tx_signature: result.tx_signature,
        amount_hidden: result.amount_hidden,
      };
    } catch (error) {
      console.error('❌ Transfer failed:', error);
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.name === 'RecipientNotFoundError') {
          return {
            success: false,
            amount_hidden: false,
            error: 'Recipient has not used ShadowWire. Use external transfer instead.',
          };
        }
        if (error.name === 'InsufficientBalanceError') {
          return {
            success: false,
            amount_hidden: false,
            error: 'Insufficient ShadowWire balance. Deposit funds first.',
          };
        }
      }
      
      return {
        success: false,
        amount_hidden: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Deposit SOL/tokens into ShadowWire pool
   * 
   * @param wallet - Wallet address
   * @param amount - Amount in lamports/smallest unit
   * @param token - Token symbol
   * @returns Unsigned transaction (must be signed by wallet)
   */
  async deposit(wallet: string, amount: number, token: string = 'SOL') {
    console.log(`💰 Depositing ${amount} ${token} to ShadowWire...`);
    
    const tx = await this.client.deposit({
      wallet,
      amount,
    });
    
    console.log('✅ Deposit transaction created (needs signing)');
    return tx;
  }
  
  /**
   * Withdraw from ShadowWire pool
   * 
   * @param wallet - Wallet address
   * @param amount - Amount to withdraw
   * @param token - Token symbol
   * @returns Unsigned transaction
   */
  async withdraw(wallet: string, amount: number, token: string = 'SOL') {
    console.log(`💸 Withdrawing ${amount} ${token} from ShadowWire...`);
    
    const tx = await this.client.withdraw({
      wallet,
      amount,
    });
    
    console.log('✅ Withdraw transaction created (needs signing)');
    return tx;
  }
}

/**
 * Create ShadowWire client for devnet/mainnet
 */
export function createShadowWireClient(debug: boolean = false): ShadowWireClient {
  return new ShadowWireClient({ debug });
}

// ============================================================
// Lean Bagel Integration: Private Payout Flow
// ============================================================

/**
 * Private payout parameters for Lean Bagel withdrawal
 */
export interface PrivatePayoutParams {
  /** Sender vault address */
  sender: string;
  /** Recipient employee wallet */
  recipient: string;
  /** Amount in token units (not lamports) */
  amount: number;
  /** Token: SOL, USDC, USD1 */
  token: 'SOL' | 'USDC' | 'USD1' | 'RADR' | 'BONK';
  /** Transfer type: internal (fully private) or external */
  type: 'internal' | 'external';
}

/**
 * Payout result
 */
export interface PayoutResult {
  success: boolean;
  signature?: string;
  error?: string;
  fee?: number;
  amountAfterFee?: number;
  amountHidden: boolean;
}

/**
 * Execute private payout via ShadowWire (REAL IMPLEMENTATION)
 *
 * This is the main function for Bagel withdrawal flow:
 * 1. MagicBlock commits employee's accrued balance to L1
 * 2. This function executes the private transfer
 * 3. Amount is hidden on-chain via Bulletproofs
 *
 * @param params - Payout parameters
 * @param wallet - Wallet with signMessage capability
 * @returns Payout result
 */
export async function executePrivatePayout(
  params: PrivatePayoutParams,
  wallet: { signMessage: (message: Uint8Array) => Promise<Uint8Array> }
): Promise<PayoutResult> {
  console.log('🔒 Executing ShadowWire private payout...');
  console.log(`   Amount: ${params.amount} ${params.token} (will be HIDDEN)`);
  console.log(`   Type: ${params.type}`);
  console.log(`   Recipient: ${params.recipient.slice(0, 8)}...`);

  try {
    // Create client
    const client = createShadowWireClient(true);
    
    // Calculate fee (1% for all tokens)
    const feePercent = TOKEN_FEES[params.token] || 1;
    const fee = params.amount * (feePercent / 100);
    const amountAfterFee = params.amount - fee;

    console.log(`   Fee: ${fee.toFixed(6)} ${params.token} (${feePercent}%)`);
    console.log(`   After fee: ${amountAfterFee.toFixed(6)} ${params.token}`);

    // Execute transfer via real ShadowWire SDK
    const result = await client.transfer({
      sender: params.sender,
      recipient: params.recipient,
      amount: params.amount,
      token: params.token,
      type: params.type,
      wallet: { signMessage: wallet.signMessage },
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Transfer failed',
        amountHidden: false,
      };
    }

    console.log('✅ Private payout complete');
    console.log(`   Signature: ${result.tx_signature}`);
    console.log(`   Amount hidden: ${result.amount_hidden}`);

    return {
      success: true,
      signature: result.tx_signature,
      fee,
      amountAfterFee,
      amountHidden: result.amount_hidden,
    };
  } catch (error) {
    console.error('❌ Private payout failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      amountHidden: false,
    };
  }
}

/**
 * Get fee for a token transfer
 */
export function getTransferFee(amount: number, token: string): { fee: number; total: number } {
  const feePercent = TOKEN_FEES[token] || 1;
  const fee = amount * (feePercent / 100);
  return {
    fee,
    total: amount - fee,
  };
}

/**
 * Get minimum transfer amount for a token
 */
export function getMinimumAmount(token: string): number {
  // Minimum amounts (approximate)
  const minimums: Record<string, number> = {
    SOL: 0.001,    // ~$0.15
    USDC: 0.1,     // $0.10
    USD1: 0.1,     // $0.10
    RADR: 1,       // 1 RADR
    BONK: 1000,    // 1000 BONK
  };
  return minimums[token] || 0.001;
}

/**
 * Convert to smallest unit (lamports, etc.)
 */
export function toSmallestUnit(amount: number, token: string): number {
  const decimals = TOKEN_DECIMALS[token] || 9;
  return Math.floor(amount * Math.pow(10, decimals));
}

/**
 * Convert from smallest unit
 */
export function fromSmallestUnit(amount: number, token: string): number {
  const decimals = TOKEN_DECIMALS[token] || 9;
  return amount / Math.pow(10, decimals);
}

/**
 * Format amount for display (privacy-aware)
 */
export function formatPrivateAmount(amount?: number, revealed: boolean = false): string {
  if (!revealed || amount === undefined) {
    return '***.**';  // Hidden
  }
  return `$${amount.toFixed(2)}`;
}

// Export constants
export {
  SHADOWWIRE_PROGRAM_ID,
  TOKEN_FEES,
  TOKEN_DECIMALS,
};
