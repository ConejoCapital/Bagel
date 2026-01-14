# 🔮 Circuit ID Update Instructions

**Status:** Waiting for circuit deployment  
**Action Required:** Update circuit ID after manual deployment

---

## 📋 After You Deploy the Circuit

Once you have your Circuit ID from the Arcium Dashboard, update these files:

### 1. Frontend Environment Variables

**File:** `app/.env.local` (create from `.env.example`)

```bash
# Add your circuit ID here:
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=<YOUR_CIRCUIT_ID_HERE>
```

### 2. Frontend Client Library

**File:** `app/lib/arcium.ts`

**Find this line** (around line 40):
```typescript
// Current (mock):
async getMXEPublicKey(): Promise<Uint8Array> {
  console.warn('⚠️ MOCK: Using dummy MXE public key');
  return new Uint8Array(32).fill(1);
}
```

**Update the constructor to use circuit ID:**
```typescript
export class ArciumClient {
  private connection: Connection;
  private config: ArciumConfig;
  private circuitId: string; // Add this
  
  constructor(config: ArciumConfig) {
    this.config = config;
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');
    this.circuitId = config.circuitId || process.env.NEXT_PUBLIC_ARCIUM_CIRCUIT_ID || '';
    
    if (!this.circuitId) {
      console.warn('⚠️ WARNING: No Arcium circuit ID configured!');
    }
  }
```

**Update the config interface:**
```typescript
export interface ArciumConfig {
  solanaRpcUrl: string;
  network: 'devnet' | 'mainnet-beta';
  mpcProgramId?: string;
  circuitId?: string; // Add this
}
```

### 3. Solana Program (Rust)

**File:** `programs/bagel/src/privacy/arcium.rs`

**Find this line** (around line 69):
```rust
pub fn payroll_circuit() -> Self {
    Self {
        circuit_id: [0u8; 32], // Placeholder
        version: 1,
    }
}
```

**Update with your circuit ID:**
```rust
use bs58;

pub fn payroll_circuit() -> Self {
    // Decode your circuit ID from base58
    let circuit_id_str = "<YOUR_CIRCUIT_ID_HERE>";
    let circuit_id_bytes = bs58::decode(circuit_id_str)
        .into_vec()
        .expect("Invalid circuit ID");
    
    let mut circuit_id = [0u8; 32];
    circuit_id.copy_from_slice(&circuit_id_bytes[..32]);
    
    Self {
        circuit_id,
        version: 1,
    }
}
```

**Then rebuild:**
```bash
anchor build
anchor deploy --provider.cluster devnet
```

---

## 🚀 Quick Update Script

**Save this as `scripts/update-circuit-id.sh`:**

```bash
#!/bin/bash
CIRCUIT_ID=$1

if [ -z "$CIRCUIT_ID" ]; then
    echo "Usage: ./scripts/update-circuit-id.sh <circuit_id>"
    exit 1
fi

echo "Updating circuit ID to: $CIRCUIT_ID"

# Update .env.local
echo "NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$CIRCUIT_ID" >> app/.env.local

echo "✅ Updated app/.env.local"
echo "⚠️  Manually update programs/bagel/src/privacy/arcium.rs"
echo "⚠️  Then run: anchor build && anchor deploy"
```

**Usage:**
```bash
chmod +x scripts/update-circuit-id.sh
./scripts/update-circuit-id.sh <your_circuit_id>
```

---

## ✅ Verification Checklist

After updating, verify:

- [ ] `.env.local` has correct circuit ID
- [ ] `arcium.ts` constructor uses circuit ID
- [ ] Solana program updated with circuit ID
- [ ] Program rebuilt and redeployed
- [ ] Frontend can call MPC circuit
- [ ] Tests pass

---

## 📞 If You Have the Circuit ID Now

**Just tell me:**
> "Circuit ID is: <YOUR_ID>"

**And I'll update all the files automatically!**

---

## 🎯 What This Enables

With the circuit ID configured:

1. ✅ Frontend can call your MPC circuit
2. ✅ Solana program references correct circuit
3. ✅ Tests can verify MPC integration
4. ✅ End-to-end flow complete
5. ✅ Ready for $10k bounty submission!

---

**🥯 Waiting for your circuit ID! 🚀**
