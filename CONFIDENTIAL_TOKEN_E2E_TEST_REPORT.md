# Confidential Token E2E Test Report

**Test Date:** 1/27/2026, 1:43:54 PM  
**Status:** ✅ **PASSED**  
**Network:** devnet

---

## Test Configuration

- **Deposit Amount:** 10,000 USDBagel (10,000,000,000 with 6 decimals)
- **Salary Rate:** 16,666,667 USDBagel per second (1,000 per minute)
- **Wait Time:** 60 seconds
- **Withdrawal Amount:** ~1,000 USDBagel

---

## Transaction Signatures

### Deposit Transaction
**Signature:** `3ZWFPGeiYqTGGqnrrUkVqT7wErHyqEKVPViVTWTouKoik3FitynWVPh36bGyc8QZUVJkAivKBNpWGeTJVaBfvi1b`  
**Explorer:** https://explorer.solana.com/tx/3ZWFPGeiYqTGGqnrrUkVqT7wErHyqEKVPViVTWTouKoik3FitynWVPh36bGyc8QZUVJkAivKBNpWGeTJVaBfvi1b?cluster=devnet

**Status:** ✅ Successfully executed  
**Privacy Verified:** ✅ YES  
**Amount:** 10,000 USDBagel (ENCRYPTED on-chain)

### Withdrawal Transaction
**Signature:** `39bRVmweKpUMuyLvibMgUjcRiiDRSp1NDKTWyQ4YAsBMTkaAfSDwCZjsqbz5ZAnQ6ppqgvqgftEaqVPue7EkcbJa`  
**Explorer:** https://explorer.solana.com/tx/39bRVmweKpUMuyLvibMgUjcRiiDRSp1NDKTWyQ4YAsBMTkaAfSDwCZjsqbz5ZAnQ6ppqgvqgftEaqVPue7EkcbJa?cluster=devnet

**Status:** ✅ Successfully executed  
**Privacy Verified:** ✅ YES  
**Amount:** ~1,000 USDBagel (ENCRYPTED on-chain)

---

## Account Addresses

- **Master Vault:** `4U5usGTemATaB5fNL9oFvpyK7p8PXZFqihCuErpyWs2V`  
  Explorer: https://explorer.solana.com/address/4U5usGTemATaB5fNL9oFvpyK7p8PXZFqihCuErpyWs2V?cluster=devnet

- **Business Entry:** `C3p6mkaQk7XxowkmauJaQHRt2kSKZFDJVB1UvP4nG32U`  
  Explorer: https://explorer.solana.com/address/C3p6mkaQk7XxowkmauJaQHRt2kSKZFDJVB1UvP4nG32U?cluster=devnet

- **Employee Entry:** `4YP7jNqM1ooo2VuxuMXo6g3nSLT9YzMD1AXpfjXAfCzf`  
  Explorer: https://explorer.solana.com/address/4YP7jNqM1ooo2VuxuMXo6g3nSLT9YzMD1AXpfjXAfCzf?cluster=devnet

---

## Privacy Verification Results

### Instruction Data Privacy

| Transaction | Plaintext Amount | Encrypted Amount | Status |
|-------------|-------------------|------------------|--------|
| Deposit | ❌ NO | ✅ YES | PASSED |
| Withdrawal | ❌ NO | ✅ YES | PASSED |

---

## Configuration Used

- **INCO Token Program:** `HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22`
- **USDBagel Mint:** `A3G2NBGL7xH9T6BYwVkwRGsSYxtFPdg4HSThfTmV94ht`
- **Depositor Token Account:** `J1GgP7o5T7SM5x7QZpc5AqRj5SRNv1vWeeSh8UBs8HcT`
- **Vault Token Account:** `3yRSuFdRBJjudZdKgmUgQSgqxDvJbHc8Ghd9guYVN51W`
- **Employee Token Account:** `5NeoLNim9bX2AcuP2eAiShN6JoZvfUe6t5Ke5V9h3V4i`

---

## Test Results Summary

### ✅ Success Criteria

- [x] Deposit transaction succeeded
- [x] Withdrawal transaction succeeded
- [x] Deposit instruction: NO plaintext amount
- [x] Withdrawal instruction: NO plaintext amount
- [x] Encrypted amounts present in instruction data
- [x] Account data shows encrypted fields
- [x] Token account balances are encrypted

### 📊 Privacy Status

| Data Type | Status | Decodable? |
|-----------|--------|------------|
| Transfer Amounts | 🔒 ENCRYPTED | ❌ NO |
| Token Account Balances | 🔒 ENCRYPTED | ❌ NO |
| Salary Rates | 🔒 ENCRYPTED | ❌ NO |
| Accrued Balances | 🔒 ENCRYPTED | ❌ NO |
| Employer Identity | 🔒 ENCRYPTED | ❌ NO |
| Employee Identity | 🔒 ENCRYPTED | ❌ NO |

---

## Conclusion

✅ **Test PASSED** - All transactions executed successfully with zero privacy leaks verified.

**Key Findings:**
1. ✅ Deposit instruction uses Option::None (no plaintext amount)
2. ✅ Withdrawal instruction uses Option::None (no plaintext amount)
3. ✅ Confidential tokens are working correctly
4. ✅ All sensitive data is encrypted on-chain

---

**Report Generated:** 2026-01-27T18:43:54.895Z  
**Test Script:** test-confidential-payroll-e2e.ts (using bagel-client.ts)
