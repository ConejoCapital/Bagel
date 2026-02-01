# Step 3: Total Salary to Claim + Real-Time Dashboard

**Goal:** Add a "You Have Salary to Claim!" section to the dashboard with **Total Salary to Claim**, **Max Salary per year/month**, and **Max available to withdraw right now**, with real-time UI updates.

---

## Plan

### 1. Data layer (`app/lib/bagel-client.ts`)

- **`getEmployeeEntrySalaryData(connection, employeeEntryPda)`**  
  Fetches Bagel `EmployeeEntry` account and returns:
  - `lastAction` (public) – last action timestamp
  - `encryptedSalaryHex` – 16-byte hex for Inco decrypt (salary per second)
  - `encryptedAccruedHex` – 16-byte hex for Inco decrypt (accrued balance)
  - `isActive` – whether the employee entry is active  

  Parsing uses the Bagel `EmployeeEntry` layout (discriminator 8, business_entry 32, employee_index 8, encrypted_employee_id 16, encrypted_salary 16, encrypted_accrued 16, last_action 8, is_active 1, bump 1).

### 2. Dashboard UI (`app/pages/dashboard.tsx`)

- **State:** `salaryToClaimData`, `decryptedAccrued`, `decryptedSalaryPerSecond`, `salaryDecrypting`.
- **Polling:** When connected and the user has a business (`businessEntryIndex !== null`), poll salary-to-claim data for **employee index 0** every **10 seconds** (real-time refresh).
- **Decrypt:** "Decrypt to view amounts" calls Inco `decrypt([encryptedSalaryHex, encryptedAccruedHex])`; result sets `decryptedSalaryPerSecond` and `decryptedAccrued`.
- **Card** (only when connected, business registered, and salary-to-claim data exists):
  - **Total Salary to Claim** – decrypted accrued (USDBagel) or `••••••` until decrypt.
  - **Max Salary / year** – `decryptedSalaryPerSecond × 31_557_600` (USDBagel) or `••••••`.
  - **Max Salary / month** – `decryptedSalaryPerSecond × 2_629_800` (USDBagel) or `••••••`.
  - **Max available to withdraw** – same as Total Salary to Claim (decrypted accrued).
  - **Last action: Xs ago** from `salaryToClaimData.lastAction`.
  - **Active** badge when `salaryToClaimData.isActive`.
  - **Decrypt** button to reveal amounts (one-time sign).

Values use `formatBalance` and USDBagel (÷ 1e6) for display.

### 3. Optional future: MagicBlock TEE

- If the employee entry is delegated to MagicBlock TEE, "Total Salary to Claim" could later use TEE streamed balance (time since last commit × salary rate) in addition to or instead of on-chain `encrypted_accrued` after decrypt. Current implementation uses on-chain data + Inco decrypt only.

---

## Files changed (step 3 only)

| File | Change |
|------|--------|
| `app/lib/bagel-client.ts` | `EmployeeEntrySalaryData` interface + `getEmployeeEntrySalaryData()`; dashboard imports `getEmployeeEntryPDA`, `getEmployeeEntrySalaryData`. |
| `app/pages/dashboard.tsx` | Salary-to-claim state, `fetchSalaryToClaimData`, polling every 10s, `handleDecryptSalaryToClaim`, "You Have Salary to Claim!" card. |

---

## Verification

1. Open dashboard with a wallet that has a registered business and at least one employee (index 0).
2. Confirm the "You Have Salary to Claim!" card appears and refreshes every 10s.
3. Click "Decrypt to view amounts" and confirm Total to Claim, Max/year, Max/month, and Max available to withdraw show correctly.
