# Demo & Submission Checklist

**Deadline:** February 1, 2026  
**Video Length:** 3 minutes maximum

---

## Pre-Demo Checklist

### Environment
- [ ] Devnet wallet funded with SOL (2+ SOL)
- [ ] Helius API key configured
- [ ] Range API key configured
- [ ] All environment variables set

### Technical
- [ ] Program deployed to devnet
- [ ] Frontend running on localhost or Vercel
- [ ] All SDK packages installed
- [ ] No console errors

### Integrations Verified
- [ ] Helius RPC working (test with simple call)
- [ ] Range API responding (test with address lookup)
- [ ] Inco encryption working (test create encrypted value)
- [ ] MagicBlock TEE accessible (test auth flow)
- [ ] ShadowWire transfer working (test small amount)

---

## Demo Script (3 minutes)

### 0:00 - 0:20 | The Problem
> "Traditional crypto payroll is a privacy nightmare. Everyone can see your salary, your employer's burn rate, and when you get paid. This is the Glass Office problem."

**Show:** Solana Explorer with public transactions

### 0:20 - 0:50 | Introducing Bagel
> "Bagel solves this with a privacy-first payroll stack. Encrypted salaries, real-time streaming, and zero-knowledge payouts."

**Show:** Landing page, architecture diagram

### 0:50 - 1:30 | Employer Flow
> "Let me show you how an employer sets up private payroll."

1. Connect wallet
2. Show Range compliance check (green badge)
3. Create payroll for employee
4. Deposit funds
5. Point out: "The salary amount is encrypted via Inco"

**Show:** Employer dashboard, compliance badge, encrypted data

### 1:30 - 2:10 | Employee Flow
> "Now let's see the employee experience."

1. Switch to employee wallet
2. Connect and authenticate with MagicBlock TEE
3. Show balance "ticking" in real-time
4. Point out: "This is updating every second in a private rollup"

**Show:** Employee dashboard, real-time balance, TEE indicator

### 2:10 - 2:40 | Private Withdrawal
> "When the employee withdraws, the amount is hidden using ShadowWire's Bulletproof proofs."

1. Click withdraw
2. Show ShadowWire transaction processing
3. Show explorer: "Notice the amount is NOT visible"

**Show:** Withdraw flow, explorer showing hidden amount

### 2:40 - 3:00 | Privacy Audit
> "And here's the proof. Our privacy audit page shows the raw encrypted data on-chain versus what authorized users see. Complete financial privacy on a public blockchain."

**Show:** Privacy audit page with side-by-side comparison

---

## Submission Requirements

### Required Materials
- [ ] Demo video (MP4, max 3 minutes)
- [ ] GitHub repository (public)
- [ ] Deployed program (devnet)
- [ ] README with setup instructions
- [ ] Documentation on how to run

### Recommended Extras
- [ ] Live demo URL (Vercel)
- [ ] Architecture diagram
- [ ] Integration breakdown
- [ ] Honest status report

---

## Video Production Tips

### Recording
- Use OBS or Loom
- 1080p minimum resolution
- Clear audio (use headset mic)
- Hide bookmarks bar
- Use browser zoom for readability

### Content
- Practice the script 2-3 times
- Keep transitions smooth
- Don't rush - 3 minutes is enough
- Show real transactions on devnet
- Highlight privacy features prominently

### Post-Production
- Add subtle background music (optional)
- Include captions/subtitles
- Export at high quality
- Test playback before uploading

---

## Common Demo Pitfalls

### Avoid These
- ❌ Wallet not connected at start
- ❌ Insufficient SOL for transactions
- ❌ Wrong network (mainnet instead of devnet)
- ❌ API rate limits hit during demo
- ❌ Console errors visible
- ❌ Slow/laggy UI
- ❌ Talking too fast

### Do These
- ✅ Pre-fund all wallets
- ✅ Clear browser cache
- ✅ Close unnecessary tabs
- ✅ Have backup video recording
- ✅ Test full flow right before recording
- ✅ Keep explanations simple
- ✅ Show real transactions

---

## Submission Checklist

### Before Submitting
- [ ] Video uploaded and accessible
- [ ] GitHub repo is public
- [ ] README is comprehensive
- [ ] All links work
- [ ] Program ID documented
- [ ] Environment setup clear

### Prize Category Selection
- [ ] Track 01: Private Payments
- [ ] Track 02: Privacy Tooling
- [ ] Helius Bounty
- [ ] Range Bounty
- [ ] Inco Bounty
- [ ] MagicBlock Bounty
- [ ] ShadowWire Bounty

### Contact Info
- [ ] Team name: Conejo Capital
- [ ] Team members listed
- [ ] Contact email provided
- [ ] Twitter/social links

---

## Emergency Fixes

### If Devnet is Down
- Switch to localnet for demo
- Pre-record transactions
- Explain in video

### If API Fails
- Show cached response
- Explain the integration intent
- Demo with mock data

### If Transfer Fails
- Have backup transaction ready
- Show explorer of previous successful tx
- Explain what should happen

---

## Post-Submission

- [ ] Share on Twitter with #PrivacyHack
- [ ] Post in hackathon Discord
- [ ] Thank sponsors publicly
- [ ] Prepare for judge questions
