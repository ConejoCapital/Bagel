# Deploying Bagel to Vercel

A step-by-step guide to deploy the Bagel frontend to Vercel for free hosting!

## Prerequisites

- GitHub account (you already have the repo!)
- Vercel account (free tier is perfect)
- The Bagel repo pushed to GitHub ✅

## Quick Deploy (5 Minutes)

### Option 1: One-Click Deploy

1. **Visit Vercel**
   - Go to https://vercel.com
   - Click "Sign Up" or "Log In"
   - Use "Continue with GitHub"

2. **Import Your Repository**
   - Click "Add New..." → "Project"
   - Find "Bagel" in your repository list
   - Click "Import"

3. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Root Directory: app
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_HELIUS_API_KEY=06227422-9d57-42de-a7b3-92f1491c58af
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   NEXT_PUBLIC_BAGEL_PROGRAM_ID=8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
   ```

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your site will be live at `bagel-xyz.vercel.app` (or similar)

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to app directory
cd app

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? bagel
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add NEXT_PUBLIC_HELIUS_API_KEY
# Enter: 06227422-9d57-42de-a7b3-92f1491c58af

vercel env add NEXT_PUBLIC_SOLANA_NETWORK
# Enter: devnet

vercel env add NEXT_PUBLIC_BAGEL_PROGRAM_ID
# Enter: 8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU

# Deploy to production
vercel --prod
```

## Configuration Files

### vercel.json (Optional - for advanced settings)

Create `app/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_HELIUS_API_KEY": "@helius-api-key",
    "NEXT_PUBLIC_SOLANA_NETWORK": "devnet",
    "NEXT_PUBLIC_BAGEL_PROGRAM_ID": "8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU"
  }
}
```

### .vercelignore

Create `app/.vercelignore`:

```
node_modules
.next
.env.local
*.log
```

## Automatic Deployments

Vercel automatically deploys when you push to GitHub!

### Production Deployments
- Every push to `main` branch → Production deployment
- URL: `bagel.vercel.app`

### Preview Deployments
- Every push to other branches → Preview deployment
- URL: `bagel-git-branch-name.vercel.app`

### Pull Request Previews
- Every PR → Unique preview URL
- Perfect for testing before merging!

## Custom Domain (Optional)

### Free Subdomain
Vercel provides: `bagel-xyz.vercel.app`

### Custom Domain
1. Go to Project Settings → Domains
2. Add your domain (e.g., `bagel.finance`)
3. Update DNS records at your registrar
4. Vercel auto-provisions SSL certificate

Example DNS records:
```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

## Environment Variables Management

### Add Variables
```bash
vercel env add VARIABLE_NAME
```

### List Variables
```bash
vercel env ls
```

### Pull Variables Locally
```bash
vercel env pull
```

### Different Environments
Vercel supports:
- **Production** - Live site
- **Preview** - Branch deployments
- **Development** - Local dev

Set variables per environment in the dashboard.

## Build Optimization

### Next.js Config Updates

Update `app/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
  // Optimize images (if you add any)
  images: {
    domains: [],
  },
  // Enable compression
  compress: true,
  // Optimize fonts
  optimizeFonts: true,
};

module.exports = nextConfig;
```

## Performance Monitoring

Vercel provides:
- **Analytics** - Page views, top pages
- **Speed Insights** - Core Web Vitals
- **Logs** - Function logs, errors

Access in dashboard under "Analytics" and "Speed Insights"

## Troubleshooting

### Build Fails

**Error: Module not found**
```bash
# Make sure all dependencies are in package.json
cd app
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

**Error: Build exceeded time limit**
```bash
# Check for infinite loops in build
# Review next.config.js
# Check build logs in Vercel dashboard
```

### Runtime Errors

**Wallet adapter not loading**
- Check browser console
- Verify environment variables are set
- Ensure WalletButton component is properly imported

**RPC connection fails**
- Verify Helius API key is correct
- Check network is set to "devnet"
- Test RPC endpoint manually

### Hydration Errors (FIXED!)

We fixed these by:
- Using `dynamic` imports for wallet components
- Adding `ssr: false` to wallet button
- Creating a client-only WalletButton component

## Monitoring Deployment

### Check Status
```bash
vercel ls
```

### View Logs
```bash
vercel logs <deployment-url>
```

### Inspect Build
- Go to Vercel Dashboard
- Click on deployment
- View "Build Logs" tab

## Production Checklist

