# Bagel - Solana Privacy Hackathon 2026 Submission

**Team:** Conejo Capital  
**Members:** @ConejoCapital (Backend/Architecture), @tomi204_ (Frontend/UI)  
**Submission Date:** January 2026

---

## Project Overview

**Bagel** is a privacy-preserving payroll infrastructure for stablecoin payments on Solana. We address the "Glass Office" problem where traditional crypto payroll exposes sensitive financial data on-chain.

**One-liner:** Bringing the $80B payroll market on-chain with end-to-end privacy.

---

## Hackathon Requirements Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| All code is open source | COMPLETE | MIT License, public GitHub repo |
| Integrates with Solana | COMPLETE | Anchor 0.31.1 program deployed |
| Uses privacy-preserving technologies | COMPLETE | 5-layer privacy stack |
| Program deployed to devnet/mainnet | COMPLETE | Devnet: `J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE` |
| Demo video (max 3 minutes) | PENDING | See demo script below |
| Documentation on how to run | COMPLETE | README.md, this file |

---

## Deployed Program

**Program ID:** `J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE`

**Network:** Solana Devnet

**Explorer:** https://explorer.solana.com/address/J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE?cluster=devnet

---

## Sponsor Bounties Targeted

| Sponsor | Bounty | Amount | Integration Status |
|---------|--------|--------|-------------------|
| **Helius** | Best Privacy Project | $5,000 | FULL - All transactions use Helius RPC |
| **Range** | Compliant Privacy | $1,500+ | FULL - Compliance pre-screening |
| **Inco** | Best Confidential Apps | $6,000 | FULL - FHE encrypted ledger |
| **MagicBlock** | Real-time Privacy | $5,000 | READY - TEE delegation integrated |
| **ShadowWire** | Private Transfers | $15,000 | SIMULATED - ZK Bulletproof payouts |
| **Track 01** | Private Payments | $15,000 | ELIGIBLE |

**Total Prize Target: $32,500+**

---

## Privacy Stack Integration

### 1. Helius (RPC Infrastructure)
- **Status:** FULL
- **Usage:** All transactions routed through Helius RPC
- **API:** DAS API for transaction fetching, privacy audit page
- **Files:** `app/lib/helius.ts`, `app/pages/privacy-audit.tsx`

### 2. Range (Compliance)
- **Status:** FULL
- **Usage:** Pre-screen employer/employee wallets before payroll creation
- **API:** Risk Score API, Sanctions Check API
- **Files:** `app/lib/range.ts`, employer pre-screening flow

### 3. Inco Lightning (Encrypted Ledger)
- **Status:** FULL
- **Usage:** FHE encryption for salaries, IDs, balances, counts
- **Types:** `Euint128` for all sensitive data
- **Files:** `programs/bagel/src/lib.rs`, `programs/bagel/src/privacy/inco.rs`

### 4. MagicBlock PER (Real-Time Streaming)
- **Status:** READY
- **Usage:** TEE delegation for real-time balance updates
- **SDK:** `ephemeral-rollups-sdk = "0.8.3"`
- **Files:** `app/lib/magicblock.ts`, delegation instructions in `lib.rs`

### 5. ShadowWire (ZK Payouts)
- **Status:** SIMULATED (devnet flag)
- **Usage:** Bulletproof ZK proofs to hide withdrawal amounts
- **Note:** Mainnet-ready, simulated on devnet
- **Files:** `app/lib/shadowwire.ts`, withdrawal flow

---

## Test Results

**Test Date:** January 26, 2026  
**Status:** PASSED

| Metric | Result |
|--------|--------|
| Businesses Registered | 2 |
| Employees Added | 4 |
| Total Deposited | 0.10 SOL |
| Total Withdrawn | 0.05 SOL |
| Successful Withdrawals | 4/4 (100%) |

**Full test results:** See `TEST_RESULTS_2026-01-26.md`

---

## Demo Video Script (3 minutes)

### 0:00 - 0:30 | Problem Statement
- Show a normal Solana payroll transaction on explorer
- Point out visible data: employer wallet, employee wallet, exact salary amount
- Explain: "Traditional crypto payroll is embarrassingly public - the Glass Office problem"

### 0:30 - 1:30 | Solution Demo (Employer)
- Connect wallet as employer
- Show Range compliance check (green badge)
- Create payroll with encrypted salary
- Deposit funds to Master Vault
- Show on-chain data: only encrypted ciphertext visible

### 1:30 - 2:30 | Solution Demo (Employee)
- Switch to employee wallet
- Show balance streaming in real-time (MagicBlock simulation)
- Demonstrate withdrawal
- Show ShadowWire: amount hidden via ZK simulation
- Compare explorer view: transaction visible, but NOT salary amount

### 2:30 - 3:00 | Architecture Summary
- Quick slide: Compliance -> Encryption -> Streaming -> ZK Payout
- Show privacy audit page: encrypted vs decrypted views
- Close: "Privacy-first payroll, ready for the $80B market"

---

## How to Run

### Prerequisites
- Rust 1.92.0+
- Solana CLI 2.0+
- Anchor CLI 0.31.1
- Node.js 18+

### Setup
```bash
# Clone the repository
git clone https://github.com/ConejoCapital/Bagel.git
cd Bagel

# Install dependencies
npm install
cargo build
anchor build

# Configure environment
cp app/.env.local.example app/.env.local
# Edit app/.env.local with your API keys
```

### Run Tests
```bash
# Run E2E test on devnet
node tests/test-real-privacy-onchain.mjs
```

### Run Frontend
```bash
cd app
npm install
npm run dev
# Open http://localhost:3000
```

---

## Repository Structure

```
Bagel/
├── programs/bagel/src/     # Solana program (Rust)
│   ├── lib.rs              # Maximum privacy architecture
│   ├── constants.rs        # Program IDs
│   └── privacy/            # Privacy tool integrations
├── app/                    # Frontend (Next.js)
│   ├── lib/                # SDK clients
│   └── pages/              # Application routes
├── Context/                # Integration guides
├── tests/                  # E2E tests
└── docs/                   # Documentation
```

---

## Team Contributions

### @ConejoCapital
- Solana program architecture
- Privacy stack integration (Inco, MagicBlock, ShadowWire, Range)
- E2E testing
- Documentation

### @tomi204_
- Frontend UI/UX
- Landing page design
- Docusaurus documentation site
- Component library

---

## Links

| Resource | URL |
|----------|-----|
| GitHub | https://github.com/ConejoCapital/Bagel |
| Program Explorer | https://explorer.solana.com/address/J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE?cluster=devnet |
| Hackathon | https://solana.com/privacyhack |

---

## Contact

- **Twitter:** @ConejoCapital, @tomi204_
- **GitHub:** https://github.com/ConejoCapital

---

**Simple payroll. Private paydays.**

*Built for Solana Privacy Hackathon 2026*
