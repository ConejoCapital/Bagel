# 🥯 Bagel: The People Platform for Solana

**Tagline:** Simple payroll, private paydays, and a little extra cream cheese.  
**Hackathon Target:** Solana Privacy Hackathon (Jan 2026)  
**Tracks:** Track 02 (Privacy Tooling), Track 01 (Private Payments)

---

## 1. Brand Identity & Vibe 🎨

* **The Name:** **Bagel**. It's round, it's reliable, and it's a morning staple. It signifies a "Circle of Trust."
* **The Persona:** We are the **Gusto** of Web3. We are friendly, human, and slightly silly. We hide the "scary crypto math" behind warm, approachable metaphors.
  * *Instead of "Yield Vault," we say **"Rising Dough."***
  * *Instead of "Encrypted State," we say **"The Secret Recipe."***
  * *Instead of "ZK-Proof," we say **"Bagel Certified Note."***

* **Visuals:** Warm colors (Toasted Orange, Cream Cheese White), rounded UI elements, soft typography. **Zero "Cyberpunk" aesthetics.**

---

## 2. Business Case: Why Bagel? 💼

### The Problem: The "Glass Office"

Currently, paying employees on Solana is a PR nightmare. Every salary is public. If a company uses standard crypto transfers, competitors see their burn rate, and colleagues see each other's paychecks. This "Glass Office" effect prevents 99% of serious companies from adopting Solana payroll.

### The Solution: Privacy + Yield + Flow

Bagel is a privacy-first payroll engine that feels like a Web2 app but runs on futuristic crypto rails:

1. **Confidential:** Salaries are encrypted. Even we can't see them.
2. **Profitable:** Unspent payroll generates yield (the "Dough Rise") for the employer.
3. **Continuous:** Pay is streamed real-time (every block), not every 2 weeks.

### Why It Wins Hackathons

* **It's Not Just "Cool":** It solves a massive B2B adoption blocker (Privacy).
* **It's "PayFi":** It turns a cost center (Payroll) into a yield generator.
* **It's Institutional:** It includes compliance tools to make regulators happy.

---

## 3. Technical Architecture 🏗️

```mermaid
graph TD
    subgraph "The Bakery (Solana Mainnet)"
        Employer[👨‍🍳 Employer Wallet] -->|Deposit USD1| BagelJar[🥯 The Bagel Jar (Smart Contract)]
        Range[🛡️ Compliance Service] -.->|Audit Check| BagelJar
    end

    subgraph "The Secret Kitchen (Confidential State)"
        BagelJar -->|Encrypted Salary Data| Arcium[🔒 Arcium/Inco Logic]
        Arcium -->|Idle Funds| PrivacyCash[📈 The Dough Rise (Yield SDK)]
    end

    subgraph "The Delivery Route (Execution)"
        MagicBlock[⚡ MagicBlock Rollup] -->|Stream Per Second| StreamState[💸 Accrued Balance]
    end

    subgraph "Employee Experience"
        StreamState -->|Withdraw| ShadowWire[🕵️ ShadowWire ZK-Transfer]
        ShadowWire -->|Private Payday| Employee[👷 Employee Wallet]
    end

```

---

## 4. The Tech Stack (Instructions for Cursor) 🛠️

*Use this section to guide the AI in selecting the right tool for each feature.*

### **A. The Bagel Jar (Encrypted State)**

