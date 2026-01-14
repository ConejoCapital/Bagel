# 🔮 Arcium CLI Deployment Guide (Dashboard-Free)

**Updated:** January 15, 2026, 2:00 AM PST  
**Reason:** Arcium dashboard inaccessible for Solana Privacy Hack 2026  
**Solution:** CLI-first deployment workflow

---

## 🎯 Why CLI Instead of Dashboard?

The Arcium dashboard (dashboard.arcium.com) is currently:
- Gated for fellowship members only
- Or temporarily unavailable

**Good News:** The Arcium team has prioritized CLI deployment for the hackathon!

---

## ✅ Prerequisites

1. **Docker Installed and Running**
   - Download: https://docs.docker.com/desktop/install/mac-install/
   - Start Docker Desktop

2. **Arcium CLI Installed**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
   arcup install
   ```

3. **Solana Wallet with Devnet SOL**
   ```bash
   solana-keygen new  # If you don't have one
   solana airdrop 2 --url devnet
   ```

---

## 🚀 Deployment Steps

### Step 1: Build the Circuit

```bash
cd "/Users/thebunnymac/Desktop/Solana Privacy Hackaton"
arcium build
```

**Expected Output:**
```
Building circuit...
✓ Circuit compiled successfully
✓ Build artifacts created: build/payroll.hash
```

**What This Does:**
- Compiles `programs/bagel/circuits/payroll.arcis`
- Generates build artifacts
- Validates circuit syntax

---

### Step 2: Initialize Computation (Get Circuit ID)

**Current Devnet Cluster Offset:** `1078779259`

**Command (Try this first):**
```bash
arcium init-computation \
  --path programs/bagel/circuits/payroll.arcis \
  --cluster-offset 1078779259
```

**Alternative (if init-computation not available):**
```bash
arcium deploy \
  --skip-program \
  --path programs/bagel/circuits/payroll.arcis \
  --cluster-offset 1078779259
```

**Expected Output:**
```
Initializing computation on devnet...
✓ Computation initialized
Computation Definition Offset: ABC123XYZ...
Circuit ID: ABC123XYZ...
Transaction: https://explorer.solana.com/tx/...
```

**IMPORTANT:** Copy the "Computation Definition Offset" or "Circuit ID" from the output!

---

### Step 3: Verify Deployment

Visit the **Arcium Testnet Explorer:**
https://arcium.com/testnet

1. Search for your wallet address
2. Find the deployment transaction
3. Confirm Circuit ID matches

---

## 📝 After You Have the Circuit ID

### Tell Me (Cursor):

Just say:
> "Circuit ID is: ABC123XYZ..."

And I'll automatically update these 3 files:

1. **`app/.env.local`**
   ```bash
   NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=ABC123XYZ...
   ```

2. **`app/lib/arcium.ts`**
   ```typescript
   this.circuitId = 'ABC123XYZ...';
   ```

3. **`programs/bagel/src/privacy/arcium.rs`**
   ```rust
   let circuit_id_str = "ABC123XYZ...";
   ```

### Then Rebuild:

```bash
anchor build
anchor deploy --provider.cluster devnet
```

### Then Test:

```bash
anchor test --skip-local-validator
```

---

## 🛠️ Automated Script

We have a script that does all of this for you!

```bash
./scripts/deploy-arcium-cli.sh
```

**What it does:**
1. Validates circuit file exists
2. Checks Arcium CLI installed
3. Builds the circuit
4. Initializes computation on devnet
5. Saves deployment log
6. Provides next steps

---

## ⚠️ Troubleshooting

### Error: "Arcium CLI not found"

**Solution:**
```bash
# Install Docker Desktop first
# Then:
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
arcup install

# Restart terminal
arcium --version
```

### Error: "Cluster offset invalid"

**Cause:** Cluster offset changes during devnet resets

**Solution:**
1. Join #arcium channel in Encode Club Discord
2. Ask: "What's the current devnet cluster offset?"
3. Update the offset in your command

**Current Known Offset (as of Jan 15, 2026):** `1078779259`

### Error: "Insufficient funds"

**Solution:**
```bash
solana balance --url devnet
solana airdrop 2 --url devnet
```

### Error: "Circuit build failed"

**Check:**
1. Are you in the project root?
2. Does `programs/bagel/circuits/payroll.arcis` exist?
3. Is Docker running?
4. Try: `arcium --version` to verify CLI works

---

## 📊 Verification Checklist

After deployment, verify:

- [ ] Circuit built successfully
- [ ] Computation initialized on devnet
- [ ] Circuit ID obtained from logs
- [ ] Verified on testnet explorer
- [ ] Ready to update files

---

## 🔗 Helpful Resources

### Arcium Resources:
- **Testnet Explorer:** https://arcium.com/testnet
- **Deployment Docs:** https://docs.arcium.com/developers/deployment
- **CLI Reference:** Run `arcium --help`

### Support:
- **Discord:** #arcium channel in Encode Club
- **Issue Tracker:** Ask mentors about current cluster offset
- **Documentation:** Check for CLI updates

---

## 💡 Pro Tips

1. **Save your Circuit ID immediately** - you'll need it multiple times
2. **Verify on testnet explorer** - confirms successful deployment
3. **Check Discord for updates** - cluster offset may change
4. **Keep deployment logs** - useful for debugging

---

## 🎯 Expected Timeline

- **Build circuit:** 1-2 minutes
- **Initialize computation:** 2-5 minutes
- **Verify on explorer:** 1 minute
- **Update files:** 5 minutes (automated)
- **Rebuild program:** 2-3 minutes
- **Run tests:** 5-10 minutes

**Total:** 15-25 minutes

---

## 📞 When You Have the Circuit ID

**Just tell me:**
> "Circuit ID is: <YOUR_ID>"

**I'll immediately:**
1. ✅ Update `.env.local`
2. ✅ Update `arcium.ts`
3. ✅ Update `arcium.rs`
4. ✅ Provide rebuild commands
5. ✅ Prepare test commands
6. ✅ Get you ready for $10k bounty submission!

---

**🥯 Let's get that Circuit ID and finish strong! 🚀**
