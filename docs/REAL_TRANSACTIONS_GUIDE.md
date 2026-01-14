# 🥯 Bagel Real Transactions Implementation Guide

**FOR**: Frontend team implementing actual Solana blockchain interactions  
**CRITICAL**: Judges WILL test this - it must be REAL, not mocked!

## Problem We're Solving

**Current State**: Frontend shows success messages but NO transactions are sent to Solana  
**Required State**: Every user action must result in REAL on-chain transactions  
**Why**: Hackathon judges test with real wallets and check Solana Explorer

## Architecture Overview

```
User Action (Frontend)
    ↓
Build Solana Transaction
    ↓
Wallet Signs Transaction
    ↓
Send to Solana Devnet via Helius RPC
    ↓
Transaction Confirmed
    ↓
Show Result + Explorer Link
```

## Deployed Program Info

- **Program ID**: `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU`
- **Network**: Solana Devnet
- **RPC**: Helius Devnet (`https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af`)
- **Explorer**: https://explorer.solana.com/address/8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU?cluster=devnet

## Client Library: `app/lib/bagel-client.ts`

This file contains all the functions needed to interact with the deployed program.

### Key Functions

#### 1. `getPayrollJarPDA(employee, employer)`
Calculates the Program Derived Address (PDA) for a payroll account.

```typescript
import { getPayrollJarPDA } from '../lib/bagel-client';

const [payrollJarPDA, bump] = getPayrollJarPDA(
  employeePublicKey,
  employerPublicKey
);
```

**What it does**: Deterministically derives the account address where payroll data is stored.

#### 2. `createPayroll(connection, wallet, employee, salaryPerSecond)`
Sends a REAL `bake_payroll` transaction to create a new payroll.

```typescript
import { createPayroll, solToLamports } from '../lib/bagel-client';

try {
  const txid = await createPayroll(
    connection,
    wallet,
    new PublicKey(employeeAddress),
    solToLamports(0.000001) // 0.000001 SOL per second
  );
  
  console.log('Transaction:', txid);
  console.log('Explorer:', `https://explorer.solana.com/tx/${txid}?cluster=devnet`);
} catch (error) {
  console.error('Failed:', error.message);
}
```

**What it does**:
- Builds the `bake_payroll` instruction manually
- Prompts user's wallet for signature
- Sends transaction to Solana via Helius
- Returns transaction signature (txid)

#### 3. `fetchPayrollJar(connection, employee, employer)`
Fetches and deserializes the on-chain PayrollJar account.

```typescript
import { fetchPayrollJar } from '../lib/bagel-client';

const payrollData = await fetchPayrollJar(
  connection,
  employeePublicKey,
  employerPublicKey
);

if (payrollData) {
  console.log('Employer:', payrollData.employer.toBase58());
  console.log('Employee:', payrollData.employee.toBase58());
  console.log('Last Withdraw:', new Date(payrollData.lastWithdraw * 1000));
  console.log('Total Accrued:', payrollData.totalAccrued);
  console.log('Is Active:', payrollData.isActive);
}
```

**What it does**:
- Fetches account data from Solana
- Manually deserializes the account structure
- Returns parsed PayrollJar data

#### 4. `calculateAccrued(lastWithdraw, salaryPerSecond, currentTime)`
Client-side calculation of accrued salary.

```typescript
import { calculateAccrued } from '../lib/bagel-client';

