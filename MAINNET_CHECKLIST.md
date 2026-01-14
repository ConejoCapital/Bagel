# Mainnet Deployment Checklist

Complete guide for deploying Bagel to Solana Mainnet with real yield via Kamino Finance.

## Pre-Deployment Requirements

### 1. Funding & Costs
- [ ] **Mainnet SOL for deployment**: ~0.5 SOL ($50-100)
  - Program deployment: ~0.3 SOL
  - Testing transactions: ~0.1 SOL
  - Buffer: ~0.1 SOL

- [ ] **Mainnet SOL for operations**: ~1-2 SOL
  - Rent-exempt accounts
  - Transaction fees
  - Priority fees (Helius)

### 2. Security Audits
- [ ] **Smart contract audit**: CRITICAL before mainnet
  - Recommended: OtterSec, Neodyme, or Zellic
  - Focus areas: Arithmetic, access control, PDA validation
  - Budget: $5k-15k

- [ ] **Penetration testing**: Frontend security
  - Wallet adapter integration
  - RPC endpoint security
  - Environment variable exposure

### 3. Service Integration Status

#### Must Be Real (Not Mocks)
- [ ] **Kamino Finance** - Real yield generation ✅ READY
- [ ] **Helius RPC** - Already integrated ✅
- [ ] **Solana Wallet Adapter** - Already working ✅

#### Can Stay Mocked (For Now)
- [ ] **Arcium MPC** - Production API pending
- [ ] **ShadowWire** - Production API pending  
- [ ] **MagicBlock** - Production API pending
- [ ] **Privacy Cash** - Being replaced by Kamino ✅

## Kamino Integration (PRIORITY!)

