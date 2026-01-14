# 🥯 Bagel: De-Mocking Implementation Guide

**Status:** In Progress  
**Goal:** Replace all mock privacy implementations with real SDK integrations

---

## 📋 Implementation Checklist

### ✅ Phase 1: Arcium v0.5.1 MPC Integration
- [x] Add `@noble/hashes` for SHA3-256
- [x] Add `@noble/curves` for x25519
- [ ] Update `app/lib/arcium.ts` to use real RescueCipher
- [ ] Update `programs/bagel/src/privacy/arcium.rs` to use ComputationAccount
- [ ] Deploy circuit and get Circuit ID
- [ ] Test MPC computation flow

### ⚡ Phase 2: MagicBlock Ephemeral Rollups
- [ ] Add `ephemeral-rollups-sdk` to Cargo.toml
- [ ] Add `#[ephemeral]` attribute to `bake_payroll`
- [ ] Implement delegate/undelegate methods
- [ ] Update frontend to handle ER state
- [ ] Test streaming on MagicBlock devnet

### 🕵️ Phase 3: ShadowWire ZK Transfers
- [ ] Install `@radr/shadowwire` npm package
- [ ] Update `app/lib/shadowwire.ts` to use real SDK
- [ ] Update `programs/bagel/src/privacy/shadowwire.rs` for CPI calls
- [ ] Test USD1 confidential transfers
- [ ] Verify Bulletproof proofs

### 📈 Phase 4: Privacy Cash/Kamino Yield
- [ ] Research Privacy Cash SDK
- [ ] Integrate vault deposit/withdraw
- [ ] Add yield calculation
- [ ] Test yield generation
- [ ] Update UI to show yield

---

## 🔒 1. Arcium v0.5.1 Implementation

### Backend Changes (`programs/bagel/src/privacy/arcium.rs`)

**Key Changes:**
1. Replace `ConfidentialBalance` mock with `ComputationAccount` reference
2. Use `queue_computation` with ArgBuilder pattern
3. Verify BLS signatures on MPC outputs
4. Store circuit ID as String (v0.5.1 format)

**Dependencies Needed:**
```toml
# Add to Cargo.toml when Arcium Rust SDK is available
# arcium-client = "0.5.1"
```

**Implementation Pattern:**
```rust
// Instead of mock ConfidentialBalance::new()
let computation_account = queue_computation(
    &circuit_id,  // String format in v0.5.1
    args,         // ArgBuilder pattern
    cu_price_micro, // Priority fee
)?;

// Wait for MPC execution...
let signed_output = get_computation_output(&computation_account)?;

// Verify BLS signature
signed_output.verify_output(&cluster_account, &computation_account)?;
```

### Frontend Changes (`app/lib/arcium.ts`)

**Key Changes:**
1. Use `@noble/hashes/sha3` for SHA3-256
2. Use `@noble/curves/ed25519` for x25519
3. Implement real RescueCipher encryption
4. Use ArgBuilder for MPC calls

**Dependencies:**
```json
{
  "@noble/hashes": "^1.3.0",
  "@noble/curves": "^1.2.0"
}
```

**Implementation:**
```typescript
import { sha3_256 } from '@noble/hashes/sha3';
import { x25519 } from '@noble/curves/ed25519';

// Real RescueCipher with SHA3-256
class RescueCipher {
  private key: Uint8Array;
  
  constructor(sharedSecret: Uint8Array) {
    this.key = sha3_256(sharedSecret); // Real SHA3-256
  }
  
  encrypt(data: Uint8Array): Uint8Array {
    // Real Rescue-Prime encryption
  }
}
```

---

## ⚡ 2. MagicBlock Ephemeral Rollups

### Backend Changes

**Add to `Cargo.toml`:**
```toml
ephemeral-rollups-sdk = "0.1.0"  # When available
```

**Update `lib.rs`:**
```rust
use ephemeral_rollups_sdk::prelude::*;

#[program]
pub mod bagel {
    #[ephemeral]  // This makes the instruction run on ER
    pub fn bake_payroll(
        ctx: Context<BakePayroll>,
        salary_per_second: u64,
    ) -> Result<()> {
        // PayrollJar is now on MagicBlock ER
        // Streaming happens automatically on ER
    }
    
    // When employee withdraws, undelegate back to L1
    pub fn get_dough(ctx: Context<GetDough>) -> Result<()> {
        // Undelegate from ER
        undelegate_payroll_jar(ctx)?;
        
        // Settle accumulated amount
        instructions::get_dough::handler(ctx)
    }
}
```

**State Changes:**
- PayrollJar account moves to MagicBlock ER state machine
- Accrual calculated on ER (sub-second precision)
- Withdrawal triggers undelegate CPI

### Frontend Changes

**Update to handle ER state:**
```typescript
import { EphemeralRollupClient } from '@magicblock-labs/ephemeral-rollups-sdk';

// Check if PayrollJar is on ER
const isOnER = await erClient.isDelegated(payrollJarPDA);

// Get streaming balance from ER
const balance = await erClient.getAccruedBalance(payrollJarPDA);
```