const accrued = calculateAccrued(
  payrollData.lastWithdraw, // Unix timestamp
  salaryPerSecond,           // Lamports per second
  Math.floor(Date.now() / 1000) // Current time
);
```

**What it does**:
- Calculates: `(currentTime - lastWithdraw) * salaryPerSecond`
- Used for real-time balance updates without RPC calls

## Implementation Examples

### Employer Dashboard: Create Payroll

**File**: `app/pages/employer.tsx`

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { createPayroll, solToLamports } from '../lib/bagel-client';
import { useState } from 'react';

export default function EmployerDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [employeeAddress, setEmployeeAddress] = useState('');
  const [salaryPerSecond, setSalaryPerSecond] = useState('0.000001');
  const [loading, setLoading] = useState(false);
  const [txid, setTxid] = useState('');

  const handleCreatePayroll = async () => {
    if (!wallet.publicKey) {
      alert('Please connect wallet');
      return;
    }

    try {
      setLoading(true);
      
      // Convert SOL to lamports
      const salaryLamports = solToLamports(parseFloat(salaryPerSecond));
      
      // Send REAL transaction
      const signature = await createPayroll(
        connection,
        wallet,
        new PublicKey(employeeAddress),
        salaryLamports
      );
      
      setTxid(signature);
      
      // Show success with explorer link
      alert(`✅ Payroll created!\n\nTransaction: ${signature}\n\nView on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      
    } catch (error: any) {
      console.error('Error:', error);
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create Payroll</h1>
      
      <input
        type="text"
        placeholder="Employee Wallet Address"
        value={employeeAddress}
        onChange={(e) => setEmployeeAddress(e.target.value)}
      />
      
      <input
        type="number"
        placeholder="Salary per Second (SOL)"
        value={salaryPerSecond}
        onChange={(e) => setSalaryPerSecond(e.target.value)}
      />
      
      <button 
        onClick={handleCreatePayroll}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Payroll'}
      </button>
      
      {txid && (
        <div>
          <p>✅ Transaction: {txid}</p>
          <a 
            href={`https://explorer.solana.com/tx/${txid}?cluster=devnet`}
            target="_blank"
          >
            View on Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
```

### Employee Dashboard: View Real Payroll

**File**: `app/pages/employee.tsx`

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { fetchPayrollJar, calculateAccrued, lamportsToSOL } from '../lib/bagel-client';
import { useState, useEffect } from 'react';

export default function EmployeeDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [payrollData, setPayrollData] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [employerAddress, setEmployerAddress] = useState('');

  // Fetch payroll data when wallet connects
  useEffect(() => {
    if (!wallet.publicKey || !employerAddress) return;

    const fetchData = async () => {
      try {
        const data = await fetchPayrollJar(
          connection,
          wallet.publicKey!,
          new PublicKey(employerAddress)
        );
        
        if (data) {
          setPayrollData(data);
          console.log('✅ Found payroll!', data);
        } else {
          console.log('No payroll found for this employee/employer pair');
        }
      } catch (error) {
        console.error('Error fetching payroll:', error);
      }
    };

    fetchData();
  }, [wallet.publicKey, employerAddress, connection]);

  // Real-time balance updates (client-side calculation)
  useEffect(() => {
    if (!payrollData) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const accrued = calculateAccrued(
        payrollData.lastWithdraw,
        payrollData.salaryPerSecond, // You'd need to decrypt this
        now
      );
      setBalance(accrued);
    }, 1000);

    return () => clearInterval(interval);
  }, [payrollData]);

  return (
    <div>
      <h1>Employee Dashboard</h1>
      
      <input
        type="text"
        placeholder="Employer Address (who created your payroll)"
        value={employerAddress}
        onChange={(e) => setEmployerAddress(e.target.value)}
      />
      
      {payrollData ? (
        <div>
          <h2>Your Payroll</h2>
          <p>Employer: {payrollData.employer.toBase58()}</p>
          <p>Last Withdraw: {new Date(payrollData.lastWithdraw * 1000).toLocaleString()}</p>
          <p>Is Active: {payrollData.isActive ? '✅ Yes' : '❌ No'}</p>
          
          <h3>Current Balance</h3>
          <p className="text-4xl">{lamportsToSOL(balance).toFixed(9)} SOL</p>
          <p className="text-sm">Updates every second</p>
        </div>
      ) : (
        <p>No payroll found. Ask your employer to create one!</p>
      )}
    </div>
  );
}
```

## Connection Setup

**File**: `app/pages/_app.tsx`

```typescript
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css';

export default function App({ Component, pageProps }: AppProps) {
  // Helius Devnet RPC
  const endpoint = useMemo(
    () => 'https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af',
    []
  );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

## Testing Checklist

### Step 1: Employer Creates Payroll
1. Open employer dashboard
2. Connect wallet (must have devnet SOL)
3. Enter employee wallet address
4. Enter salary (e.g., 0.000001 SOL/second)
5. Click "Create Payroll"
6. ✅ **Wallet prompts for signature**
7. ✅ **Transaction sends to blockchain**
8. ✅ **Get transaction ID back**
9. ✅ **Click explorer link to verify**

**Expected Result**: Transaction visible on Solana Explorer with:
- Program: `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU`
- Instruction: `bakePayroll`
- Status: Success ✅

### Step 2: Employee Views Payroll
1. Open employee dashboard with the EMPLOYEE wallet
2. Enter the EMPLOYER's wallet address
3. Click "Fetch Payroll"
4. ✅ **See payroll data from blockchain**
5. ✅ **Balance updates every second**

**Expected Result**: Real on-chain data displayed

## Common Issues & Solutions

### Issue 1: "Account does not exist"
**Cause**: PayrollJar wasn't created yet  
**Solution**: Employer must create payroll first

### Issue 2: "Wallet not connected"
**Cause**: User hasn't connected wallet  
**Solution**: Add wallet connection check before transactions

### Issue 3: "Insufficient funds"
**Cause**: Wallet doesn't have devnet SOL  
**Solution**: Get SOL from https://faucet.solana.com/

### Issue 4: "Transaction failed"
**Cause**: Various (see error message)  
**Solution**: Check console logs, verify all accounts are correct

## Privacy Layer Integration (Future)

Once privacy SDKs have production APIs:

### Arcium MPC (Encrypted Salaries)
```typescript
import { encryptSalary } from '../lib/arcium';

// Encrypt before sending
const encryptedSalary = await encryptSalary(salaryPerSecond);
await createPayroll(connection, wallet, employee, encryptedSalary);
```

### ShadowWire (Private Transfers)
```typescript
import { createPrivateTransfer } from '../lib/shadowwire';

// Withdraw privately
await createPrivateTransfer(connection, wallet, amount);
```

### MagicBlock (Real-Time Streaming)
```typescript
import { subscribeToStream } from '../lib/magicblock';

// Subscribe to balance updates
const stream = await subscribeToStream(payrollJarPDA);
stream.on('update', (newBalance) => {
  setBalance(newBalance);
});
```

## Resources

- **Bagel Client**: `app/lib/bagel-client.ts`
- **Solana Best Practices**: `.cursor/skills/solana-best-practices.md`
- **Frontend Guidelines**: `.cursor/rules/04-frontend-bagel.md`
- **Solana Explorer (Devnet)**: https://explorer.solana.com/?cluster=devnet
- **Get Devnet SOL**: https://faucet.solana.com/

## Support

If you get stuck:
1. Check console logs for detailed errors
2. Verify wallet is connected
3. Check you have devnet SOL
4. Verify addresses are valid base58
5. Check Solana Explorer for transaction details

---

**Remember**: Every user action that modifies state MUST send a real transaction!

🥯 **Simple payroll, private paydays, REAL transactions!**
