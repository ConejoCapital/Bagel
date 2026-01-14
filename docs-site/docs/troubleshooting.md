---
sidebar_position: 12
title: Troubleshooting
---

# Troubleshooting Guide

This guide helps you resolve common issues when working with Bagel.

## Build Issues

### "Edition 2024 conflict" Error

**Symptom:**
```
error: package `blake3 v1.9.0` cannot be built because it requires rustc 2024 edition
```

**Solution:**
```bash
cargo update -p blake3 --precise 1.8.2
cargo update -p constant_time_eq --precise 0.3.1
```

**Explanation:** Some dependencies require Rust 2024 edition which isn't yet available. Pinning to older versions resolves this.

---

### Stack Overflow During Build

**Symptom:**
```
thread 'main' has overflowed its stack
```

**Solution:**
The program has SPL token functionality temporarily disabled to stay within the 4096-byte BPF stack limit:

```rust
// In get_dough.rs
// NOTE: SPL token functionality temporarily disabled due to stack issues
// use anchor_spl::token::{self, Token, TokenAccount, Transfer};
```

If you need to enable SPL:
1. Reduce other stack usage
2. Use heap allocation where possible
3. Split complex functions

---

### Anchor Build Fails

**Symptom:**
```
Error: Compiling...
error: could not compile `bagel`
```

**Solution:**
```bash
# Clean and rebuild
anchor clean
rm -rf target/
anchor build
```

If still failing:
```bash
# Check Anchor version
anchor --version  # Should be 0.29.0

# Reinstall if needed
avm install 0.29.0
avm use 0.29.0
```

---

## Transaction Errors

### "Insufficient funds" Error

**Symptom:**
```
Error: Insufficient funds on devnet
```

**Solution:**
```bash
# Airdrop devnet SOL
solana airdrop 2

# Or use web faucet
# https://faucet.solana.com
```

**Note:** Devnet has airdrop limits. Wait a few seconds between requests.

---

### "Blockhash not found" Error

**Symptom:**
```
Error: Blockhash not found
```

**Solution:**
Transaction expired before confirmation. Simply retry:

```typescript
// The transaction will get a fresh blockhash
const txId = await createPayroll(connection, wallet, employee, salary);
```

---

### "Program error 0x1" Error

**Symptom:**
```
Error: Program error 0x1
```

**Solution:**
This usually means the PayrollJar already exists for this employer-employee pair.

```typescript
// Check if exists first
const [pda] = getPayrollJarPDA(employee, employer);
const account = await connection.getAccountInfo(pda);

if (account) {
  console.log('Payroll already exists!');
} else {
  await createPayroll(...);
}
```

---

### "WithdrawTooSoon" (Error 6002)

**Symptom:**
```
Error: You must wait longer between withdrawals
```

**Solution:**
Wait at least 60 seconds between withdrawals:

```typescript
// Check last withdrawal time
const jar = await fetchPayrollJar(connection, employee, employer);
const lastWithdraw = jar.lastWithdraw;
const now = Math.floor(Date.now() / 1000);

if (now - lastWithdraw < 60) {
  const waitSeconds = 60 - (now - lastWithdraw);
  console.log(`Wait ${waitSeconds} more seconds`);
}
```

---

### "SalaryTooHigh" (Error 6000)

**Symptom:**
```
Error: The salary per second exceeds the maximum allowed amount
```

**Solution:**
Maximum salary is 50,000,000 lamports/second. Check your calculation:

```typescript
// Correct: salary in lamports per second
const salaryPerSecond = 3_170_000;  // ~$100k/year

// Wrong: salary in annual lamports
const wrongSalary = 100_000_000_000_000;  // WAY too high!
```

**Conversion helper:**
```typescript
function annualToPerSecond(annualUsd: number, solPrice: number = 100): number {
  const SECONDS_PER_YEAR = 31_536_000;
  const LAMPORTS_PER_SOL = 1_000_000_000;
  return Math.floor((annualUsd / solPrice / SECONDS_PER_YEAR) * LAMPORTS_PER_SOL);
}

annualToPerSecond(100_000);  // Returns ~3,170,000
```

---

### "NoAccruedDough" (Error 6004)

**Symptom:**
```
Error: The payroll has not accrued any dough yet
```

**Solution:**
This means either:
1. Not enough time has passed since last withdrawal
2. No funds have been deposited

```typescript
// Check liquid balance
const jar = await fetchPayrollJar(connection, employee, employer);
console.log('Liquid balance:', jar.totalAccrued);

// If zero, employer needs to deposit
if (jar.totalAccrued === 0) {
  await depositDough(connection, employerWallet, employee, amount);
}
```

