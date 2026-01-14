---
sidebar_position: 11
title: FAQ
---

# Frequently Asked Questions

## General Questions

### What is Bagel?

Bagel is a privacy-first payroll platform built on Solana. It allows employers to pay employees with complete financial privacy while generating yield on idle funds.

### Why "Bagel"?

We use bagel-themed terminology to make payroll more approachable:
- **Bake** = Create a payroll
- **Dough** = Funds/money
- **BagelJar** = Payroll account
- **Get Dough** = Withdraw salary

### Is Bagel production-ready?

Bagel is currently a hackathon project deployed on Solana Devnet. While the code is functional, it requires professional security audits before mainnet deployment.

---

## Privacy Questions

### What data is hidden?

| Hidden | Technology |
|--------|------------|
| Salary amounts | Arcium MPC encryption |
| Transfer amounts | ShadowWire Bulletproofs |
| Real-time balance | MagicBlock TEE |
| Yield earnings | Privacy Cash |

### What data is visible?

| Visible | Reason |
|---------|--------|
| Employer/employee relationship | Required for PDA derivation |
| Withdrawal timestamps | Required for accrual calculation |
| Vault TVL (total) | Protocol transparency |

### Can validators see my salary?

No. Salaries are encrypted using Arcium's MPC before being stored on-chain. Validators only see encrypted bytes that are meaningless without the decryption key.

### Can my colleagues see how much I earn?

No. Transfer amounts are hidden using ShadowWire Bulletproofs. On-chain observers see only a cryptographic proof that the transfer is valid, not the amount.

---

## Technical Questions

### What's the Program ID?

```
8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
```

### What network is Bagel on?

Currently Solana Devnet. Mainnet deployment is planned after security audits.

### How do I derive a PayrollJar address?

```typescript
const [pda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('bagel_jar'),
    employer.toBuffer(),
    employee.toBuffer(),
  ],
  BAGEL_PROGRAM_ID
);
```

### What's the minimum withdrawal interval?

60 seconds. This prevents spam and timing analysis attacks.

### What's the maximum salary?

50,000,000 lamports per second (~$50/second at $100/SOL, or ~$1.5B/year). This prevents arithmetic overflow.

---

## Employer Questions

### How do I create a payroll?

```typescript
const txId = await createPayroll(
  connection,
  wallet,
  employeePublicKey,
  salaryPerSecond
);
```

### How is salary calculated?

Salary is stored as **lamports per second**:

```
annual_salary_usd / sol_price_usd / seconds_per_year * LAMPORTS_PER_SOL

Example: $100,000/year at $100/SOL
= 100,000 / 100 / 31,536,000 * 1,000,000,000
= 31,709 lamports/second (roughly 3.17M)
```

### What happens to my deposits?

| Portion | Destination | Purpose |
|---------|-------------|---------|
| 90% | Kamino vault | Earning yield |
| 10% | Liquid buffer | Immediate payouts |

### How do I claim yield?

```typescript
const txId = await claimExcessDough(connection, wallet, employeeAddress);
```

You receive 20% of accumulated yield. The remaining 80% goes to employees as bonuses.

### Can I change an employee's salary?

Yes, using the `update_salary` instruction. The change takes effect immediately.

### How do I terminate a payroll?

```typescript
const txId = await closePayroll(connection, wallet, employeeAddress);
```

Remaining funds (including yield principal) are returned to your wallet.

---

## Employee Questions

### How do I check my balance?

Using the frontend dashboard or programmatically:

```typescript
const payrollJar = await fetchPayrollJar(connection, myPublicKey, employerAddress);
const decryptedSalary = decrypt(payrollJar.encryptedSalary);
const accrued = calculateAccrued(
  payrollJar.lastWithdraw,
  decryptedSalary,
  currentTime
);
```

### How do I withdraw my salary?

```typescript
const txId = await withdrawDough(connection, wallet, employerAddress);
```

### Why can't I withdraw immediately after creating a payroll?

The `MIN_WITHDRAW_INTERVAL` (60 seconds) must pass between withdrawals. This prevents spam attacks and timing analysis.

### Do I get yield bonuses?

Yes! Employees automatically receive 80% of yield generated on their employer's deposits. This bonus is added to your withdrawal.

### What if my employer closes the payroll?

Your accrued salary is still owed. Before closing, the employer should either:
1. Ensure you've withdrawn your accrued balance, or
2. The remaining funds go back to the employer

---

## Yield Questions

### How does yield generation work?

1. Employer deposits funds (e.g., 100 SOL)
2. 90% goes to Kamino vault (earning ~5-10% APY)
3. Yield accrues over time
4. Distribution: 80% employees, 20% employer

### What APY can I expect?

| Source | Expected APY |
|--------|-------------|
| Kamino SOL | 5-8% |
| Kamino USDC | 3-6% |

APY varies based on market conditions.

### How is yield distributed?

```
Total Yield
├── 80% → Employees (as bonus on withdrawal)
└── 20% → Employer (via claim_excess_dough)
```

---

## Wallet Questions

### Which wallets are supported?

Any Solana wallet that supports the Wallet Adapter:
- Phantom (recommended)
- Solflare
- Backpack
- Ledger (via adapter)

### Why do I need to set Phantom to Devnet?

Bagel is currently deployed only on Devnet. To interact with it:
1. Open Phantom Settings
2. Developer Settings
3. Enable "Testnet Mode"
4. Select "Solana Devnet"

### How do I get Devnet SOL?

```bash
solana airdrop 2
```

Or use the [Solana Faucet](https://faucet.solana.com).

---

## Error Questions

### "Insufficient funds" - What do I do?

Get devnet SOL:
```bash
solana airdrop 2
```

### "WithdrawTooSoon" - What's happening?

You must wait 60 seconds between withdrawals. This is an anti-spam measure.

### "SalaryTooHigh" - Is there a limit?

Yes, maximum salary is 50,000,000 lamports/second (~$1.5B/year). If you're hitting this limit, you're probably using wrong units.

### "Edition 2024 conflict" during build

Update dependencies:
```bash
cargo update -p blake3 --precise 1.8.2
cargo update -p constant_time_eq --precise 0.3.1
```

---

## Integration Questions

### Can I integrate Bagel into my app?

Yes! Use the TypeScript SDK:

```typescript
import {
  createPayroll,
  depositDough,
  withdrawDough
} from '@bagel/sdk';
```

### Is there an IDL?

Yes, generated by Anchor:
```
target/idl/bagel.json
```

### Are there webhooks for events?

Events are emitted on-chain. Use [Helius](https://helius.dev) webhooks to listen:
- `PayrollBaked`
- `DoughAdded`
- `DoughDelivered`
- `YieldClaimed`

---

## Future Questions

### When will Bagel be on Mainnet?

After:
1. Security audits
2. Further testing
3. Community feedback

### Will there be token?

No plans currently. Bagel is a utility protocol.

### Can I contribute?

Yes! Check out the [GitHub repository](https://github.com/ConejoCapital/Bagel).

---

## Didn't Find Your Answer?

- **GitHub Issues:** [Open an issue](https://github.com/ConejoCapital/Bagel/issues)
- **Documentation:** Check other sections of this documentation
- **Code:** Read the source code for implementation details
