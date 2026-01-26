# Lean Bagel: Master Strategy

**Version:** 1.0  
**Last Updated:** January 25, 2026  
**Deadline:** February 1, 2026

---

## Executive Summary

Bagel is pivoting to a lean, achievable stack for the Solana Privacy Hackathon. This plan prioritizes a working demo over comprehensive features.

### What We're Building

A privacy-preserving payroll system with:
1. **Compliance Gate** - Range pre-screening before payroll creation
2. **Encrypted Ledger** - Inco Lightning for hidden salary balances
3. **Real-Time Streaming** - MagicBlock PER for sub-second updates
4. **Private Payouts** - ShadowWire for ZK transfers
5. **Privacy Audit** - Helius-powered verification UI

### What We Dropped

- [DROPPED] **Arcium MPC** - Too complex, circuit deployment issues
- [DROPPED] **Privacy Cash Yield** - No devnet support, simulate instead
- [DROPPED] **Kamino DeFi** - Not privacy-related

---

## Architecture Flow

```
+-------------+     +----------------+     +------------------+
|  Employer   |---->| Range Compliance|---->|  Inco Encrypted  |
|  Wallet     |     |  Pre-Screen    |     |     Ledger       |
+-------------+     +----------------+     +------------------+
                                                    |
                                                    v
+-------------+     +----------------+     +------------------+
|  Employee   |<----|  ShadowWire ZK |<----|  MagicBlock PER  |
|  Wallet     |     |    Payout      |     |   Streaming      |
+-------------+     +----------------+     +------------------+
                            |
                            v
                    +----------------+
                    | Helius Privacy |
                    |   Audit UI     |
                    +----------------+
```

---

## Technology Stack

| Layer | Tool | Purpose | Network |
|-------|------|---------|---------|
| RPC | Helius | Fast, reliable RPC | Devnet + Mainnet |
| Compliance | Range | Wallet screening | API (any network) |
| Accounting | Inco Lightning | Encrypted balances | Devnet Beta |
| Streaming | MagicBlock | Real-time updates | Devnet |
| Payout | ShadowWire | Private transfers | Mainnet (verify devnet) |

---

## Implementation Timeline

### Day 1: Infrastructure
- [ ] Helius RPC setup
- [ ] Environment configuration

### Day 2: Compliance
- [ ] Range API integration
- [ ] Employer pre-screening

### Days 3-4: Encrypted Ledger
- [ ] Inco Lightning integration
- [ ] Replace Arcium mocks

### Day 5: Streaming
- [ ] MagicBlock PER delegation
- [ ] TEE auth flow

### Day 6: Payouts
- [ ] ShadowWire integration
- [ ] Private withdrawal flow

### Day 7: Polish
- [ ] Privacy audit page
- [ ] Demo video
- [ ] Submit

---

## Prize Strategy

| Sponsor | Prize Pool | Target | Confidence |
|---------|-----------|--------|------------|
| Helius | $5,000 | $5,000 | HIGH |
| Range | $1,500+ | $1,500 | HIGH |
| Inco | $6,000 | $2,000 | MEDIUM |
| MagicBlock | $5,000 | $2,500 | MEDIUM |
| ShadowWire | $15,000 | $2,500-5,000 | MEDIUM |
| Track 01/02 | $15,000 | $5,000 | MEDIUM |

**Realistic Total: $18,500 - $26,000**

---

## Key Files to Modify

### Backend (Rust/Anchor)
- `programs/bagel/Cargo.toml` - Add Inco, MagicBlock deps
- `programs/bagel/src/state/mod.rs` - Inco encrypted types
- `programs/bagel/src/privacy/` - Replace arcium.rs with inco.rs
- `programs/bagel/src/lib.rs` - Add delegation instruction

### Frontend (TypeScript/Next.js)
- `app/.env.local` - Helius RPC, API keys
- `app/lib/range.ts` - New Range client
- `app/lib/inco.ts` - New Inco client
- `app/lib/magicblock.ts` - Real SDK integration
- `app/lib/shadowwire.ts` - Real SDK integration
- `app/pages/employer.tsx` - Compliance check
- `app/pages/privacy-audit.tsx` - New page

### Config
- `Anchor.toml` - Helius RPC, program IDs

---

## Success Criteria

1. **Demo works end-to-end on devnet**
2. **Privacy is verifiable** (audit page shows encrypted data)
3. **All integrations functional** (not mocked)
4. **3-minute video complete**
5. **Submitted before Feb 1**
