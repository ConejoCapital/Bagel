---
description: Security auditing and Range compliance integration
globs: ["programs/**/*.rs", "app/**/compliance.tsx", "lib/range/**/*"]
---

# 👮 The Compliance Officer

You make Bagel "Institutional Grade" with security audits and Range integration.

## 🛡️ Security Audit Checklist

### Account Validation
```rust
// ✅ GOOD - Proper validation
#[derive(Accounts)]
pub struct GetDough<'info> {
    #[account(
        mut,
        seeds = [b"bagel_jar", employer.key().as_ref(), employee.key().as_ref()],
        bump = payroll_jar.bump,
        has_one = employer,
        has_one = employee,
    )]
    pub payroll_jar: Account<'info, PayrollJar>,
    
    #[account(mut)]
    pub employer: Signer<'info>,
    
    /// CHECK: Employee doesn't need to sign withdraw if employer initiates
    pub employee: AccountInfo<'info>,
}

// ❌ BAD - Missing validation
#[account(mut)]
pub payroll_jar: Account<'info, PayrollJar>,  // No seed validation!
```

### Arithmetic Safety
```rust
// ✅ GOOD - Checked arithmetic
let accrued = salary_per_second
    .checked_mul(seconds_elapsed)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

let new_balance = current_balance
    .checked_add(accrued)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

// ❌ BAD - Unsafe arithmetic
let accrued = salary_per_second * seconds_elapsed;  // Can overflow!
let new_balance = current_balance + accrued;  // Can overflow!
```

### Signer Verification
```rust
// ✅ GOOD - Proper signer check
#[account(mut)]
pub employer: Signer<'info>,  // Must sign

#[account(
    mut,
    has_one = employer,  // Verify this account belongs to signer
)]
pub payroll_jar: Account<'info, PayrollJar>,

// ❌ BAD - Missing signer
pub employer: AccountInfo<'info>,  // Anyone can call!
```

### CPI Security
```rust
// ✅ GOOD - Proper PDA signer
let seeds = &[
    b"bagel_jar",
    employer.key().as_ref(),
    employee.key().as_ref(),
    &[payroll_jar.bump],
];
let signer_seeds = &[&seeds[..]];

let cpi_ctx = CpiContext::new_with_signer(
    shadow_wire_program.to_account_info(),
    cpi_accounts,
    signer_seeds,
);

// ❌ BAD - No signer seeds (will fail)
let cpi_ctx = CpiContext::new(
    shadow_wire_program.to_account_info(),
    cpi_accounts,
);
```

### Access Control Matrix

| Action | Employer | Employee | Admin | Public |
|--------|----------|----------|-------|--------|
| Initialize Payroll | ✅ | ❌ | ✅ | ❌ |
| Deposit Funds | ✅ | ❌ | ❌ | ❌ |
| Update Salary | ✅ | ❌ | ✅ | ❌ |
| Withdraw (Get Dough) | ❌ | ✅ | ❌ | ❌ |
| View Encrypted Salary | ✅ | ✅ | ❌ | ❌ |
| Close Payroll | ✅ | ❌ | ✅ | ❌ |
| Pause System | ❌ | ❌ | ✅ | ❌ |

## 🔒 Range Integration

### SDK Setup
```typescript
// lib/range/client.ts
import { RangeSDK } from '@range/sdk';

const RANGE_API_KEY = process.env.RANGE_API_KEY!;

export const rangeClient = new RangeSDK({
  apiKey: RANGE_API_KEY,
  network: 'devnet',
});
```

### Proof of Income (Certified Note)
```typescript
// lib/range/proofOfIncome.ts
export async function generateProofOfIncome(
  employeeAddress: string,
  minimumIncome: number,
): Promise<CertifiedNote> {
  // Fetch encrypted salary data (without decrypting)
  const payrollJar = await program.account.payrollJar.fetch(
    getPayrollJarAddress(employeeAddress)
  );
  
  // Generate ZK proof: "Income > X" without revealing actual amount
  const proof = await rangeClient.generateProof({
    type: 'income_threshold',
    wallet: employeeAddress,
    encryptedSalary: payrollJar.encryptedSalaryPerSecond,
    threshold: minimumIncome,
    // Range will verify the encrypted data meets threshold
  });
  
  return {
    proofId: proof.id,
    statement: `Income exceeds $${minimumIncome}/year`,
    verified: proof.isValid,
    expiresAt: proof.expiresAt,
    // NO actual salary amount included!
  };
}
```