---

## 🕵️ 3. ShadowWire ZK Transfers

### Frontend Changes (`app/lib/shadowwire.ts`)

**Install SDK:**
```bash
npm install @radr/shadowwire
```

**Update Implementation:**
```typescript
import { ShadowWire } from '@radr/shadowwire';

export class ShadowWireClient {
  async executePrivateTransfer(
    params: PrivateTransferParams,
    wallet: WalletContextState
  ): Promise<string> {
    // Real ShadowWire SDK call
    const proof = await ShadowWire.proveTransfer({
      amount: params.amount,
      recipient: params.recipient,
      mint: params.mint,
    });
    
    // Create transaction with proof
    const instruction = ShadowWire.createTransferInstruction(
      wallet.publicKey,
      params.recipient,
      proof
    );
    
    const tx = new Transaction().add(instruction);
    return await wallet.sendTransaction(tx, connection);
  }
}
```

### Backend Changes (`programs/bagel/src/privacy/shadowwire.rs`)

**CPI Call Pattern:**
```rust
use anchor_lang::solana_program::program::invoke;

pub fn execute_private_payout(
    amount: u64,
    recipient: Pubkey,
    mint: Pubkey,
) -> Result<()> {
    // Real CPI to ShadowWire program
    invoke(
        &shadowwire::instruction::private_transfer(
            shadowwire_program_id,
            source_account,
            recipient,
            commitment,
            range_proof,
        )?,
        &accounts,
    )?;
    
    Ok(())
}
```

---

## 📈 4. Privacy Cash/Kamino Yield

### Integration Pattern

**On `deposit_dough`:**
```rust
// Move 90% to Privacy Cash vault
let vault_amount = amount * 90 / 100;
privacy_cash::deposit_to_vault(
    ctx,
    vault_amount,
)?;
```

**Yield Calculation:**
```rust
// Get yield from Privacy Cash
let yield_amount = privacy_cash::calculate_yield(
    ctx,
    vault_balance,
    elapsed_time,
)?;
```

**Frontend:**
```typescript
import { PrivacyCashClient } from '@privacycash/sdk';

const client = new PrivacyCashClient();
const yield = await client.getYield(vaultAddress);
```

---

## 🧪 Testing Strategy

### 1. Arcium MPC Test
```bash
# Deploy circuit
arcium build circuits/payroll.arcis
arcium deploy --cluster-offset 1078779259

# Test computation
npm run test:arcium
```

### 2. MagicBlock ER Test
```bash
# Test delegation
npm run test:magicblock

# Verify streaming
curl https://api.magicblock.gg/er/balance/{payrollJarPDA}
```

### 3. ShadowWire Test
```bash
# Test private transfer
npm run test:shadowwire

# Verify on explorer (amount should be hidden)
```

### 4. Privacy Cash Test
```bash
# Test yield generation
npm run test:privacycash
```

---

## 📝 Environment Variables

Add to `.env.local`:
```bash
# Arcium
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=<from_arcium_deploy>
NEXT_PUBLIC_ARCIUM_MPC_PROGRAM_ID=<program_id>

# MagicBlock
NEXT_PUBLIC_MAGICBLOCK_ER_ENDPOINT=https://api.magicblock.gg
NEXT_PUBLIC_MAGICBLOCK_PROGRAM_ID=<program_id>

# ShadowWire
NEXT_PUBLIC_SHADOWWIRE_PROGRAM_ID=<program_id>
NEXT_PUBLIC_USD1_MINT=<usd1_mint_address>

# Privacy Cash
NEXT_PUBLIC_PRIVACYCASH_VAULT=<vault_address>
```

---

## 🚀 Deployment Steps

1. **Deploy Arcium Circuit**
   ```bash
   cd encrypted-ixs/circuits
   arcium build payroll.arcis
   arcium deploy --cluster-offset 1078779259
   # Save Circuit ID to .env.local
   ```

2. **Update Program with Real Integrations**
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   ```

3. **Update Frontend**
   ```bash
   cd app
   npm install
   npm run build
   ```

4. **Test End-to-End**
   ```bash
   npm run test:e2e
   ```

---

## ⚠️ Current Limitations

1. **Arcium SDK:** May not have v0.5.1 Rust SDK yet - using TypeScript client
2. **MagicBlock:** ER SDK may be in beta - check latest docs
3. **ShadowWire:** SDK may require mainnet - check devnet availability
4. **Privacy Cash:** SDK may not be public - may need direct integration

---

## 📚 Resources

- [Arcium v0.5.1 Migration Guide](https://docs.arcium.com/developers/migration/migration-v0.4-to-v0.5)
- [MagicBlock ER Quickstart](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart)
- [ShadowWire GitHub](https://github.com/Radrdotfun/ShadowWire)
- [Privacy Cash Website](https://privacycash.org)

---

**Last Updated:** 2026-01-14  
**Status:** Implementation in progress
