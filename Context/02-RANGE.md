# Range Compliance Integration Guide

**Prize:** $1,500+ (free API credits for all participating teams)  
**Difficulty:** LOW  
**Status:** READY (API-based, works with any network)

---

## Overview

Range provides enterprise-grade risk and compliance APIs for digital assets. We use it to pre-screen employer AND employee wallets before allowing payroll operations.

**Documentation:** https://docs.range.org/

---

## API Endpoints (CORRECT)

| Purpose | Endpoint | Description |
|---------|----------|-------------|
| Risk Score | `GET /v1/risk/address?address={addr}&network=solana` | Returns 1-10 risk score with reasoning |
| Sanctions | `GET /v1/risk/sanctions/{addr}` | OFAC and blacklist check |

> **IMPORTANT:** Do NOT use `/v1/risk/address/solana/{addr}` - this returns 404!

---

## Setup Instructions

### 1. Get API Key

1. Go to https://app.range.org
2. Sign up for free account
3. Generate API key
4. Note: Trial has limited requests (10/month for Risk API)

### 2. Configure Environment

```bash
# app/.env.local
NEXT_PUBLIC_RANGE_API_KEY=your_range_api_key
RANGE_API_KEY=your_range_api_key  # Server-side
```

---

## Implementation

### Range Client

