# 🧪 End-to-End Test Flow

## Test Setup

**Goal**: Test complete payroll flow with real wallets on devnet

**Requirements**:
- Employer wallet: Deployer wallet (with devnet SOL)
- Employee wallet: Newly created test wallet
- Payroll: 0.001 SOL over 2 hours = 0.00000013888 SOL/second

## Test Steps

### 1. ✅ Wallet Setup
- [x] Employer wallet: Use existing deployer wallet
- [x] Employee wallet: Create new test wallet
- [ ] Check balances

### 2. 🥯 Create Payroll (Employer)
- [ ] Go to https://bagel-phi.vercel.app/employer
- [ ] Connect employer wallet (import deployer keypair to Phantom)
- [ ] Enter employee address
- [ ] Calculate salary: 0.001 SOL / (2 hours × 3600 seconds)
- [ ] Create payroll transaction
- [ ] Verify on Solana Explorer

### 3. 👀 View Payroll (Employee)
- [ ] Go to https://bagel-phi.vercel.app/employee
- [ ] Connect employee wallet (import test keypair to Phantom)
- [ ] Enter employer address
- [ ] Fetch payroll
- [ ] See balance streaming

### 4. 💰 Withdraw (Employee)
**STATUS**: Not yet implemented in frontend
- Need to add withdraw instruction
- Will send `get_dough` transaction
- Will update `last_withdraw` timestamp

### 5. ❌ Cancel Payroll (Employer)
**STATUS**: Not yet implemented
- Need to add `close_jar` instruction to frontend
- Will close the PayrollJar account
- Will return rent to employer

## Issues Found

### Missing Features:
1. **Withdraw Function**: UI shows "Coming Soon"
2. **Cancel Function**: Not in UI yet
3. **Import Keypair to Phantom**: Need to export private key

## Alternative: Command Line Test

Since importing to Phantom is complex, let me test via CLI:
- Use Anchor CLI to call instructions directly
- Test all 3 instructions: bake_payroll, get_dough, close_jar
- Verify on-chain state changes

## Test Results

(To be filled in after testing)
