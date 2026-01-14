# 🚀 Deploy Bagel to Vercel NOW!

**All errors are fixed!** Time to go live in 5 minutes!

## Quick Deploy (Recommended)

### Option 1: Vercel Dashboard (Easiest!)

1. **Go to Vercel**
   - Visit: https://vercel.com/new
   - Sign in with GitHub

2. **Import Your Repo**
   - Search for "Bagel"
   - Click "Import"

3. **Configure**
   ```
   Root Directory: app
   Framework: Next.js
   Build Command: (leave default)
   Output Directory: (leave default)
   ```

4. **Add Environment Variables**
   Click "Environment Variables" and add these 3:
   
   ```
   Name: NEXT_PUBLIC_HELIUS_API_KEY
   Value: 06227422-9d57-42de-a7b3-92f1491c58af
   
   Name: NEXT_PUBLIC_SOLANA_NETWORK
   Value: devnet
   
   Name: NEXT_PUBLIC_BAGEL_PROGRAM_ID
   Value: 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
   ```

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Done! 🎉

Your site will be live at: `https://bagel-[random].vercel.app`

### Option 2: Vercel CLI (For Developers)

```bash
# Install Vercel CLI (if you haven't)
npm i -g vercel

# Navigate to app directory
cd app

# Deploy!
vercel

# Follow the prompts:
# ✓ Set up and deploy? [Y/n] y
# ✓ Which scope? (your account)
# ✓ Link to existing project? [y/N] n
# ✓ What's your project's name? bagel
# ✓ In which directory is your code located? ./

# After first deploy, add environment variables:
vercel env add NEXT_PUBLIC_HELIUS_API_KEY production
# Paste: 06227422-9d57-42de-a7b3-92f1491c58af

vercel env add NEXT_PUBLIC_SOLANA_NETWORK production
# Enter: devnet

vercel env add NEXT_PUBLIC_BAGEL_PROGRAM_ID production
# Paste: 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU

# Deploy to production with env vars
vercel --prod
```

## What Happens Next?

1. **Vercel builds your site** (2-3 minutes)
   - Installs dependencies
   - Runs `npm run build`
   - Optimizes assets

2. **Your site goes live!**
   - You get a URL: `bagel-xyz.vercel.app`
   - Automatic HTTPS
   - Global CDN

3. **Future updates are automatic!**
   - Every push to `main` = auto-deploy
   - Every PR = preview deployment

## Verify Your Deployment

Once deployed, test these:

### 1. Homepage
```
https://your-deployment.vercel.app
```
✅ Should show: Bagel logo, "Connect Wallet" button

### 2. Wallet Connection
- Click "Select Wallet"
- Choose Phantom or Solflare
- Should connect without errors

### 3. Employer Dashboard
```
https://your-deployment.vercel.app/employer
```
✅ Should show: Create payroll form

### 4. Employee Dashboard
```
https://your-deployment.vercel.app/employee
```
✅ Should show: Streaming balance demo

### 5. Console Check
- Open browser DevTools (F12)
- Go to Console tab
- Should see: **0 errors!** ✨

## Share Your Live Demo

Once deployed, update these:

### 1. GitHub README
Add at the top:
```markdown
## 🌐 Live Demo
**Try it now:** https://bagel.vercel.app

Connect your Solana wallet on devnet and experience privacy-first payroll!
```

### 2. Submission Form
```
Project Name: Bagel
Live Demo: https://bagel.vercel.app
GitHub: https://github.com/ConejoCapital/Bagel
```

### 3. Social Media
```
🥯 Bagel is LIVE!

Privacy-first payroll for Solana with real-time streaming payments!

Try the demo: https://bagel.vercel.app

Features:
🔒 Encrypted salaries (Arcium MPC)
⚡ Real-time streaming (MagicBlock PERs)
🕵️ Private transfers (ShadowWire ZK)
💰 Auto yield (Privacy Cash)

Built for #SolanaPrivacyHack 2026
```

## Troubleshooting

### Build Failed?

**Check the logs** in Vercel dashboard:
- Look for the red error message
- Common issues:
  - Missing dependencies → `npm install` locally first
  - Environment variables → Double-check they're added
  - Build command → Should be `npm run build`

### Site Loads but Wallet Won't Connect?

**Check environment variables**:
1. Go to Vercel dashboard
2. Project Settings → Environment Variables
3. Verify all 3 variables are set
4. Click "Redeploy" button

### Hydration Errors?

**Should be fixed!** But if you see any:
1. Check that `WalletButton` component is used everywhere
2. Verify `dynamic` imports have `ssr: false`
3. Clear browser cache and reload

### 404 on Pages?

**Check root directory**:
- Should be set to `app` in Vercel settings
- Not the root of the repo!

## Post-Deployment Checklist

- [ ] Site loads successfully
- [ ] Wallet connects without errors
- [ ] Employer dashboard works
- [ ] Employee dashboard works
- [ ] Streaming demo updates every second
- [ ] Console shows 0 errors
- [ ] Tested on mobile
- [ ] Updated README with live URL
- [ ] Shared on social media
- [ ] Submitted to hackathon!

## Performance Tips

### Check Your Score
Use these tools to verify performance:
- **Lighthouse**: Chrome DevTools → Lighthouse tab
- **PageSpeed**: https://pagespeed.web.dev/
- **GTmetrix**: https://gtmetrix.com/

Target scores:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+

### Vercel Analytics
Enable in dashboard:
- Go to your project
- Analytics tab
- Enable Web Analytics
- View real-time traffic!

## Custom Domain (Optional)

Want `bagel.finance` instead of `bagel.vercel.app`?

1. **Buy a domain** (Namecheap, Google Domains, etc.)

2. **Add to Vercel**:
   - Project Settings → Domains
   - Enter your domain
   - Follow DNS instructions

3. **Update DNS** at your registrar:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

4. **Wait for SSL** (automatic, ~5 minutes)

## Monitor Your Demo

### During Hackathon Judging

**Watch Analytics**:
- Vercel dashboard → Analytics
- See judge visits in real-time!
- Track which pages they view

**Check Logs**:
- Functions → Logs
- See any errors immediately
- Fix issues fast

### After Deployment

**Keep it Running**:
- Vercel Free Tier = always on
- No maintenance needed
- Auto-updates when you push to GitHub

## Success!

Your Bagel demo is now live and accessible worldwide! 🌍🥯

**What You've Achieved:**
✅ Fixed all 6 errors
✅ Deployed to production
✅ Live demo for judges
✅ Automatic HTTPS
✅ Global CDN
✅ Auto-deploys on push

**Next:**
1. Share your URL with judges
2. Record demo video (use live site!)
3. Submit to hackathon
4. Win prizes! 🏆

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Status**: https://www.vercel-status.com
- **GitHub Issues**: Open an issue in your repo
- **Discord**: Ask in Solana Privacy Hack Discord

## Final Checklist

Before submitting to judges:

- [ ] Live site is working
- [ ] All features tested
- [ ] README updated with live URL
- [ ] Demo video recorded (using live site)
- [ ] Submission form filled out
- [ ] Social media posts shared
- [ ] Team members notified
- [ ] Backup deployment tested

**YOU'RE READY TO IMPRESS THE JUDGES!** 🚀🥯✨

---

**Your Live Demo:**
```
https://bagel.vercel.app
```
*(Replace with your actual Vercel URL)*

**GitHub Repo:**
```
https://github.com/ConejoCapital/Bagel
```

**Deployed Program:**
```
https://explorer.solana.com/address/8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU?cluster=devnet
```

Simple payroll, private paydays, and a little extra cream cheese. 🥯