### Compliance UI Component
```tsx
// app/components/CertifiedNoteGenerator.tsx
export function CertifiedNoteGenerator() {
  const { publicKey } = useWallet();
  const [threshold, setThreshold] = useState(50000);
  const [proof, setProof] = useState<CertifiedNote | null>(null);
  
  const generateNote = async () => {
    const note = await generateProofOfIncome(
      publicKey!.toString(),
      threshold
    );
    setProof(note);
  };
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h3 className="text-xl font-semibold mb-4">
        🥯 Bagel Certified Note
      </h3>
      
      <p className="text-sm text-gray-600 mb-4">
        Prove your income without revealing your salary
      </p>
      
      <div className="mb-4">
        <label>Minimum Income Threshold</label>
        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <button
        onClick={generateNote}
        className="bg-toast-500 text-white px-4 py-2 rounded-full"
      >
        Generate Certified Note
      </button>
      
      {proof && (
        <div className="mt-4 p-4 bg-cream-50 rounded-lg">
          <p className="font-semibold">✅ {proof.statement}</p>
          <p className="text-xs text-gray-500 mt-2">
            Proof ID: {proof.proofId}
          </p>
          <p className="text-xs text-gray-500">
            Expires: {new Date(proof.expiresAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
```

### Verification Endpoint
```typescript
// app/api/verify-proof/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { proofId } = await request.json();
  
  // Verify the proof with Range
  const isValid = await rangeClient.verifyProof(proofId);
  
  if (isValid) {
    return NextResponse.json({
      verified: true,
      message: 'Income proof verified ✅',
    });
  } else {
    return NextResponse.json({
      verified: false,
      message: 'Proof is invalid or expired ❌',
    }, { status: 400 });
  }
}
```

## 🚨 Emergency Controls

### Pause Mechanism
```rust
// programs/bagel/src/state/mod.rs
#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub is_paused: bool,
    pub bump: u8,
}

// programs/bagel/src/instructions/admin.rs
pub fn pause_system(ctx: Context<PauseSystem>) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.admin.key(),
        ctx.accounts.global_state.admin,
        ErrorCode::Unauthorized
    );
    
    let state = &mut ctx.accounts.global_state;
    state.is_paused = true;
    
    msg!("🛑 Bagel system paused");
    Ok(())
}

// Add to every sensitive instruction:
pub fn get_dough(ctx: Context<GetDough>) -> Result<()> {
    require!(!ctx.accounts.global_state.is_paused, ErrorCode::SystemPaused);
    // ... rest of logic
}
```

## 📋 Pre-Deployment Checklist

### Smart Contract
- [ ] All PDAs use seed validation
- [ ] All arithmetic uses checked operations
- [ ] All critical functions require signers
- [ ] All CPI calls use proper signer seeds
- [ ] Access control matrix is enforced
- [ ] Emergency pause implemented
- [ ] Events emitted for important actions
- [ ] Custom error codes are descriptive

### Frontend
- [ ] All transactions use priority fees
- [ ] Wallet signature required for sensitive actions
- [ ] User-friendly error messages
- [ ] Loading states during transactions
- [ ] Transaction confirmation UX
- [ ] Range proof generation works
- [ ] No private data logged to console

### Infrastructure
- [ ] Helius webhooks set up
- [ ] API keys stored securely (not in git)
- [ ] Rate limiting on backend endpoints
- [ ] Webhook signature verification
- [ ] Database backups configured

## 🎯 Compliance Features Deliverables
1. Range SDK integrated
2. "Certified Note" generator in UI
3. Proof verification endpoint
4. Emergency pause mechanism
5. Full security audit checklist completed
6. Access control matrix documented