### Why Kamino?
According to [Kamino Finance documentation](https://docs.kamino.finance/build-on-kamino/sdk-and-smart-contracts), Kamino provides:
- **Real yield**: 5-15% APY on SOL and USDC
- **Production-ready**: Audited, battle-tested protocol
- **Easy integration**: Lending SDK available
- **Liquidity**: $500M+ TVL

### Kamino Markets for Bagel

#### SOL Main Market
- **URL**: https://kamino.com/borrow/reserve/7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF/d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q
- **Use Case**: Earn yield on SOL-denominated payrolls
- **APY**: Variable (check market)

#### USDC Main Market
- **URL**: https://kamino.com/borrow/reserve/7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF/D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59
- **Use Case**: Earn yield on USDC-denominated payrolls (recommended!)
- **APY**: Variable (check market)

### Integration Steps

1. **Add Kamino SDK to Backend**
   ```bash
   cd programs/bagel
   # Add to Cargo.toml:
   # kamino-lending = "0.x.x"
   ```

2. **Create Kamino Module**
   - File: `programs/bagel/src/privacy/kamino.rs`
   - Replace `privacycash.rs` mock
   - Implement deposit/withdraw/yield calculation

3. **Update Frontend**
   ```bash
   cd app
   npm install @kamino-finance/klend-sdk
   ```

4. **Test on Devnet**
   - Kamino has devnet deployment
   - Test full cycle: deposit → earn → withdraw

5. **Deploy to Mainnet**
   - Use mainnet Kamino program
   - Real USDC/SOL deposits
   - Real yield generation!

### Kamino Program IDs

From [Kamino docs](https://docs.kamino.finance/build-on-kamino/sdk-and-smart-contracts):

- **Lending Program**: `GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW`
- **Liquidity Program**: `E35i5qn7872eEmBt15e5VGhziUBzCTm43XCSWvDoQNNv`
- **Vaults Program**: `Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE`

## Code Changes Required

### Backend (Rust)

#### 1. Replace Privacy Cash with Kamino
```rust
// programs/bagel/src/privacy/kamino.rs
use anchor_lang::prelude::*;
use kamino_lending::lending_market;

pub fn deposit_to_kamino(
    kamino_program: &AccountInfo,
    market: &AccountInfo,
    reserve: &AccountInfo,
    amount: u64,
) -> Result<()> {
    // Real Kamino integration
    // Deposit idle payroll funds
    // Earn yield automatically
    Ok(())
}

pub fn withdraw_from_kamino(
    kamino_program: &AccountInfo,
    market: &AccountInfo,
    reserve: &AccountInfo,
    amount: u64,
) -> Result<()> {
    // Withdraw funds + yield
    Ok(())
}

pub fn get_yield_earned(
    market: &AccountInfo,
    reserve: &AccountInfo,
) -> Result<u64> {
    // Query Kamino for accrued interest
    Ok(0)
}
```

#### 2. Update Instructions
```rust
// programs/bagel/src/instructions/deposit_dough.rs
pub fn handler(ctx: Context<DepositDough>, amount: u64) -> Result<()> {
    // Transfer funds to jar
    // Deposit to Kamino vault
    kamino::deposit_to_kamino(
        &ctx.accounts.kamino_program,
        &ctx.accounts.kamino_market,
        &ctx.accounts.kamino_reserve,
        amount,
    )?;
    Ok(())
}
```

#### 3. Add Kamino Accounts
```rust
#[derive(Accounts)]
pub struct DepositDough<'info> {
    // Existing accounts...
    
    /// CHECK: Kamino lending program
    pub kamino_program: AccountInfo<'info>,
    
    /// CHECK: Kamino market account
    #[account(mut)]
    pub kamino_market: AccountInfo<'info>,
    
    /// CHECK: Kamino reserve (SOL or USDC)
    #[account(mut)]
    pub kamino_reserve: AccountInfo<'info>,
}
```

### Frontend (TypeScript)

#### 1. Install Kamino SDK
```bash
npm install @kamino-finance/klend-sdk
```

#### 2. Create Kamino Client
```typescript
// app/lib/kamino.ts
import { KaminoMarket, KaminoReserve } from '@kamino-finance/klend-sdk';

export class KaminoYieldClient {
  async depositToVault(amount: number, token: 'SOL' | 'USDC') {
    // Integrate with Kamino SDK
    // Deposit idle payroll funds
  }
  
  async getYieldEarned() {
    // Query Kamino for accrued yield
    // Display to user
  }
  
  async withdrawWithYield(amount: number) {
    // Withdraw principal + yield
  }
}
```

#### 3. Update UI
```tsx
// Show real APY from Kamino
<div className="card">
  <h4>Current APY</h4>
  <p className="text-2xl font-bold">
    {kaminoAPY.toFixed(2)}%
  </p>
  <p className="text-sm">
    Via Kamino Finance • Real yield on {token}
  </p>
</div>
```

## Testing Checklist

### Devnet Testing
- [ ] Deploy program to devnet
- [ ] Create test payroll
- [ ] Deposit test SOL/USDC
- [ ] Verify Kamino deposit
- [ ] Wait for yield accrual (24h)
- [ ] Withdraw with yield
- [ ] Verify yield calculation

### Mainnet Testing (Small Amounts!)
- [ ] Deploy program to mainnet
- [ ] Create test payroll ($10 worth)
- [ ] Monitor for 1 week
- [ ] Verify yield accrual
- [ ] Test withdrawal
- [ ] Verify no bugs

### Load Testing
- [ ] 10 simultaneous payrolls
- [ ] 100 deposits/withdrawals
- [ ] Monitor transaction success rate
- [ ] Check for any failures

## Service Status & Next Steps

### ✅ Ready for Mainnet
1. **Helius RPC** - Already integrated, just switch endpoint
2. **Wallet Adapter** - Works on mainnet
3. **Frontend** - Production-ready

### 🔧 Needs Work (Priority 1)
1. **Kamino Integration** - Replace Privacy Cash mock
   - Estimated time: 2-3 days
   - Complexity: Medium
   - Impact: HIGH (real yield!)

### ⏳ Waiting on APIs (Priority 2)
1. **Arcium MPC** - Production API not yet available
   - Keep mock for now
   - Update when API releases
   
2. **ShadowWire** - Production API not yet available
   - Keep mock for now
   - Update when API releases

3. **MagicBlock** - Production API access needed
   - Keep mock for now
   - Request access from team

### 🎯 Optional Enhancements
1. **Range Compliance** - For regulated users
2. **Multi-sig Support** - For DAOs
3. **Batch Processing** - For large employers

## Deployment Sequence

### Phase 1: Prepare (1 week)
- [ ] Complete Kamino integration
- [ ] Security audit
- [ ] Devnet testing
- [ ] Documentation update

### Phase 2: Soft Launch (1 week)
- [ ] Deploy to mainnet
- [ ] Test with $100
- [ ] Monitor closely
- [ ] Fix any bugs

### Phase 3: Public Launch (2 weeks)
- [ ] Increase limits gradually
- [ ] Marketing push
- [ ] Community testing
- [ ] Bug bounty program

## Cost Breakdown

### One-Time Costs
- Security audit: $5,000 - $15,000
- Mainnet deployment: ~$50-100 (0.5 SOL)
- Marketing: $1,000 - $5,000

### Ongoing Costs
- Helius RPC: $0 - $49/month (Growth plan)
- Domain: ~$15/year
- Vercel hosting: $0 (free tier)
- Monitoring: $0 - $20/month

### Revenue Potential
- Employer fees: 0.5% of payroll volume
- Yield share: 20% of Kamino yield
- Premium features: $50-200/month

## Risk Assessment

### High Risk (Must Address)
- [ ] **Arithmetic errors**: Complete audit needed
- [ ] **Access control**: Verify all permissions
- [ ] **Kamino integration**: Test thoroughly

### Medium Risk (Monitor)
- [ ] **RPC rate limits**: Upgrade Helius if needed
- [ ] **Wallet compatibility**: Test all major wallets
- [ ] **Network congestion**: Monitor during busy times

### Low Risk (Accept)
- [ ] **UI bugs**: Can fix quickly
- [ ] **Documentation gaps**: Can update anytime
- [ ] **Feature requests**: Add incrementally

## Monitoring & Maintenance

### Set Up Monitoring
- [ ] **Sentry**: Error tracking
- [ ] **Datadog**: Performance monitoring
- [ ] **Helius Webhooks**: Transaction monitoring
- [ ] **Discord Bot**: Alert on failures

### Regular Checks
- [ ] Daily: Check transaction success rate
- [ ] Weekly: Review user feedback
- [ ] Monthly: Security review
- [ ] Quarterly: Full audit

## Documentation Updates

Before mainnet:
- [ ] Update README with mainnet info
- [ ] Add Kamino integration guide
- [ ] Update ARCHITECTURE.md
- [ ] Create mainnet user guide
- [ ] Document yield calculations

## Legal & Compliance

- [ ] Terms of service
- [ ] Privacy policy
- [ ] GDPR compliance (if EU users)
- [ ] KYC/AML consideration
- [ ] Consult with lawyer

## Success Criteria

### Minimum Viable Product
- ✅ Program deployed to mainnet
- ✅ Kamino yield working
- ✅ 0 critical bugs
- ✅ Positive user feedback

### Growth Metrics
- 10+ active payrolls in first month
- $10k+ TVL in first quarter
- 95%+ transaction success rate
- 4.5+ star rating from users

## Timeline Estimate

```
Week 1-2: Kamino Integration
├─ Backend implementation
├─ Frontend integration
└─ Devnet testing

Week 3: Security
├─ Code audit
├─ Penetration testing
└─ Bug fixes

Week 4: Mainnet Prep
├─ Final testing
├─ Documentation
└─ Soft launch

Week 5+: Public Launch
├─ Marketing
├─ User onboarding
└─ Iterate based on feedback
```

## Next Immediate Steps

1. **Start Kamino Integration** (TODAY!)
   - Read Kamino SDK docs
   - Set up devnet testing
   - Implement deposit function

2. **Request Security Audit** (THIS WEEK)
   - Contact audit firms
   - Get quotes
   - Schedule audit

3. **Update Documentation** (THIS WEEK)
   - Add Kamino to README
   - Update architecture docs
   - Create mainnet guide

4. **Community Engagement** (ONGOING)
   - Share progress on Twitter
   - Get feedback from users
   - Build hype for mainnet!

## Questions to Answer

- [ ] Which token for payroll? (SOL or USDC?)
- [ ] Minimum payroll amount?
- [ ] Fee structure?
- [ ] Yield split percentage?
- [ ] Geographic restrictions?

## Resources

- **Kamino Docs**: https://docs.kamino.finance/
- **Solana Mainnet**: https://solana.com/docs
- **Audit Firms**: OtterSec, Neodyme, Zellic
- **Community**: Solana Discord, Twitter

---

**Ready to make Bagel production-ready with REAL YIELD!** 🥯💰

Next: See `KAMINO_INTEGRATION_PLAN.md` for detailed implementation guide.
