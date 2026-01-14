---
description: Frontend UI/UX with the Bagel Brand and Helius RPC
globs: ["app/**/*", "components/**/*", "*.tsx"]
---

# 🥯 The Brand (Frontend Agent)

You build the "Bagel Shop" interface with warm, friendly UX.

## 🎨 Design System

### Colors (Tailwind Config)
```javascript
// tailwind.config.js
colors: {
  toast: {
    50: '#FFF8E7',
    100: '#FFEFC4',
    500: '#FF8C42',
    600: '#E67935',
    700: '#CC6629',
  },
  cream: {
    50: '#FFF8E7',
    100: '#FFF0D4',
    500: '#F5E6D3',
  },
  sesame: {
    500: '#8B4513',
    600: '#723809',
  },
  rye: {
    900: '#2C2416',
  },
}
```

### Typography
- **Headings:** `font-poppins` (rounded, friendly)
- **Body:** `font-inter` (clean, readable)
- **Mono:** `font-mono` (for wallet addresses)

### Component Style
```tsx
// Rounded corners everywhere
className="rounded-xl"  // 12px minimum
className="rounded-2xl" // for cards
className="rounded-full" // for buttons

// Soft shadows
className="shadow-md hover:shadow-lg"

// Warm transitions
className="transition-all duration-300"
```

## 🔌 Helius Integration (Critical)

### Connection Setup
```typescript
// app/utils/connection.ts
import { Connection } from '@solana/web3.js';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY!;

export const connection = new Connection(
  `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
  'confirmed'
);

export const mainnetConnection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
  'confirmed'
);
```

### Priority Fees Hook
```typescript
// app/hooks/usePriorityFee.ts
import { useQuery } from '@tanstack/react-query';

export function usePriorityFee() {
  return useQuery({
    queryKey: ['priorityFee'],
    queryFn: async () => {
      const response = await fetch(
        `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getPriorityFeeEstimate',
            params: [{
              accountKeys: ['BaGe1111111111111111111111111111111111111'],
              options: { recommendedFeeLevel: 'High' }
            }]
          })
        }
      );
      const data = await response.json();
      return data.result.priorityFeeEstimate;
    },
    refetchInterval: 30000, // Update every 30s
  });
}
```

### Transaction Builder with Priority Fees
```typescript
// app/utils/transaction.ts
import { Transaction, ComputeBudgetProgram } from '@solana/web3.js';

export async function buildTransactionWithPriorityFee(
  instructions: TransactionInstruction[],
  priorityFee: number,
): Promise<Transaction> {
  const tx = new Transaction();
  
  // Add priority fee
  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    })
  );
  
  // Add actual instructions
  tx.add(...instructions);
  
  return tx;
}
```

### Enhanced Transaction History
```typescript
// app/hooks/useTransactionHistory.ts
export function useTransactionHistory(address: string) {
  return useQuery({
    queryKey: ['txHistory', address],
    queryFn: async () => {
      const response = await fetch(
        `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getEnrichedTransactions',
            params: {
              addresses: [address],
              limit: 50,
            }
          })
        }
      );
      const data = await response.json();
      return data.result;
    },
  });
}
```

## 🧩 Key Components

### Withdraw Button
```tsx
// components/WithdrawButton.tsx
export function WithdrawButton() {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const priorityFee = usePriorityFee();
  
  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    
    try {
      const tx = await buildTransactionWithPriorityFee(
        [/* withdraw instruction */],
        priorityFee.data
      );
      
      await sendTransaction(tx);
      
      toast.success('🥯 Dough delivered to your wallet!');
    } catch (error) {
      toast.error('Baking failed. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };
  
  return (
    <button
      onClick={handleWithdraw}
      disabled={isWithdrawing}
      className="bg-toast-500 hover:bg-toast-600 text-white 
                 font-semibold py-3 px-6 rounded-full
                 transition-all duration-300 shadow-md hover:shadow-lg
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isWithdrawing ? (
        <>
          <BagelSpinner className="inline mr-2" />
          Baking...
        </>
      ) : (
        '🥯 Get Your Dough'
      )}
    </button>
  );
}
```

### Real-Time Balance Display
```tsx
// components/AccruedBalance.tsx
export function AccruedBalance({ employeeAddress }: Props) {
  const [balance, setBalance] = useState(0);
  
  useEffect(() => {
    // Client-side calculation (no RPC calls)
    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const elapsed = now - lastWithdraw;
      const accrued = salaryPerSecond * elapsed;
      setBalance(accrued);
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [salaryPerSecond, lastWithdraw]);
  
  return (
    <div className="text-center">
      <p className="text-4xl font-bold text-toast-600">
        ${balance.toFixed(2)}
      </p>
      <p className="text-sm text-gray-600 mt-2">
        Rising like dough 📈
      </p>
    </div>
  );
}
```

### Bagel Loading Animation
```tsx
// components/BagelSpinner.tsx
export function BagelSpinner({ className }: Props) {
  return (
    <div className={`inline-block ${className}`}>
      <svg
        className="animate-spin h-5 w-5"
        viewBox="0 0 24 24"
      >
        {/* Bagel SVG path */}
        <path
          fill="currentColor"
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        />
      </svg>
    </div>
  );
}
```

## 📱 Key Pages

### Employer Dashboard (`/bakery`)
- Deposit funds interface
- Add/remove employees
- View "Dough Rise" (yield) metrics
- Employee list with private salaries

### Employee Dashboard (`/payday`)
- Real-time accrued balance (ticking up)
- "Get Your Dough" withdraw button
- Transaction history (via Helius)
- "Bagel Certified Note" generator

## 🎯 Brand Voice in UI Copy

### ✅ Good Examples
- "Start Baking" (instead of "Initialize Payroll")
- "Add Fresh Dough" (instead of "Deposit Funds")
- "Rising Dough" (instead of "Yield APY")
- "Get Your Dough" (instead of "Withdraw")
- "Baking..." (instead of "Processing...")

### ❌ Avoid
- "Initialize vault"
- "Execute transaction"
- "ZK proof verification"
- Cold technical language

## 🔔 Notifications
Use warm, friendly toast notifications:
```typescript
toast.success('🥯 Your payroll is baking!');
toast.error('Oops! The oven got too hot. Try again.');
toast.info('💡 Tip: Your idle dough is rising at 8% APY!');
```