Before deploying to production:

- [ ] All environment variables added
- [ ] Build succeeds locally (`npm run build`)
- [ ] No console errors in browser
- [ ] Wallet connection works
- [ ] All pages load correctly
- [ ] Mobile responsive
- [ ] SEO meta tags added
- [ ] Analytics configured (optional)
- [ ] Custom domain configured (optional)

## Updating Your Deployment

### Via Git
```bash
# Make changes
git add .
git commit -m "Update feature X"
git push

# Vercel auto-deploys!
```

### Via CLI
```bash
# From app directory
vercel --prod
```

### Rollback
```bash
# In Vercel Dashboard
# Go to Deployments
# Click "..." on previous deployment
# Click "Promote to Production"
```

## Sharing Your Demo

Once deployed, share these URLs:

### For Judges
```
Live Demo: https://bagel.vercel.app
GitHub: https://github.com/ConejoCapital/Bagel
Program: https://explorer.solana.com/address/8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU?cluster=devnet
```

### For Social Media
```
🥯 Bagel - Privacy-First Payroll for Solana

Real-time streaming payments with zero-knowledge privacy!

🔒 Encrypted salaries (Arcium MPC)
⚡ Real-time streaming (MagicBlock PERs)
🕵️ Private transfers (ShadowWire ZK)
💰 Auto yield (Privacy Cash)

Try it: https://bagel.vercel.app
```

## Cost

**Vercel Free Tier Includes:**
- Unlimited deployments
- Automatic HTTPS
- 100GB bandwidth/month
- 100 hours build time/month
- Preview deployments
- Analytics (basic)

**Perfect for hackathon demos!**

## Advanced: Multiple Environments

### Staging Environment
```bash
# Create staging branch
git checkout -b staging

# Deploy to staging
git push origin staging

# Vercel creates: bagel-git-staging.vercel.app
```

### Production Environment
```bash
# Merge to main
git checkout main
git merge staging
git push origin main

# Vercel deploys to: bagel.vercel.app
```

## Integration with GitHub

Vercel automatically:
- ✅ Comments on PRs with preview URLs
- ✅ Updates deployment status
- ✅ Shows build status in GitHub checks
- ✅ Deploys on merge

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env.local` to GitHub
   - Use Vercel's encrypted storage
   - Different keys for production/staging

2. **API Keys**
   - Use environment-specific keys
   - Rotate keys periodically
   - Monitor usage in Helius dashboard

3. **Domain Security**
   - Enable HTTPS (automatic on Vercel)
   - Set up HSTS headers
   - Use Content Security Policy

## Analytics & Monitoring

### Vercel Analytics (Built-in)
```javascript
// Automatically enabled, no code needed!
// View in dashboard under "Analytics"
```

### Custom Analytics (Optional)
Add to `pages/_app.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

## Getting Help

### Vercel Support
- Documentation: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions
- Status: https://www.vercel-status.com

### Bagel Issues
- GitHub Issues: https://github.com/ConejoCapital/Bagel/issues
- Check TROUBLESHOOTING.md

## Success Metrics

After deployment, monitor:
- **Response Time** - Should be < 1s
- **Uptime** - Should be 99.9%+
- **Build Time** - Should be < 2 minutes
- **Bandwidth** - Track usage

## Demo Links to Share

Once deployed, update:
- README.md - Add Vercel URL
- SUBMISSION_READY.md - Add live demo link
- DEMO_SCRIPT.md - Reference live site
- GitHub repo description

## Example Deployment Flow

```bash
# 1. Make sure everything works locally
cd app
npm run build
npm start

# 2. Commit and push
git add .
git commit -m "Ready for Vercel deployment"
git push

# 3. Deploy to Vercel
vercel --prod

# 4. Test deployed site
# Visit the URL provided

# 5. Share with judges!
```

## Post-Deployment Checklist

- [ ] Site loads at Vercel URL
- [ ] Wallet connection works
- [ ] All pages accessible
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Employer flow works
- [ ] Employee flow works
- [ ] Real-time streaming works
- [ ] Share URL with team
- [ ] Update README with link
- [ ] Test from different devices
- [ ] Submit to hackathon!

## Final Notes

**Your Bagel demo will be live and accessible to judges worldwide!**

Benefits:
- ✅ No need to run locally
- ✅ Always online
- ✅ Fast global CDN
- ✅ Professional presentation
- ✅ Easy to share

**Ready to deploy!** 🚀🥯
