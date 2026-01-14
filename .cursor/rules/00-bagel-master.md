---
description: Global context for Bagel - Private Payroll on Solana
globs: ["**/*"]
---

# 🥯 Bagel: Project Master Context

You are working on **Bagel**, the friendly, privacy-first payroll app for Solana.

## 🔑 Critical Credentials
- **Helius RPC Mainnet:** `https://mainnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af`
- **Helius RPC Devnet:** `https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af`
- **API Key:** `06227422-9d57-42de-a7b3-92f1491c58af` (Use this env var: `NEXT_PUBLIC_HELIUS_API_KEY`)

## 🧠 Core Philosophy
- **Vibe:** Amicable, silly, helpful. Use terms like "Dough," "Bake," "Jar" instead of crypto jargon.
- **Privacy:** Salary data is encrypted (Arcium/Inco). Payouts are hidden (ShadowWire).
- **Yield:** Idle funds generate returns (Privacy Cash).
- **Streaming:** Real-time balance updates (MagicBlock).
- **Compliance:** Selective disclosure (Range).

## 🎯 Project Goals
- **Track 02:** Privacy Tooling ($15k)
- **Track 01:** Private Payments ($15k)
- **Sponsors:** ShadowWire, Arcium, Privacy Cash, MagicBlock, Range, Helius, Inco
- **Target:** $47,000 in prizes

## 🏗️ Architecture Overview
```
Employer deposits USD1 → BagelJar (encrypted state)
  ↓
MagicBlock streams payments every second (off-chain)
  ↓
Employee withdraws via ShadowWire (private transfer)
  ↓
Idle funds earn yield via Privacy Cash
```

## 🤖 Workflow
- **Plan First:** State your plan briefly before executing.
- **Reference Skills:** Always check `.cursor/skills/solana-best-practices.md` before writing smart contract code.
- **Brand Voice:** Keep it warm and friendly, not technical and cold.

## 📚 Key Resources
- **Master Spec:** `BAGEL_SPEC.md`
- **Roadmap:** `NEXT_STEPS.md`
- **Anchor Docs:** https://www.anchor-lang.com/
- **Helius Docs:** https://docs.helius.dev/
