/**
 * Range Compliance Client Library
 * 
 * Provides wallet screening for compliance before payroll creation.
 * Uses two main API endpoints:
 * - Risk Score API: /v1/risk/address?address={addr}&network=solana
 * - Sanctions API: /v1/risk/sanctions/{addr}
 * 
 * Prize Target: $1,500+ (free API credits for all participating teams)
 * Documentation: https://docs.range.org/
 */

const RANGE_API_KEY = process.env.NEXT_PUBLIC_RANGE_API_KEY || process.env.RANGE_API_KEY || '';
const RANGE_BASE_URL = 'https://api.range.org/v1';

/**
 * Response from Range risk score API
 * GET /v1/risk/address?address={addr}&network=solana
 */
export interface RiskScoreResponse {
  address: string;
  network: string;
  riskScore: number;  // 1-10 score
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning?: string;
  factors?: string[];
}

/**
 * Response from Range sanctions API
 * GET /v1/risk/sanctions/{addr}
 */
export interface SanctionsResponse {
  address: string;
  is_ofac_sanctioned: boolean;
  is_token_blacklisted: boolean;
  sanctions_source?: string;
  blacklist_source?: string;
}

/**
 * Response from Range address screening (legacy)
 */
export interface RangeAddressResponse {
  address: string;
  ecosystem: string;
  network: string;
  name_tag?: string;
  category?: string;
  address_role?: string;
  entity?: string;
  attributes: Record<string, any>;
  tags: string[];
  malicious: boolean;
  is_validator?: boolean;
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  isSafe: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  details: RangeAddressResponse | null;
}

/**
 * Compliance check result for UI
 */
export interface ComplianceResult {
  status: 'passed' | 'failed' | 'warning' | 'error';
  message: string;
  address: string;
  timestamp: number;
  details?: RiskAssessment;
}

/**
 * Full compliance check result combining risk score and sanctions
 */
export interface FullComplianceResult {
  isCompliant: boolean;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isBlacklisted: boolean;
  isOFACSanctioned: boolean;
  reasoning?: string;
}

/**
 * Range Client for Compliance Pre-screening
 * 
 * Screens wallet addresses before allowing payroll operations.
 * Flagged addresses are blocked from creating payrolls.
 */
