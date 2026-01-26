/**
 * Helius Client Library
 * 
 * Provides RPC and DAS API integration for the Privacy Audit page.
 * 
 * Prize Target: $5,000 (Best privacy project using Helius)
 * Documentation: https://www.helius.dev/docs
 */

import { Connection, PublicKey } from '@solana/web3.js';

const HELIUS_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY!;
const BAGEL_PROGRAM_ID = process.env.NEXT_PUBLIC_BAGEL_PROGRAM_ID!;

export interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  fee: number;
  feePayer: string;
  accounts: string[];
  nativeTransfers?: {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }[];
}

export interface EnhancedTransaction {
  signature: string;
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  slot: number;
  timestamp: number;
  nativeTransfers: {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }[];
  tokenTransfers: {
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
  }[];
  accountData: {
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: any[];
  }[];
  instructions: {
    programId: string;
    data: string;
    accounts: string[];
  }[];
}

export interface AccountData {
  address: string;
  lamports: number;
  owner: string;
  data: string; // Base64 encoded
  executable: boolean;
  rentEpoch: number;
}

/**
 * Helius Client for Privacy Audit
 * 
 * Provides methods to fetch and display on-chain data,
 * showing the difference between raw encrypted data and
 * Bagel's decrypted view.
 */
export class HeliusClient {
  private connection: Connection;
  private apiKey: string;

  constructor() {
    this.connection = new Connection(HELIUS_RPC, 'confirmed');
    this.apiKey = HELIUS_API_KEY;
  }

  /**
   * Get Solana connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Fetch transactions for Bagel program using Helius API
   */
  async getProgramTransactions(limit: number = 20): Promise<HeliusTransaction[]> {
    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/addresses/${BAGEL_PROGRAM_ID}/transactions?api-key=${this.apiKey}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch program transactions:', error);
      return [];
    }
  }

  /**
   * Get enhanced transaction details
   */
  async getEnhancedTransaction(signature: string): Promise<EnhancedTransaction | null> {
    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/transactions/?api-key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: [signature] }),
        }
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status}`);
      }

      const transactions = await response.json();
      return transactions[0] || null;
    } catch (error) {
      console.error('Failed to get enhanced transaction:', error);
      return null;
    }
  }

  /**
   * Get raw account data (shows encrypted bytes)
   */
  async getAccountData(address: string): Promise<AccountData | null> {
    try {
      const pubkey = new PublicKey(address);
      const accountInfo = await this.connection.getAccountInfo(pubkey);

      if (!accountInfo) {
        return null;
      }

      return {
        address,
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toBase58(),
        data: accountInfo.data.toString('base64'),
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
      };
    } catch (error) {
      console.error('Failed to get account data:', error);
      return null;
    }
  }

  /**
   * Get raw account data as hex (for privacy audit display)
   */
  async getAccountDataHex(address: string): Promise<string | null> {
    try {
      const pubkey = new PublicKey(address);
      const accountInfo = await this.connection.getAccountInfo(pubkey);

      if (!accountInfo) {
        return null;
      }

      return accountInfo.data.toString('hex');
    } catch (error) {
      console.error('Failed to get account data:', error);
      return null;
    }
  }

  /**
   * Parse PayrollJar account data
   * Shows the raw bytes vs what authorized users see
   */
  parsePayrollJarData(hexData: string): {
    raw: {
      employer: string;
      employee: string;
      encryptedSalary: string;
      encryptedAccrued: string;
      lastUpdate: string;
      isActive: string;
    };
    parsed: {
      employer: string;
      employee: string;
      encryptedSalaryBytes: number;
      lastUpdate: number;
      isActive: boolean;
    } | null;
  } {
    const bytes = Buffer.from(hexData, 'hex');
    
    // Raw view - just show the hex segments
    const raw = {
      employer: hexData.slice(16, 80), // 32 bytes pubkey
      employee: hexData.slice(80, 144), // 32 bytes pubkey
      encryptedSalary: hexData.slice(144, 176), // 16 bytes handle
      encryptedAccrued: hexData.slice(176, 208), // 16 bytes handle
      lastUpdate: hexData.slice(208, 224), // 8 bytes i64
      isActive: hexData.slice(224, 226), // 1 byte bool
    };

    // Try to parse what we can
    try {
      const parsed = {
        employer: new PublicKey(bytes.slice(8, 40)).toBase58(),
        employee: new PublicKey(bytes.slice(40, 72)).toBase58(),
        encryptedSalaryBytes: 16, // Size of Euint128 handle
        lastUpdate: bytes.readBigInt64LE(104),
        isActive: bytes[120] === 1,
      };

      return { raw, parsed: { ...parsed, lastUpdate: Number(parsed.lastUpdate) } };
    } catch {
      return { raw, parsed: null };
    }
  }

  /**
   * Format data for privacy audit display
   */
  formatForPrivacyAudit(accountData: AccountData | null): {
    publicView: string;
    authorizedView: string | null;
  } {
    if (!accountData) {
      return {
        publicView: 'Account not found',
        authorizedView: null,
      };
    }

    // Public view - raw hex data
    const hexData = Buffer.from(accountData.data, 'base64').toString('hex');
    const publicView = this.formatHexDisplay(hexData);

    // Authorized view would come from decryption
    // For demo, we show the structure
    const authorizedView = `
Address: ${accountData.address}
Lamports: ${accountData.lamports}
Owner: ${accountData.owner}
Data Size: ${Buffer.from(accountData.data, 'base64').length} bytes
Executable: ${accountData.executable}

[Encrypted Fields]
Salary Per Second: *** HIDDEN ***
Accrued Balance: *** HIDDEN ***

(Only employer/employee can decrypt)
    `.trim();

    return { publicView, authorizedView };
  }

  /**
   * Format hex data for display (add spacing and line breaks)
   */
  private formatHexDisplay(hex: string): string {
    const lines: string[] = [];
    for (let i = 0; i < hex.length; i += 64) {
      const offset = (i / 2).toString(16).padStart(4, '0');
      const chunk = hex.slice(i, i + 64);
      const formatted = chunk.match(/.{1,2}/g)?.join(' ') || '';
      lines.push(`${offset}: ${formatted}`);
    }
    return lines.join('\n');
  }

  /**
   * Health check - verify Helius connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const slot = await this.connection.getSlot();
      console.log(`Helius connection healthy. Current slot: ${slot}`);
      return true;
    } catch (error) {
      console.error('Helius health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const heliusClient = new HeliusClient();

// Export for components
export default heliusClient;
