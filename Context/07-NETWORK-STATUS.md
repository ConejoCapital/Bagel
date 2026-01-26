# Network & Deployment Status

**Last Updated:** January 25, 2026

---

## Quick Reference

| Tool | Network | Status | Ready for Demo |
|------|---------|--------|----------------|
| **Helius** | Devnet + Mainnet | ✅ READY | YES |
| **Range** | API (any) | ✅ READY | YES |
| **Inco SVM** | Devnet Beta | ⚠️ BETA | YES (with caveats) |
| **MagicBlock PER** | Devnet | ✅ READY | YES |
| **ShadowWire** | Mainnet | ⚠️ VERIFY DEVNET | LIKELY |

---

## Detailed Status

### Helius

**Status:** Production Ready

| Item | Value |
|------|-------|
| Devnet RPC | `https://devnet.helius-rpc.com/?api-key={KEY}` |
| Mainnet RPC | `https://mainnet.helius-rpc.com/?api-key={KEY}` |
| DAS API | Available |
| Free Tier | Yes (limited requests) |

**Notes:**
- Reliable and fast
- No special setup needed
- Just swap RPC endpoint

---

### Range

**Status:** Production Ready

| Item | Value |
|------|-------|
| API Endpoint | `https://api.range.org/v1/` |
| Network | API-based (works with any chain) |
| Free Tier | 10 Risk API calls/month |

**Rate Limits (Trial):**
- Risk API: 10/month
- Data API: 100/month
- Faraday API: 100/month

**Notes:**
- API key required
- Works with any Solana network
- May need to cache responses for demo

---

### Inco SVM

**Status:** Devnet Beta

| Item | Value |
|------|-------|
| Program ID | `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj` |
| Network | Devnet only |
| Rust Crate | `inco-lightning = "0.1.4"` |

**Limitations:**
- Beta - features may change
- Devnet only - no mainnet yet
- Documentation still evolving

**Notes:**
- Good for hackathon demo
- May have rough edges
- Check Discord for latest updates

---

### MagicBlock PER

**Status:** Devnet Ready

| Item | Value |
|------|-------|
| Delegation Program | `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` |
| Permission Program | `ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1` |
| TEE Endpoint | `https://tee.magicblock.app` |
| SDK | `ephemeral-rollups-sdk = "0.8.0"` |

**Validators:**
| Region | Pubkey |
|--------|--------|
| TEE | `FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA` |
| US | `MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd` |
| EU | `MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e` |
| Asia | `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57` |

**Notes:**
- Devnet working well
- TEE authentication required
- Live demo template available

---

### ShadowWire

**Status:** Mainnet Ready (Devnet TBD)

| Item | Value |
|------|-------|
| Mainnet Program | `GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD` |
| NPM Package | `@radr/shadowwire@1.1.1` |
| Devnet Program | **VERIFY WITH TEAM** |

**Supported Tokens:**
- SOL (0.5% fee)
- USDC (1% fee)
- USD1 (1% fee)
- 19+ other tokens

**Notes:**
- SDK works well
- Mainnet is production-ready
- **Action:** Contact Radr Labs for devnet program ID
- Fallback: Use mainnet with small amounts for demo

---

## Action Items

### Immediate
1. [ ] Get Helius API key
2. [ ] Get Range API key
3. [ ] Verify ShadowWire devnet support

### Before Demo
1. [ ] Test all integrations on devnet
2. [ ] Fund demo wallets
3. [ ] Cache Range API response (rate limits)
4. [ ] Pre-authenticate MagicBlock TEE

---

## Fallback Plans

### If Inco Fails
- Use mock encrypted values
- Show concept with simulated encryption
- Explain: "Production uses Inco SVM"

### If MagicBlock Fails
- Skip streaming portion
- Show static balance
- Explain: "PER enables real-time updates"

### If ShadowWire Fails on Devnet
- Use mainnet with tiny amount (0.001 SOL)
- Show real private transfer
- Explain: "Works on mainnet, devnet coming"

### If Range Rate Limited
- Use cached response
- Show integration code
- Explain: "Demo limited by trial tier"

---

## Contacts

| Tool | Discord/Support |
|------|-----------------|
| Helius | Discord: Helius |
| Range | support@range.org |
| Inco | Discord: Inco Network |
| MagicBlock | Discord: MagicBlock |
| ShadowWire | Telegram: @radrportal |

---

## Version Compatibility

```toml
# Cargo.toml versions that work together
[dependencies]
anchor-lang = "0.29.0"
inco-lightning = { version = "0.1.4", features = ["cpi"] }
ephemeral-rollups-sdk = { version = "0.8.0", features = ["anchor"] }
```

```json
// package.json versions
{
  "@radr/shadowwire": "^1.1.1",
  "@magicblock-labs/ephemeral-rollups-sdk": "latest",
  "@solana/web3.js": "^1.87.0"
}
```
