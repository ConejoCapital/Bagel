# 🚨 CRITICAL: Phantom Shows "Solana" Instead of "Solana Devnet"

## The Problem

Your Phantom wallet transaction popup shows:
```
Network: Solana
```

But it SHOULD show:
```
Network: Solana Devnet
```

## Why This Happens

Even with "Testnet Mode" ON, Phantom defaults to mainnet unless you explicitly SELECT the network!

## ✅ THE FIX (Step-by-Step with Screenshots)

### Step 1: Open Phantom Settings
1. Click Phantom extension icon
2. Click ⚙️ Settings (gear icon, bottom right)

### Step 2: Enable Testnet Mode (You probably did this!)
1. Scroll to "Developer Settings"
2. Toggle "Testnet Mode" to **ON** ✅
3. **BUT THIS ISN'T ENOUGH!**

### Step 3: SELECT DEVNET NETWORK (THIS IS THE KEY!)
1. **Close settings** (go back to main wallet view)
2. At the **TOP of the wallet**, you'll see "Solana" with a dropdown arrow
3. **CLICK ON "Solana"** (this opens network selector)
4. You should see options:
   - Solana (Mainnet)
   - **Solana Devnet** ← SELECT THIS!
   - Solana Testnet
5. **Click "Solana Devnet"**

### Step 4: Verify
1. The wallet should now show "Solana Devnet" at the top
2. Refresh Bagel page
3. Try creating a transaction
4. The popup should now say "Network: **Solana Devnet**"

## 🎯 Quick Test

After switching:
1. Go to https://bagel-phi.vercel.app/employer
2. Click "Create Payroll"
3. **Check the Phantom popup**
4. Should say: "Network: **Solana Devnet**" (NOT just "Solana")

## Common Mistake

❌ **Wrong**: Enabling Testnet Mode but staying on "Solana"  
✅ **Right**: Enabling Testnet Mode AND selecting "Solana Devnet"

The setting enables the option, but you still need to SELECT it!

## Still Not Working?

If you still see "Solana" instead of "Solana Devnet":

1. **Completely close Phantom** (close extension popup)
2. **Click Phantom icon again** to reopen
3. **Check the network at the top**
4. If it says "Solana", click it and select "Solana Devnet"
5. **Refresh your browser tab**

## Why This Matters

When Phantom is on "Solana" (mainnet):
- It will try to sign transactions for mainnet
- But our program ONLY exists on devnet
- Transaction will fail or go to wrong network
- You might accidentally use real SOL!

When Phantom is on "Solana Devnet":
- ✅ Signs transactions for devnet
- ✅ Uses devnet SOL (free from faucet)
- ✅ Program exists there
- ✅ Everything works!

---

**TL;DR**: Click "Solana" at the top of Phantom and select "Solana Devnet"! 🎯