```typescript
// app/lib/range.ts

export interface RiskScoreResponse {
  address: string;
  network: string;
  riskScore: number;  // 1-10 scale
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning?: string;
}

export interface SanctionsResponse {
  address: string;
  is_ofac_sanctioned: boolean;
  is_token_blacklisted: boolean;
}

export interface FullComplianceResult {
  isCompliant: boolean;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isBlacklisted: boolean;
  isOFACSanctioned: boolean;
  reasoning?: string;
}

export class RangeClient {
  private apiKey: string;
  private baseUrl = 'https://api.range.org/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get risk score for an address (1-10 scale)
   * Uses: GET /v1/risk/address?address={addr}&network=solana
   */
  async getRiskScore(address: string): Promise<RiskScoreResponse> {
    const response = await fetch(
      `${this.baseUrl}/risk/address?address=${encodeURIComponent(address)}&network=solana`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // 404 = unknown address = low risk
      if (response.status === 404) {
        return {
          address,
          network: 'solana',
          riskScore: 1,
          riskLevel: 'low',
          reasoning: 'Address not in risk database',
        };
      }
      throw new Error(`Range Risk API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check sanctions/blacklist status
   * Uses: GET /v1/risk/sanctions/{addr}
   */
  async checkSanctions(address: string): Promise<SanctionsResponse> {
    const response = await fetch(
      `${this.baseUrl}/risk/sanctions/${encodeURIComponent(address)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // 404 = not in sanctions database = clean
      if (response.status === 404) {
        return {
          address,
          is_ofac_sanctioned: false,
          is_token_blacklisted: false,
        };
      }
      throw new Error(`Range Sanctions API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Comprehensive compliance check (calls both APIs in parallel)
   */
  async fullComplianceCheck(address: string): Promise<FullComplianceResult> {
    const [riskScore, sanctions] = await Promise.all([
      this.getRiskScore(address),
      this.checkSanctions(address),
    ]);

    return {
      isCompliant: 
        riskScore.riskScore <= 3 && 
        !sanctions.is_token_blacklisted && 
        !sanctions.is_ofac_sanctioned,
      riskScore: riskScore.riskScore,
      riskLevel: riskScore.riskLevel,
      isBlacklisted: sanctions.is_token_blacklisted,
      isOFACSanctioned: sanctions.is_ofac_sanctioned,
      reasoning: riskScore.reasoning,
    };
  }
}

// Singleton instance
export const rangeClient = new RangeClient(
  process.env.NEXT_PUBLIC_RANGE_API_KEY || ''
);
```

### Employer Pre-Screening

```typescript
// In app/pages/employer.tsx

import { rangeClient } from '../lib/range';

const handleCreatePayroll = async () => {
  // Step 1: Full compliance check BEFORE transaction
  console.log('Running compliance check...');
  
  try {
    const compliance = await rangeClient.fullComplianceCheck(
      wallet.publicKey.toBase58()
    );

    if (!compliance.isCompliant) {
      const reasons = [];
      if (compliance.riskScore > 3) reasons.push(`High risk score: ${compliance.riskScore}/10`);
      if (compliance.isOFACSanctioned) reasons.push('OFAC sanctioned');
      if (compliance.isBlacklisted) reasons.push('Token blacklisted');
      setError(`Compliance check failed: ${reasons.join(', ')}`);
      return;
    }

    console.log(`Compliance check passed (Risk: ${compliance.riskScore}/10)`);
    
    // Step 2: Proceed with payroll creation
    await createPayroll();
    
  } catch (error) {
    console.error('Compliance check error:', error);
    // Decide: fail open or closed?
    // For demo, we fail open with warning
    setWarning('Could not verify compliance, proceeding anyway...');
    await createPayroll();
  }
};
```

### Compliance Badge Component

```typescript
// app/components/ComplianceBadge.tsx

import { useState, useEffect } from 'react';
import { rangeClient, RangeRiskResponse } from '../lib/range';

interface Props {
  address: string;
}

export function ComplianceBadge({ address }: Props) {
  const [status, setStatus] = useState<'loading' | 'safe' | 'flagged' | 'error'>('loading');
  const [details, setDetails] = useState<RangeRiskResponse | null>(null);

  useEffect(() => {
    rangeClient.screenAddress(address)
      .then(result => {
        setDetails(result);
        setStatus(result.malicious ? 'flagged' : 'safe');
      })
      .catch(() => setStatus('error'));
  }, [address]);

  return (
    <div className={`badge ${status}`}>
      {status === 'loading' && 'Checking...'}
      {status === 'safe' && '[VERIFIED] Range Compliant'}
      {status === 'flagged' && '[WARNING] Compliance Issue'}
      {status === 'error' && '[UNKNOWN] Could not verify'}
    </div>
  );
}
```

---

## API Reference

### GET /v1/risk/address (Risk Score)

Get risk score (1-10) for a wallet address.

**Request:**
```bash
curl -X GET 'https://api.range.org/v1/risk/address?address=YOUR_ADDRESS&network=solana' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

**Response:**
```json
{
  "address": "...",
  "network": "solana",
  "riskScore": 2,
  "riskLevel": "low",
  "reasoning": "No suspicious activity detected",
  "factors": []
}
```

### GET /v1/risk/sanctions (Sanctions Check)

Check if an address is OFAC sanctioned or token blacklisted.

**Request:**
```bash
curl -X GET 'https://api.range.org/v1/risk/sanctions/YOUR_ADDRESS' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

**Response:**
```json
{
  "address": "...",
  "is_ofac_sanctioned": false,
  "is_token_blacklisted": false,
  "sanctions_source": null,
  "blacklist_source": null
}
```

---

## Privacy Model Clarification

```
+-------------------------------------------------------------------------+
| ENCRYPTED (Private)              | VISIBLE (Public Blockchain)         |
+-------------------------------------------------------------------------+
| - Salary rate in PayrollJar      | - Native SOL balance changes        |
| - Inco Euint128 ciphertext       | - Transaction signatures            |
| - MagicBlock TEE state           | - Account addresses                 |
| - Program log amounts            | - Instruction names                 |
+-------------------------------------------------------------------------+
| SHADOWWIRE (Mainnet Only)                                               |
| - ZK Bulletproof hides transfer amounts                                 |
| - Range proof ensures validity without revealing value                  |
+-------------------------------------------------------------------------+
```

> **Note:** The `+0.09 SOL` balance change visible on explorer is because native SOL transfers are public by design. ShadowWire's Bulletproof ZK proofs (mainnet only) are the way to hide this.

---

## Rate Limits

| Plan | Risk API | Data API |
|------|----------|----------|
| Trial | 10/month | 100/month |
| Enterprise | Custom | Custom |

---

## Checklist

- [x] Sign up for Range account
- [x] Generate API key
- [x] Add to environment variables
- [x] Create RangeClient class with correct endpoints
- [x] Add `getRiskScore()` method (GET /v1/risk/address?address=...&network=solana)
- [x] Add `checkSanctions()` method (GET /v1/risk/sanctions/{addr})
- [x] Add `fullComplianceCheck()` for combined screening
- [x] Add pre-screening to employer flow
- [x] Add ComplianceBadge component
- [ ] Test with known addresses
