---
sidebar_position: 3
---

# Error Codes

Complete list of Bagel program error codes.

## Error Reference

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 6000 | InvalidCiphertext | Empty or malformed ciphertext | Ensure encryption is done client-side with Inco SDK |
| 6001 | InvalidAmount | Amount must be greater than zero | Provide a positive amount |
| 6002 | Overflow | Arithmetic overflow detected | Reduce amount or check balance |
| 6003 | Underflow | Arithmetic underflow detected | Ensure sufficient balance |
| 6004 | InvalidTimestamp | Clock error or invalid time | Retry transaction |
| 6005 | WithdrawTooSoon | Must wait 60 seconds between actions | Wait and retry |
| 6006 | NoAccruedDough | No accrued balance to withdraw | Earn salary first |
| 6007 | InsufficientFunds | Vault balance too low | Employer must deposit more |
| 6008 | Unauthorized | Signer not authorized | Use correct wallet |
| 6009 | PayrollInactive | Entry is not active | Check is_active status |
| 6010 | InvalidState | Invalid program state | Check account configuration |
| 6011 | IdentityVerificationFailed | Identity verification failed | Verify encrypted ID |

## Detailed Descriptions

### 6000: InvalidCiphertext

**Cause:** The encrypted data provided is empty or not in the expected format.

**Solution:**
```typescript
// Always encrypt with Inco SDK
const encrypted = await incoClient.encrypt(amount);
if (encrypted.length === 0) {
  throw new Error('Encryption failed');
}
```

### 6001: InvalidAmount

**Cause:** Trying to deposit, withdraw, or set salary with zero or negative amount.

**Solution:**
```typescript
// Validate before submission
if (amount <= 0) {
  throw new Error('Amount must be positive');
}
```

### 6002: Overflow

**Cause:** Addition would exceed maximum value (2^128 for Euint128, 2^64 for u64).

**Solution:**
- Check current balance before adding
- Use smaller amounts
- Split large operations

### 6003: Underflow

**Cause:** Subtraction would result in negative value.

**Solution:**
```typescript
// Check balance before withdrawal
const balance = await incoClient.decrypt(employee.encryptedAccrued);
if (balance < withdrawAmount) {
  throw new Error('Insufficient balance');
}
```

### 6004: InvalidTimestamp

**Cause:** Clock reading failed or timestamp is invalid.

**Solution:**
- Retry the transaction
- Check Solana cluster status

### 6005: WithdrawTooSoon

**Cause:** Attempting withdrawal within 60 seconds of last action.

**Solution:**
```typescript
// Check elapsed time
const lastAction = employee.lastAction.toNumber();
const now = Math.floor(Date.now() / 1000);
if (now - lastAction < 60) {
  const waitTime = 60 - (now - lastAction);
  throw new Error(`Wait ${waitTime} seconds`);
}
```

### 6006: NoAccruedDough

**Cause:** Employee has no accrued balance to withdraw.

**Solution:**
- Wait for salary to accrue
- Check streaming is enabled (if using TEE)

### 6007: InsufficientFunds

**Cause:** Master vault doesn't have enough funds for withdrawal.

**Solution:**
- Employer must deposit more funds
- Check total vault balance

### 6008: Unauthorized

**Cause:** Signer doesn't have permission for the operation.

**Solution:**
- Use the correct wallet (authority, employer, or employee)
- Verify PDA derivation

### 6009: PayrollInactive

**Cause:** The employee or business entry is deactivated.

**Solution:**
- Check `is_active` status
- Reactivate if needed

### 6010: InvalidState

**Cause:** Program state doesn't allow the operation.

**Solution:**
- Check `use_confidential_tokens` flag
- Verify `confidential_mint` is set
- Ensure all required accounts are provided

### 6011: IdentityVerificationFailed

**Cause:** The encrypted identity doesn't match.

**Solution:**
- Verify the correct pubkey was hashed and encrypted
- Ensure consistent encryption

## Handling Errors

### TypeScript

```typescript
import { AnchorError } from '@coral-xyz/anchor';

try {
  await program.methods.requestWithdrawal(...).rpc();
} catch (error) {
  if (error instanceof AnchorError) {
    switch (error.error.errorCode.number) {
      case 6005:
        console.log('Please wait before withdrawing again');
        break;
      case 6007:
        console.log('Vault has insufficient funds');
        break;
      default:
        console.log(`Error: ${error.error.errorMessage}`);
    }
  }
}
```

### Error Mapping

```typescript
const ERROR_MESSAGES: Record<number, string> = {
  6000: 'Invalid encrypted data provided',
  6001: 'Amount must be greater than zero',
  6002: 'Amount too large - overflow detected',
  6003: 'Insufficient balance for operation',
  6004: 'Transaction timing error - please retry',
  6005: 'Please wait 60 seconds between withdrawals',
  6006: 'No salary accrued yet',
  6007: 'Vault needs more funds - contact employer',
  6008: 'You are not authorized for this action',
  6009: 'Your payroll entry is not active',
  6010: 'Invalid configuration - contact support',
  6011: 'Identity verification failed',
};

function getErrorMessage(code: number): string {
  return ERROR_MESSAGES[code] || 'Unknown error occurred';
}
```