* **Feature:** Stores "Salary Per Second" and "Total Owed" without revealing numbers.
* **Tool:** **Arcium** (or Inco).
* **Cursor Prompt:** *"Create a Solana program where the `employee_salary` state is stored as an encrypted integer using the Arcium SDK. Ensure the 'view' function is restricted to the owner key."*
* **Resource:** [Arcium Docs](https://docs.arcium.com/developers) | [Inco Docs](https://docs.inco.org/svm/home)

### **B. The Delivery (Private Payouts)**

* **Feature:** The actual transfer of funds to the employee.
* **Tool:** **ShadowWire (Radr Labs)** & **USD1**.
* **Cursor Prompt:** *"Implement the `withdraw_pay` function using ShadowWire's SDK to execute a confidential transfer of USD1 tokens. The transaction on the explorer should obscure the amount."*
* **Resource:** [ShadowWire Repo](https://github.com/Radrdotfun/ShadowWire)

### **C. The Fast Oven (Real-Time Streaming)**

* **Feature:** Updating balances every second without crushing the network.
* **Tool:** **MagicBlock** (Private Ephemeral Rollups).
* **Cursor Prompt:** *"Set up a MagicBlock ephemeral rollup configuration for the payroll stream to handle high-frequency state updates off-chain."*
* **Resource:** [MagicBlock Docs](https://docs.magicblock.gg/)

### **D. The Dough Rise (Yield)**

* **Feature:** Putting idle payroll funds to work.
* **Tool:** **Privacy Cash SDK**.
* **Cursor Prompt:** *"Integrate the Privacy Cash SDK to automatically route `idle_balance` from the Bagel Jar into a private lending vault."*
* **Resource:** [Privacy Cash Website](https://www.privacycash.org/)

### **E. Certified Notes (Compliance)**

* **Feature:** Proof of Income for loans/taxes.
* **Tool:** **Range**.
* **Cursor Prompt:** *"Add a client-side function using Range SDK to generate a ZK-proof attesting that 'User Income > X' without revealing the wallet history."*
* **Resource:** [Range Website](https://www.range.org/)

---

## 5. Prize Strategy (The Loot) 🏆

We are targeting a total potential prize pool of **$43,000**.

| Bounty Target | Requirement | Strategy |
| --- | --- | --- |
| **Track 02: Tooling ($15k)** | Build useful dev infra | Bagel is a "Payroll SDK" other apps can embed. |
| **ShadowWire ($10k)** | Private Transfers | Use ShadowWire for **all** payouts. |
| **Privacy Cash ($6k)** | Best Integration | Make the "Dough Rise" (Yield) a core feature. |
| **Arcium ($5k)** | Encrypted State | Use Arcium for the core logic (The Bagel Jar). |
| **MagicBlock ($2.5k)** | Ephemeral Rollups | Use this for the streaming engine. |
| **Range ($1.5k)** | Compliance | Build the "Certified Note" feature. |
| **Helius ($5k)** | Use Helius RPC | All RPC calls go through Helius. |
| **Inco ($2k)** | Payments category | Alternative to Arcium if needed. |

**TOTAL POTENTIAL: $47,000**

---

## 6. Feature Roadmap 🗺️

### Week 1: The Foundation (MVP)
- [ ] **Day 1-2:** Project setup (Anchor + Next.js)
- [ ] **Day 3-4:** BagelJar smart contract (encrypted state with Arcium)
- [ ] **Day 5-6:** ShadowWire payment integration
- [ ] **Day 7:** Basic employer dashboard

### Week 2: The Secret Sauce
- [ ] **Day 8-9:** MagicBlock streaming integration
- [ ] **Day 10-11:** Privacy Cash yield integration ("Dough Rise")
- [ ] **Day 12-13:** Employee dashboard + withdraw function
- [ ] **Day 14:** Real-time balance updates

### Week 3: The Polish
- [ ] **Day 15-16:** Range compliance features ("Bagel Certified Note")
- [ ] **Day 17:** UI/UX polish + friendly copy
- [ ] **Day 18:** Demo video + documentation
- [ ] **Day 19-20:** Final testing + SUBMIT

---

## 7. Core User Flows 🔄

### Flow A: Employer Sets Up Payroll

1. Connect wallet (Phantom/Solflare)
2. Deposit USD1 into "The Bagel Jar"
3. Add employees (wallet addresses only)
4. Set salary (encrypted instantly via Arcium)
5. Start the "Bake" (streaming begins)

### Flow B: Employee Gets Paid

1. View real-time accrued balance (updated every second)
2. Click "Withdraw Dough"
3. ShadowWire processes private transfer
4. USD1 appears in wallet (amount hidden on-chain)

### Flow C: Employer Earns Yield

1. Idle funds auto-deposited to Privacy Cash vault
2. "Dough Rise" APY displayed on dashboard
3. Yield compounds automatically
4. Withdraw yield anytime

---

## 8. Design System 🎨

### Colors
- **Primary:** `#FF8C42` (Toasted Orange)
- **Secondary:** `#FFF8E7` (Cream Cheese White)
- **Accent:** `#8B4513` (Sesame Seed Brown)
- **Text:** `#2C2416` (Dark Rye)
- **Success:** `#7CB342` (Fresh Chive Green)

### Typography
- **Headings:** Poppins (rounded, friendly)
- **Body:** Inter (clean, readable)
- **Mono:** JetBrains Mono (for wallet addresses)

### Components
- Rounded corners (12px minimum)
- Soft shadows (no harsh edges)
- Friendly microcopy everywhere
- Loading states = "Baking..." with bagel animation

---

## 9. Friendly Terminology Guide 📖

| Crypto Term | Bagel Term |
|-------------|------------|
| Smart Contract | The Bagel Jar |
| Encrypted State | The Secret Recipe |
| Yield Vault | Rising Dough |
| Payment Stream | Dough Flow |
| Withdraw | Get Your Dough |
| ZK Proof | Bagel Certified Note |
| Transaction | Bake |
| Wallet Balance | Your Stash |
| Gas Fee | Toasting Fee |
| APY | Dough Rise Rate |

---

## 10. Technical Implementation Details 🔧

### Smart Contract Structure (Rust/Anchor)

```rust
use anchor_lang::prelude::*;

declare_id!("BaGe1111111111111111111111111111111111111");

#[program]
pub mod bagel_jar {
    use super::*;

    pub fn bake_payroll(
        ctx: Context<BakePayroll>,
        encrypted_salary_per_second: Vec<u8>,
    ) -> Result<()> {
        let payroll = &mut ctx.accounts.payroll;
        payroll.employer = ctx.accounts.employer.key();
        payroll.employee = ctx.accounts.employee.key();
        payroll.encrypted_salary = encrypted_salary_per_second;
        payroll.last_bake = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn get_dough(
        ctx: Context<GetDough>,
    ) -> Result<()> {
        // Calculate accrued amount (on encrypted data)
        // Transfer via ShadowWire
        Ok(())
    }
}

#[account]
pub struct PayrollJar {
    pub employer: Pubkey,
    pub employee: Pubkey,
    pub encrypted_salary: Vec<u8>,  // Arcium encrypted
    pub last_bake: i64,
    pub dough_vault: Pubkey,  // Privacy Cash vault
}
```

### Frontend Structure (Next.js)

```
/app
  /bakery (employer dashboard)
    /page.tsx
    /components
      /BagelJar.tsx
      /EmployeeList.tsx
      /DoughRise.tsx
  /payday (employee dashboard)
    /page.tsx
    /components
      /AccruedBalance.tsx
      /WithdrawButton.tsx
  /components
    /WalletConnect.tsx
    /BagelNav.tsx
/lib
  /arcium.ts
  /shadowwire.ts
  /magicblock.ts
  /privacy-cash.ts
```

---

## 11. Success Metrics 📊

### For Hackathon Judging
- ✅ All 5 sponsor integrations working
- ✅ Live demo on devnet
- ✅ Beautiful UI (warm, friendly)
- ✅ Clear documentation
- ✅ 3-minute demo video

### For Product
- Employee can withdraw funds privately
- Employer sees yield generated
- No salary amounts visible on-chain
- Streaming updates every second (via MagicBlock)
- "Bagel Certified Note" generates successfully

---

## 12. Demo Script 🎬

**Duration:** 3 minutes

**0:00 - 0:30 | The Problem**
> "Meet Sarah. She runs a crypto startup. She wants to pay her team on Solana, but there's a problem: every transaction is public. Her competitors can see her burn rate. Her employees can see each other's salaries. This 'Glass Office' kills adoption."

**0:30 - 1:00 | The Solution**
> "Introducing Bagel: the private payroll platform for Solana. With Bagel, Sarah's team gets paid in real-time, but nobody sees the amounts. Not competitors. Not coworkers. Not even us."

**1:00 - 2:00 | The Demo**
> [Screen recording]
> - Sarah deposits 50,000 USD1 into the Bagel Jar
> - Adds 3 employees with different salaries
> - Shows "Dough Rise" earning 8% APY on idle funds
> - Employee view: real-time balance ticking up
> - Employee clicks "Get Your Dough" → ShadowWire transfer
> - Check Solana Explorer: amount is hidden ✨

**2:00 - 2:30 | The Tech**
> "Under the hood: Arcium encrypts salaries, MagicBlock streams payments every second, ShadowWire keeps amounts private, Privacy Cash generates yield, and Range provides compliance."

**2:30 - 3:00 | The Impact**
> "Bagel isn't just a hackathon project. It's the missing piece for institutional Solana adoption. Simple payroll. Private paydays. And a little extra cream cheese on top. 🥯"

---

## 13. How to Start (Copy-Paste for Cursor)

> "You are an expert Solana developer building **Bagel**, a friendly private payroll app.  
> **Context:** We are using **Arcium** for encrypted state, **ShadowWire** for private payouts, and **MagicBlock** for streaming.  
> **Brand:** The code variables and UI text should be friendly (e.g., `bake_transaction`, `dough_vault`).  
> **First Task:** Initialize the Anchor project structure. Create the `BagelJar` program that accepts a deposit of USD1 and initializes an encrypted state account for an employee using the Arcium SDK pattern. Please reference the [Arcium Docs](https://docs.arcium.com/developers) for the syntax."

---

## 14. Resources 📚

### Sponsor Documentation
- **Arcium:** https://docs.arcium.com/developers
- **ShadowWire:** https://github.com/Radrdotfun/ShadowWire
- **MagicBlock:** https://docs.magicblock.gg/
- **Privacy Cash:** https://www.privacycash.org/
- **Range:** https://www.range.org/
- **Helius:** https://docs.helius.dev/
- **Inco:** https://docs.inco.org/svm/home

### Solana Core
- **Anchor:** https://www.anchor-lang.com/
- **Solana Web3.js:** https://solana-labs.github.io/solana-web3.js/
- **SPL Token:** https://spl.solana.com/token

### Design Tools
- **Figma Community:** Search "payroll dashboard"
- **Color Palette:** https://coolors.co/ff8c42-fff8e7-8b4513

---

## 15. Team Roles (If Applicable) 👥

- **Smart Contract:** Rust/Anchor developer
- **Frontend:** Next.js/React developer  
- **Privacy Integration:** Crypto-savvy dev for SDK integrations
- **Design:** UI/UX for the friendly brand
- **Demo/Pitch:** Video editor + presenter

---

## 16. Post-Hackathon Roadmap 🚀

### Phase 1: Launch (Q1 2026)
- Mainnet deployment
- First 10 DAO customers
- Testimonials + case studies

### Phase 2: Scale (Q2 2026)
- Embeddable widget for other apps
- Multi-currency support (SOL, USDC, EUR)
- Mobile app (iOS/Android)

### Phase 3: Platform (Q3 2026)
- HR features (PTO tracking, benefits)
- Contractor payments
- International compliance

---

## 17. FAQs for Judges 🤔

**Q: How is this different from [existing payroll tool]?**
> A: Traditional crypto payroll is public. Bagel is the first truly private payroll on Solana, using cutting-edge privacy tech (Arcium, ShadowWire).

**Q: Why not just use a centralized database?**
> A: Because then you have to trust us. With Bagel, salaries are encrypted on-chain. We literally can't see them.

**Q: What's the business model?**
> A: 1% fee on payroll volume + we keep 10% of the yield generated. Win-win.

**Q: Can employees game the system?**
> A: No. Withdrawals are capped at accrued balance. The smart contract enforces this.

**Q: What if an employer goes bankrupt?**
> A: Employees can always withdraw their accrued balance. Funds are never locked.

---

**END OF SPEC**

---

*This document is living. Update it as the project evolves. When in doubt, stay true to the brand: warm, friendly, and a little bit silly. 🥯*