---

## Wallet Issues

### Wallet Not Connecting

**Symptom:** Wallet connect button doesn't work or shows no wallets.

**Solution:**

1. **Install a wallet:** [Phantom](https://phantom.app) recommended
2. **Check browser extension is enabled**
3. **Refresh the page**

---

### "WalletSendTransactionError"

**Symptom:**
```
Error: WalletSendTransactionError
```

**Solution:**
Wallet is probably on wrong network. Switch to Devnet:

1. Open Phantom
2. Settings → Developer Settings
3. Enable "Testnet Mode"
4. Click network dropdown → "Solana Devnet"

---

### Transaction Rejected by Wallet

**Symptom:** Phantom shows error or rejects transaction.

**Solution:**
1. Ensure wallet has enough SOL for gas
2. Check you're on Devnet
3. Try clearing Phantom cache: Settings → Lock & Reset

---

## Frontend Issues

### Page Won't Load

**Symptom:** Next.js app shows error or blank page.

**Solution:**
```bash
cd app

# Check for errors
npm run build

# If dependency issues
rm -rf node_modules package-lock.json
npm install

# Start dev server
npm run dev
```

---

### Environment Variables Not Working

**Symptom:** `process.env.NEXT_PUBLIC_*` is undefined.

**Solution:**
1. Create `.env.local` file in `app/` directory:
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_HELIUS_API_KEY=your_key
```

2. Restart the dev server (changes require restart)

---

### "Cannot find module" Error

**Symptom:**
```
Error: Cannot find module '@solana/web3.js'
```

**Solution:**
```bash
cd app
npm install
```

---

## RPC Issues

### Rate Limited

**Symptom:**
```
Error: 429 Too Many Requests
```

**Solution:**
Use Helius or another paid RPC:

```typescript
// .env.local
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

Get free API key at [Helius](https://helius.dev).

---

### RPC Connection Failed

**Symptom:**
```
Error: failed to get recent blockhash
```

**Solution:**
1. Check internet connection
2. Try different RPC endpoint
3. Verify Solana network status at [status.solana.com](https://status.solana.com)

---

## Test Issues

### Tests Fail with Local Validator

**Symptom:**
```
Error: unable to confirm transaction
```

**Solution:**
Skip local validator for devnet testing:

```bash
anchor test --skip-local-validator
```

---

### Test Timeout

**Symptom:**
```
Error: Timeout of 10000ms exceeded
```

**Solution:**
Increase timeout in `Anchor.toml`:

```toml
[test]
startup_wait = 10000
```

Or in test file:
```typescript
it("test name", async () => {
  // ...
}).timeout(30000);
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
# Rust program logs
export RUST_LOG=solana_runtime::system_instruction_processor=trace

# Watch program logs
solana logs 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
```

### View Transaction Details

```bash
# Get transaction info
solana confirm -v <TRANSACTION_SIGNATURE>
```

### Check Account Data

```bash
# View account
solana account <ACCOUNT_ADDRESS>

# Decode with Anchor
anchor account bagel.PayrollJar <ACCOUNT_ADDRESS>
```

### Frontend Debug

```typescript
// Add to your code
console.log('Connection:', connection.rpcEndpoint);
console.log('Wallet:', wallet.publicKey?.toBase58());
console.log('PDA:', payrollJarPDA.toBase58());
```

---

## Still Stuck?

1. **Check existing issues:** [GitHub Issues](https://github.com/ConejoCapital/Bagel/issues)
2. **Open new issue:** Include error message, steps to reproduce, and environment details
3. **Read the source:** Sometimes the code comments explain edge cases
4. **Ask in community:** Solana Discord has helpful developers

---

## Quick Reference: Error Codes

| Code | Name | Likely Cause |
|------|------|--------------|
| 6000 | SalaryTooHigh | Wrong unit (annual vs per-second) |
| 6001 | ArithmeticOverflow | Calculation overflow |
| 6002 | WithdrawTooSoon | < 60 seconds since last withdrawal |
| 6003 | InsufficientFunds | PayrollJar is empty |
| 6004 | NoAccruedDough | Nothing to withdraw |
| 6005 | UnauthorizedEmployer | Wrong signer |
| 6006 | UnauthorizedEmployee | Wrong signer |
| 6007 | SystemPaused | Admin paused system |
| 6008 | EncryptionFailed | Arcium encryption error |
| 6009 | DecryptionFailed | Arcium decryption error |
| 6010 | InvalidTimestamp | Clock error |
| 6011 | InvalidAmount | Amount is 0 |
| 6012 | ArithmeticUnderflow | Subtraction underflow |
