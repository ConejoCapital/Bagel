# 🚀 Bagel: Mainnet Migration Guide

**Date:** January 15, 2026  
**Status:** In Progress  
**Target:** Solana Mainnet with Live Kamino & Arcium

---

## ✅ Migration Checklist

### 1. Configuration Updates ✅
- [x] Updated `Anchor.toml` to Mainnet
- [x] Updated `app/pages/_app.tsx` to Mainnet network
- [x] Updated Kamino market addresses in `constants.rs`
- [x] Added Kamino program IDs

### 2. RPC Endpoints ✅
- [x] Frontend: Helius Mainnet RPC
- [x] Backend: Mainnet cluster configuration

### 3. Kamino Integration ⏳
- [x] Mainnet market addresses added
- [ ] Real Kamino CPI implementation
- [ ] Test deposit/withdraw on mainnet

### 4. Arcium Circuit ⏳
- [ ] Deploy circuit to Arcium Mainnet
- [ ] Update circuit ID in environment variables
- [ ] Test MPC computation on mainnet

### 5. Deployment ⏳
- [ ] Build program for mainnet
- [ ] Deploy program to mainnet
- [ ] Verify deployment
- [ ] Test end-to-end flow

---

## 📋 Mainnet Addresses

### Kamino Finance (Mainnet)
- **Lending Program:** `GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW`
- **Main Market:** `7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF`
- **SOL Reserve:** `d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q`
- **USDC Reserve:** `D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59`

### Bagel Program
- **Program ID:** `8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU`
- **Network:** Solana Mainnet

### RPC Endpoints
- **Helius Mainnet:** `https://mainnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af`
- **Fallback:** `https://api.mainnet-beta.solana.com`

---

## 🔧 Configuration Changes

### Backend (`programs/bagel/src/constants.rs`)
```rust
// Mainnet Kamino addresses
pub const KAMINO_MAIN_MARKET: &str = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";
pub const KAMINO_SOL_RESERVE: &str = "d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q";
pub const KAMINO_LENDING_PROGRAM: &str = "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW";
```

### Frontend (`app/pages/_app.tsx`)
```typescript
const network = WalletAdapterNetwork.Mainnet;
const endpoint = 'https://mainnet.helius-rpc.com/?api-key=...';
```

### Anchor (`Anchor.toml`)
```toml
[provider]
cluster = "Mainnet"
```

---

## 🚀 Deployment Steps

### Step 1: Build for Mainnet
```bash
anchor build
```

### Step 2: Deploy Program
```bash
# Ensure you have mainnet SOL
solana balance

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

### Step 3: Deploy Arcium Circuit
```bash
# Update Arcium.toml for mainnet cluster
# Then deploy
arcium deploy --cluster-offset <mainnet-offset> --keypair-path ~/.config/solana/id.json
```

### Step 4: Update Environment Variables
```bash
# Update app/.env.local
NEXT_PUBLIC_SOLANA_NETWORK=mainnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=<circuit-id>
```

### Step 5: Test
```bash
# Test on mainnet with small amounts
node test-mainnet-flow.mjs
```

---

## ⚠️ Important Notes

### Security
- **CRITICAL:** Test thoroughly on devnet first
- Use small amounts for initial mainnet testing
- Monitor all transactions closely
- Have rollback plan ready

### Costs
- Program deployment: ~0.3-0.5 SOL
- Transaction fees: ~0.000005 SOL per transaction
- Priority fees: Variable (Helius)
- **Total estimated:** 1-2 SOL for initial deployment

### Resources Needed
- Mainnet SOL for deployment
- Arcium mainnet cluster offset
- Kamino SDK access
- Monitoring tools

---

## 📝 Next Steps

1. **Get Mainnet SOL** - Need ~1-2 SOL for deployment
2. **Deploy Program** - Build and deploy to mainnet
3. **Deploy Arcium Circuit** - Get mainnet cluster offset
4. **Test End-to-End** - Small amounts first
5. **Monitor** - Watch for any issues

---

## 🎯 Success Criteria

- [ ] Program deployed to mainnet
- [ ] Arcium circuit deployed and working
- [ ] Kamino deposits working
- [ ] Employee withdrawals working
- [ ] Yield accruing correctly
- [ ] No critical bugs

---

**Ready for mainnet!** 🚀🥯
