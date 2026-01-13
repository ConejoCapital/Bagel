# 🥯 Bagel - The People Platform for Solana

**Simple payroll, private paydays, and a little extra cream cheese.**

Built for the [Solana Privacy Hackathon](https://solana.com/privacyhack) (January 2026)

---

## What is Bagel?

Bagel is a **privacy-first payroll platform** for Web3 teams. We solve the "Glass Office" problem where every crypto payment is publicly visible on the blockchain.

With Bagel:
- 💼 **Employers** can pay teams without revealing salaries
- 🔒 **Employees** get paid privately (amounts hidden on-chain)
- 📈 **Everyone** benefits from yield on idle payroll funds
- ⚡ **Payments** stream in real-time (every second)

---

## Why Bagel?

### The Problem

Currently, paying employees on Solana means:
- ❌ Competitors see your burn rate
- ❌ Colleagues see each other's paychecks  
- ❌ Zero privacy for sensitive financial data
- ❌ This "Glass Office" prevents institutional adoption

### The Solution

Bagel uses cutting-edge privacy tech to make payroll confidential:
- ✅ **Arcium/Inco** - Encrypted salary state
- ✅ **ShadowWire** - Private payment transfers
- ✅ **MagicBlock** - Real-time streaming
- ✅ **Privacy Cash** - Yield generation
- ✅ **Range** - Compliance tools

---

## Features

### 🥯 The Bagel Jar (Encrypted State)
Your payroll vault where salaries are encrypted. Even we can't see them.

### 📈 Rising Dough (Yield Generation)  
Idle payroll funds automatically earn yield. Turn a cost center into profit.

### ⚡ Dough Flow (Real-Time Streaming)
Employees see their balance grow every second. No more waiting for payday.

### 🛡️ Bagel Certified Note (Compliance)
Generate zero-knowledge proofs of income for loans/taxes without revealing details.

---

## Tech Stack

- **Smart Contracts:** Rust + Anchor Framework
- **Privacy Layer:** Arcium (encrypted state), ShadowWire (private transfers)
- **Streaming:** MagicBlock Private Ephemeral Rollups
- **Yield:** Privacy Cash SDK
- **Compliance:** Range
- **Frontend:** Next.js 14 + TypeScript
- **Styling:** Tailwind CSS (with warm, rounded design system)
- **RPC:** Helius

---

## Project Structure

```
/
├── BAGEL_SPEC.md          # Master specification (READ THIS FIRST!)
├── README.md              # This file
├── /programs              # Solana programs (Rust/Anchor)
│   └── /bagel-jar         # Main payroll contract
├── /app                   # Next.js frontend
│   ├── /bakery            # Employer dashboard
│   └── /payday            # Employee dashboard
├── /lib                   # SDK integrations
│   ├── arcium.ts          # Encrypted state
│   ├── shadowwire.ts      # Private transfers
│   ├── magicblock.ts      # Streaming
│   └── privacy-cash.ts    # Yield
└── /tests                 # Integration tests
```

---

## Getting Started

### Prerequisites

```bash
# Rust + Solana CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Anchor
npm install -g @coral-xyz/anchor-cli

# Node.js 18+
nvm install 18
nvm use 18
```

### Installation

```bash
# Clone the repo
git clone https://github.com/ConejoCapital/Bagel.git
cd Bagel

# Install dependencies
npm install

# Build smart contracts
anchor build

# Run tests
anchor test

# Start frontend
cd app
npm run dev
```

---

## Development Roadmap

### ✅ Week 1: Foundation (Jan 13-19)
- [x] Project setup
- [ ] BagelJar smart contract
- [ ] Arcium integration
- [ ] ShadowWire integration
- [ ] Basic employer dashboard

### ⏳ Week 2: Secret Sauce (Jan 20-26)
- [ ] MagicBlock streaming
- [ ] Privacy Cash yield
- [ ] Employee dashboard
- [ ] Real-time updates

### 📅 Week 3: Polish (Jan 27-30)
- [ ] Range compliance
- [ ] UI/UX polish
- [ ] Demo video
- [ ] Documentation
- [ ] **SUBMIT!**

---

## Prize Strategy

Targeting **$47,000** across these categories:

| Sponsor | Prize | Integration |
|---------|-------|-------------|
| Track 02: Privacy Tooling | $15,000 | Embeddable SDK |
| ShadowWire | $10,000 | All payouts |
| Privacy Cash | $6,000 | Yield feature |
| Arcium | $5,000 | Encrypted state |
| Helius | $5,000 | RPC infrastructure |
| MagicBlock | $2,500 | Streaming engine |
| Inco | $2,000 | Payments |
| Range | $1,500 | Compliance |

---

## Design Philosophy

**We are the Gusto of Web3.**

- 🎨 Warm colors (Toasted Orange, Cream Cheese White)
- 🔤 Friendly copy (no crypto jargon)
- 🎯 Simple UX (hide the complexity)
- 😊 Slightly silly (it's called Bagel, after all)

### Brand Voice Examples

| ❌ Crypto Speak | ✅ Bagel Speak |
|----------------|---------------|
| "Initialize encrypted vault" | "Start baking" |
| "Yield generation protocol" | "Rising dough" |
| "ZK proof verification" | "Bagel certified note" |
| "Execute transaction" | "Bake it" |

---

## Contributing

This is a hackathon project, but contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Please maintain the friendly brand voice in all code and copy!**

---

## Demo Video Script

*Coming soon - see BAGEL_SPEC.md for full script*

---

## Resources

- [Bagel Spec](./BAGEL_SPEC.md) - Master source of truth
- [Solana Privacy Hackathon](https://solana.com/privacyhack)
- [Arcium Docs](https://docs.arcium.com/developers)
- [ShadowWire GitHub](https://github.com/Radrdotfun/ShadowWire)
- [MagicBlock Docs](https://docs.magicblock.gg/)
- [Privacy Cash](https://www.privacycash.org/)
- [Range](https://www.range.org/)

---

## Team

Built by [ConejoCapital](https://github.com/ConejoCapital) for the Solana Privacy Hackathon 2026.

---

## License

MIT License - See [LICENSE](./LICENSE) for details

---

## Support

- Twitter: [Coming soon]
- Discord: [Coming soon]
- Email: [Coming soon]

---

**🥯 Remember: Simple payroll, private paydays, and a little extra cream cheese.**

Built with ❤️ (and privacy) on Solana
