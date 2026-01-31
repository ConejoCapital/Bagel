---
sidebar_position: 9
---

# Troubleshooting

Common issues and solutions.

## Connection Issues

### RPC Connection Failed

**Symptoms:**
- "Failed to connect to RPC"
- Timeout errors
- Network errors

**Solutions:**

1. Check RPC URL:
```typescript
// Ensure URL includes API key
const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${API_KEY}`;
```

2. Verify network:
```typescript
const connection = new Connection(RPC_URL);
const version = await connection.getVersion();
console.log('Connected:', version);
```

3. Try alternative RPC:
```
https://api.devnet.solana.com
https://devnet.helius-rpc.com
```

### Wallet Not Connected

**Symptoms:**
- `wallet is null`
- "Please connect wallet"

**Solutions:**

1. Check wallet adapter:
```typescript
const { connected, publicKey } = useWallet();
if (!connected) {
  return <WalletConnect />;
}
```

2. Ensure wallet installed and unlocked

## Transaction Errors

### 6000: InvalidCiphertext

**Cause:** Empty or malformed encrypted data.

**Solution:**
```typescript
// Always encrypt with Inco SDK
const incoClient = new IncoClient({ network: 'devnet' });
const encrypted = await incoClient.encrypt(amount);

// Validate before sending
if (!encrypted || encrypted.length === 0) {
  throw new Error('Encryption failed');
}
```

### 6005: WithdrawTooSoon

**Cause:** Attempting withdrawal within 60 seconds.

**Solution:**
```typescript
// Check elapsed time
const employee = await program.account.employeeEntry.fetch(pda);
const lastAction = employee.lastAction.toNumber();
const now = Math.floor(Date.now() / 1000);

if (now - lastAction < 60) {
  const wait = 60 - (now - lastAction);
  throw new Error(`Please wait ${wait} seconds`);
}
```

### 6007: InsufficientFunds

**Cause:** Vault doesn't have enough balance.

**Solution:**
- Check vault balance
- Employer needs to deposit more funds

```typescript
const vault = await program.account.masterVault.fetch(vaultPda);
console.log('Vault balance:', vault.totalBalance.toString());
```

### 6008: Unauthorized

**Cause:** Wrong signer for operation.

**Solution:**
- Authority operations: Use vault authority
- Employer operations: Use employer wallet
- Employee operations: Use employee wallet

```typescript
// Verify signer matches
if (wallet.publicKey.toBase58() !== expectedSigner.toBase58()) {
  throw new Error('Wrong wallet connected');
}
```

### 6010: InvalidState

**Cause:** Confidential tokens not configured.

**Solution:**
```typescript
// Check configuration
const vault = await program.account.masterVault.fetch(vaultPda);
if (!vault.useConfidentialTokens) {
  throw new Error('Confidential tokens not enabled');
}
if (vault.confidentialMint.equals(PublicKey.default)) {
  throw new Error('Confidential mint not set');
}
```

## Account Errors

### "Account not found"

**Cause:** PDA doesn't exist yet.

**Solution:**
```typescript
// Check if account exists
const accountInfo = await connection.getAccountInfo(pda);
if (!accountInfo) {
  // Create the account first
  await program.methods.initializeVault().rpc();
}
```

### "Account already initialized"

**Cause:** Trying to create existing account.

**Solution:**
```typescript
try {
  await program.methods.initializeVault().rpc();
} catch (e) {
  if (e.message.includes('already in use')) {
    console.log('Vault already exists');
  }
}
```

### Wrong PDA derivation

**Cause:** Incorrect seeds or program ID.

**Solution:**
```typescript
// Verify seeds
const [pda, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('entry'),
    masterVaultPda.toBuffer(),
    new BN(entryIndex).toArrayLike(Buffer, 'le', 8), // Little-endian!
  ],
  BAGEL_PROGRAM_ID // Correct program ID
);
```

## Encryption Errors

### "Decryption failed"

**Cause:** Not authorized or invalid handle.

**Solution:**
```typescript
// Ensure proper authorization
try {
  const value = await incoClient.decrypt(encrypted);
} catch (e) {
  if (e.message.includes('unauthorized')) {
    console.log('You are not authorized to decrypt this value');
  }
}
```

### Encryption returns empty

**Cause:** SDK not initialized properly.

**Solution:**
```typescript
const incoClient = new IncoClient({
  network: 'devnet',
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
});

// Verify initialization
const encrypted = await incoClient.encrypt(100n);
console.log('Encrypted length:', encrypted.length);
```

## Build Errors

### "Module not found"

**Solution:**
```bash
# Clean install
rm -rf node_modules
npm install

# Or with bun
rm -rf node_modules bun.lock
bun install
```

### TypeScript errors

**Solution:**
```typescript
// Ensure proper types
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

const index = new BN(0);
const pubkey = new PublicKey('...');
```

### Anchor build fails

**Solution:**
```bash
# Update Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Clean and rebuild
anchor clean
anchor build
```

## Debugging Tips

### Enable verbose logging

```typescript
// Add to your code
console.log('Accounts:', {
  masterVault: masterVaultPda.toBase58(),
  businessEntry: businessEntryPda.toBase58(),
  employeeEntry: employeeEntryPda.toBase58(),
});
```

### Check transaction logs

```typescript
try {
  const tx = await program.methods.deposit(...).rpc();
  console.log('TX:', tx);

  // Fetch logs
  const logs = await connection.getTransaction(tx, {
    commitment: 'confirmed',
  });
  console.log('Logs:', logs?.meta?.logMessages);
} catch (e) {
  console.error('Error:', e);
}
```

### Use Solana Explorer

View detailed transaction info:
```
https://explorer.solana.com/tx/{signature}?cluster=devnet
```

## Getting Help

If issues persist:

1. **Discord:** Ask in #support channel
2. **GitHub:** Create an issue with:
   - Transaction signature
   - Error message
   - Code snippet
   - Environment details
