# 🚨 CRITICAL: Switch Your Wallet to Devnet!

**ISSUE**: Your wallet is on **Mainnet** but Bagel is deployed to **Devnet**!

**RESULT**: Transactions will fail because the program doesn't exist on mainnet.

---

## 🔍 The Problem

When you saw the Phantom wallet prompt showing "Solana" network, that means you're on **Mainnet**. 

But Bagel's program (`8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU`) is only deployed on **Devnet** for testing.

---

## ✅ The Solution: Switch to Devnet

### For Phantom Wallet

1. **Open Phantom Extension**
   - Click the Phantom icon in your browser

2. **Open Settings**
   - Click the gear icon (⚙️) in the bottom right

3. **Enable Testnet Mode**
   - Scroll down to "Developer Settings"
   - Toggle **"Testnet Mode"** to **ON**

4. **Select Devnet**
   - At the top of the wallet, click where it says "Mainnet"
   - Select **"Devnet"** from the dropdown

5. **Refresh Bagel**
   - Go back to https://bagel-phi.vercel.app
   - Refresh the page
   - You should now see a **GREEN banner** saying "✅ Connected to Devnet"

### For Solflare Wallet

1. **Open Solflare Extension**
   - Click the Solflare icon

2. **Click Network Selector**
   - At the top, click where it says "Mainnet"

3. **Select Devnet**
   - Choose **"Devnet"** from the dropdown

4. **Refresh Bagel**
   - Go back to https://bagel-phi.vercel.app
   - Refresh the page
   - See the green confirmation!

---

## 💰 Get Devnet SOL

After switching to Devnet, you'll need some SOL for transactions:

1. **Go to Solana Faucet**
   - Visit: https://faucet.solana.com/

2. **Enter Your Wallet Address**
   - Copy your wallet address from Phantom/Solflare
   - Paste it into the faucet

3. **Request Airdrop**
   - Click "Confirm Airdrop"
   - Wait 30-60 seconds
   - You'll receive 1-2 SOL

4. **Verify Balance**
   - Check your wallet
   - Should see SOL balance increase

---

## 🎯 What You'll See After Switching

### ✅ When Correct (Devnet)
- **Green banner** at top: "✅ Connected to Devnet - You're good to go!"
- Wallet shows "Devnet" in network selector
- Transactions will work!

### ❌ When Wrong (Mainnet)
- **Red banner** at top: "⚠️ Wrong Network Detected!"
- Wallet shows "Solana" or "Mainnet"
- Transactions will fail!

---

## 🧪 Test It Works

After switching to Devnet:

1. **Go to Employer Page**
   - https://bagel-phi.vercel.app/employer

2. **Create a Test Payroll**
   - Employee Address: Your own wallet address
   - Salary: 0.000001

3. **Click "Create Payroll"**
   - Wallet should prompt
   - **Network should show "Devnet"** in the popup
   - Approve the transaction

4. **Verify on Explorer**
   - Click the explorer link
   - You should see your transaction on **Devnet**!

---

## 🔧 Troubleshooting

### "I switched but still see red warning"
- Refresh the page (hard refresh: Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Disconnect and reconnect your wallet
- Clear browser cache

### "Wallet popup doesn't show devnet"
- Go back to wallet settings
- Make sure "Testnet Mode" is ON
- Make sure "Devnet" is selected
- Try closing and reopening the wallet extension

### "Transaction failed"
- Make sure you have devnet SOL (check balance)
- Verify you're on Devnet (green banner should show)
- Check console for error messages
- Try again (sometimes network is slow)

---

## 🎬 Why Devnet First?

**Testing Safety**: We deploy to Devnet first to:
- Test with free SOL (no real money)
- Catch bugs safely
- Iterate quickly
- Get feedback from judges

**Mainnet Later**: After the hackathon, if we win and get funding, we'll:
- Do a security audit
- Deploy to mainnet
- Add a network toggle
- Let users choose devnet or mainnet

---

## 📊 Network Info

### Current Deployment
- **Network**: Solana Devnet
- **Program ID**: `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU`
- **RPC**: Helius Devnet
- **Explorer**: https://explorer.solana.com/?cluster=devnet

### Future Plans
- Add network toggle in UI
- Support both devnet and mainnet
- Let users choose their network
- Clear indicators for each network

---

## ✅ Checklist

Before creating transactions:

- [ ] Wallet extension set to "Devnet"
- [ ] See green banner on Bagel app
- [ ] Have devnet SOL in wallet
- [ ] Can see program on devnet explorer
- [ ] Ready to test!

---

**Once you switch to Devnet, everything will work perfectly!** 🎉

The app now has **automatic network detection** so you'll always know if you're on the right network!
