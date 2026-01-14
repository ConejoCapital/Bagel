# 🔮 Arcium Circuit Deployment Guide

**Status:** Ready to Deploy  
**Priority:** 2 (After Kamino Yield)  
**Estimated Time:** 30 minutes

---

## 📋 Prerequisites

1. **Arcium CLI installed** (via Docker or native)
2. **Circuit file ready:** `encrypted-ixs/circuits/payroll.arcis`
3. **Devnet cluster offset** (check Arcium Discord for latest)
4. **Solana keypair** with devnet SOL

---

## 🚀 Deployment Steps

### Step 1: Build the Circuit

```bash
cd encrypted-ixs
arcium build circuits/payroll.arcis
```

**Expected Output:**
- Circuit compiled successfully
- Computation definition generated

---

### Step 2: Deploy to Arcium Devnet

```bash
# Get cluster offset from Arcium Discord (#arcium channel)
# Default devnet offset: 1078779259 (verify this is current)

arcium deploy --cluster-offset 1078779259 --keypair-path ~/.config/solana/id.json
```

**Alternative if cluster offset fails:**
```bash
# Check Arcium Discord for latest devnet cluster offset
# Or use: arcium deploy --help to see options
```

---

### Step 3: Extract Computation Offset

After deployment, you'll receive output like:

```
✅ Circuit deployed successfully!
Computation Offset: 0x1234567890abcdef...
Circuit ID: abc123def456...
```

**Save these values!**

---

### Step 4: Update Environment Variables

#### Backend (`programs/bagel/src/privacy/arcium.rs`):

```rust
// Update COMP_DEF_OFFSET_PAYROLL with your Computation Offset
pub const COMP_DEF_OFFSET_PAYROLL: u64 = 0x1234567890abcdef; // YOUR_OFFSET_HERE
```

#### Frontend (`app/.env.local`):

```bash
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=abc123def456... # YOUR_CIRCUIT_ID_HERE
```

---

### Step 5: Test on Devnet

```bash
# Rebuild program with new circuit ID
anchor build

# Deploy updated program
anchor deploy --provider.cluster devnet

# Test payroll creation with encryption
# Should see encrypted salary data in logs
```

---

## 🔍 Verification

1. **Check Circuit Status:**
   ```bash
   arcium status --circuit-id YOUR_CIRCUIT_ID
   ```

2. **Verify in Program:**
   - Create a payroll via frontend
   - Check transaction logs for encrypted data
   - Verify `encrypted_salary_per_second` is populated

3. **Test MPC Computation:**
   - Wait for salary accrual
   - Verify MPC calculation happens off-chain
   - Check that salary remains encrypted

---

## ⚠️ Troubleshooting

### Issue: "Cluster offset not found"
**Solution:** Check Arcium Discord for latest devnet cluster offset

### Issue: "Circuit build failed"
**Solution:** 
- Verify `payroll.arcis` syntax
- Check Arcium CLI version: `arcium --version`
- Ensure Docker is running (if using Docker)

### Issue: "Deployment timeout"
**Solution:**
- Check network connection
- Verify devnet RPC endpoint
- Try with different cluster offset

---

## 📚 Resources

- **Arcium Docs:** https://docs.arcium.com
- **Arcium Discord:** #arcium channel
- **Circuit File:** `encrypted-ixs/circuits/payroll.arcis`
- **Deployment Script:** `scripts/deploy-arcium-circuit.sh`

---

## 🎯 Next Steps After Deployment

1. ✅ Update `arcium.rs` with Computation Offset
2. ✅ Update `.env.local` with Circuit ID
3. ✅ Rebuild and redeploy program
4. ✅ Test encryption in payroll creation
5. ✅ Verify MPC computation works
6. ✅ Document any issues for mainnet deployment

---

**Ready to deploy! 🚀**