export class RangeClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || RANGE_API_KEY;
    this.baseUrl = RANGE_BASE_URL;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey !== 'YOUR_RANGE_API_KEY_HERE';
  }

  /**
   * Screen a wallet address for compliance risks (legacy method)
   * 
   * @param address - Solana wallet address to screen
   * @param network - Network (default: 'solana')
   * @returns Address information including malicious flag
   */
  async screenAddress(address: string, network: string = 'solana'): Promise<RangeAddressResponse> {
    if (!this.isConfigured()) {
      console.warn('Range API key not configured. Returning safe by default.');
      return {
        address,
        ecosystem: 'solana',
        network,
        attributes: {},
        tags: [],
        malicious: false,
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/address?address=${encodeURIComponent(address)}&network=${network}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Range API error (${response.status}): ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Range screening failed:', error);
      // Fail open for hackathon demo (in production, might fail closed)
      return {
        address,
        ecosystem: 'solana',
        network,
        attributes: {},
        tags: [],
        malicious: false,
      };
    }
  }

  /**
   * Get risk score for an address (1-10 scale)
   * Uses the correct endpoint: GET /v1/risk/address?address={addr}&network=solana
   * 
   * @param address - Solana wallet address
   * @returns Risk score 1-10 with reasoning
   */
  async getRiskScore(address: string): Promise<RiskScoreResponse> {
    if (!this.isConfigured()) {
      console.warn('Range API key not configured. Returning low risk by default.');
      return {
        address,
        network: 'solana',
        riskScore: 1,
        riskLevel: 'low',
        reasoning: 'API key not configured - defaulting to low risk',
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/risk/address?address=${encodeURIComponent(address)}&network=solana`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // 404 typically means unknown address = low risk
        if (response.status === 404) {
          return {
            address,
            network: 'solana',
            riskScore: 1,
            riskLevel: 'low',
            reasoning: 'Address not found in risk database - treated as low risk',
          };
        }
        const errorText = await response.text();
        throw new Error(`Range Risk API error (${response.status}): ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Range risk score check failed:', error);
      return {
        address,
        network: 'solana',
        riskScore: 1,
        riskLevel: 'low',
        reasoning: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check sanctions/blacklist status for an address
   * Uses the endpoint: GET /v1/risk/sanctions/{addr}
   * 
   * @param address - Solana wallet address
   * @returns OFAC and blacklist status
   */
  async checkSanctions(address: string): Promise<SanctionsResponse> {
    if (!this.isConfigured()) {
      console.warn('Range API key not configured. Assuming not sanctioned.');
      return {
        address,
        is_ofac_sanctioned: false,
        is_token_blacklisted: false,
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/risk/sanctions/${encodeURIComponent(address)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // 404 typically means not in sanctions database = clean
        if (response.status === 404) {
          return {
            address,
            is_ofac_sanctioned: false,
            is_token_blacklisted: false,
          };
        }
        const errorText = await response.text();
        throw new Error(`Range Sanctions API error (${response.status}): ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Range sanctions check failed:', error);
      return {
        address,
        is_ofac_sanctioned: false,
        is_token_blacklisted: false,
      };
    }
  }

  /**
   * Comprehensive compliance check combining risk score and sanctions
   * Calls both APIs in parallel for efficiency
   * 
   * @param address - Solana wallet address
   * @returns Combined compliance result
   */
  async fullComplianceCheck(address: string): Promise<FullComplianceResult> {
    // Call both APIs in parallel
    const [riskScore, sanctions] = await Promise.all([
      this.getRiskScore(address),
      this.checkSanctions(address),
    ]);

    // Determine compliance: risk score <= 3 AND not sanctioned/blacklisted
    const isCompliant = 
      riskScore.riskScore <= 3 && 
      !sanctions.is_token_blacklisted && 
      !sanctions.is_ofac_sanctioned;

    return {
      isCompliant,
      riskScore: riskScore.riskScore,
      riskLevel: riskScore.riskLevel,
      isBlacklisted: sanctions.is_token_blacklisted,
      isOFACSanctioned: sanctions.is_ofac_sanctioned,
      reasoning: riskScore.reasoning,
    };
  }

  /**
   * Quick check if an address is flagged as malicious
   */
  async isAddressMalicious(address: string): Promise<boolean> {
    const result = await this.screenAddress(address);
    return result.malicious;
  }

  /**
   * Get detailed risk assessment for an address
   */
  async getRiskAssessment(address: string): Promise<RiskAssessment> {
    const result = await this.screenAddress(address);
    
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for malicious flag
    if (result.malicious) {
      riskLevel = 'critical';
      reasons.push('Address flagged as malicious');
    }

    // Check tags for risk indicators
    const highRiskTags = ['sanctioned', 'terrorist', 'fraud', 'scam'];
    const mediumRiskTags = ['mixer', 'darknet', 'gambling'];
    const warningTags = ['exchange', 'high_volume'];

    for (const tag of result.tags) {
      if (highRiskTags.includes(tag.toLowerCase())) {
        riskLevel = 'critical';
        reasons.push(`Tagged as: ${tag}`);
      } else if (mediumRiskTags.includes(tag.toLowerCase())) {
        if (riskLevel === 'low') riskLevel = 'medium';
        reasons.push(`Associated with: ${tag}`);
      } else if (warningTags.includes(tag.toLowerCase())) {
        reasons.push(`Note: ${tag}`);
      }
    }

    // Check category
    const riskyCategories = ['MIXER', 'DARKNET', 'TERRORISM', 'FRAUD'];
    if (result.category && riskyCategories.includes(result.category.toUpperCase())) {
      riskLevel = 'high';
      reasons.push(`Category: ${result.category}`);
    }

    return {
      isSafe: riskLevel === 'low',
      riskLevel,
      reasons,
      details: result,
    };
  }

  /**
   * Perform compliance check for UI display
   */
  async checkCompliance(address: string): Promise<ComplianceResult> {
    const timestamp = Date.now();

    try {
      const assessment = await this.getRiskAssessment(address);

      if (!assessment.isSafe) {
        return {
          status: assessment.riskLevel === 'critical' ? 'failed' : 'warning',
          message: assessment.reasons.join('; ') || 'Address flagged for review',
          address,
          timestamp,
          details: assessment,
        };
      }

      return {
        status: 'passed',
        message: 'Compliance check passed',
        address,
        timestamp,
        details: assessment,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Compliance check failed',
        address,
        timestamp,
      };
    }
  }
}

// Singleton instance
export const rangeClient = new RangeClient();

/**
 * React hook-friendly compliance check
 */
export async function checkWalletCompliance(address: string): Promise<ComplianceResult> {
  return rangeClient.checkCompliance(address);
}

/**
 * Simple pass/fail check for form validation
 */
export async function isWalletCompliant(address: string): Promise<boolean> {
  const result = await rangeClient.checkCompliance(address);
  return result.status === 'passed';
}

export default rangeClient;
