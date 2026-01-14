# 🤖 Bagel Agent System

This folder contains the agent-based development workflow for Bagel.

## Structure

```
.cursor/
├── skills/
│   └── solana-best-practices.md    # Solana development standards
└── rules/
    ├── 00-bagel-master.md          # Global project context
    ├── 01-architect.md             # Smart contract architecture
    ├── 02-backend-privacy.md       # Privacy implementation (Arcium)
    ├── 03-backend-payouts.md       # Payouts (ShadowWire + MagicBlock)
    ├── 04-frontend-bagel.md        # UI/UX and brand
    ├── 05-infrastructure.md        # Helius RPC integration
    └── 06-security.md              # Security & Range compliance
```

## How It Works

Each agent rule file provides context for specific parts of the codebase:
- **Globs:** Define which files the agent should focus on
- **Guidelines:** Specific coding standards and patterns
- **Examples:** Working code snippets

## Usage

Cursor AI automatically loads these rules when you're working on matching files.

For example:
- Working on `programs/bagel/src/lib.rs`? → Architect agent activates
- Working on `app/components/WithdrawButton.tsx`? → Frontend agent activates
- Working on `lib/helius/connection.ts`? → Infrastructure agent activates

## Benefits

1. **Parallel Development:** Multiple agents can work simultaneously
2. **Consistent Patterns:** All agents follow the same skill standards
3. **Specialized Knowledge:** Each agent is an expert in their domain
4. **Brand Consistency:** Frontend agent ensures warm, friendly copy

## The Team

| Agent | Role | Expertise |
|-------|------|-----------|
| 🥯 **Master** | Project Manager | Global context, credentials, philosophy |
| 📐 **Architect** | Systems Designer | Smart contract structure, PDAs, security |
| 👩‍🍳 **Privacy** | Secret Kitchen | Arcium encryption, private state |
| 🚚 **Payouts** | Delivery | ShadowWire transfers, MagicBlock streaming |
| 🥯 **Brand** | Frontend | UI/UX, Helius integration, friendly copy |
| 🌩️ **Infrastructure** | Platform Engineer | Helius RPC, webhooks, priority fees |
| 👮 **Security** | Compliance Officer | Audits, Range integration, access control |

## Skills

The `skills/` folder contains reusable expertise that all agents reference:
- **solana-best-practices.md:** Security standards, Anchor patterns, Helius optimization

## Development Workflow

1. **Start work** on a file
2. **Agent activates** based on file path
3. **Agent references** relevant skills
4. **Code generated** follows standards
5. **Brand voice** maintained automatically

## Adding New Agents

To add a new specialized agent:

1. Create `.cursor/rules/XX-agent-name.md`
2. Define the glob patterns for activation
3. Write guidelines and examples
4. Reference relevant skills

## Important Notes

- **Helius API Key** is in the master context (never hardcode it!)
- **Brand voice** must be maintained (use friendly terms like "Dough," "Bake")
- **Security standards** from skills must be followed
- **Priority fees** must use Helius `getPriorityFeeEstimate`

## Quick Reference

### Friendly Terminology
| ❌ Technical | ✅ Bagel Speak |
|-------------|---------------|
| Initialize vault | Start baking |
| Yield APY | Dough rise rate |
| ZK proof | Bagel certified note |
| Execute tx | Bake it |
| Withdraw | Get your dough |

### Key Resources
- **Master Spec:** `../BAGEL_SPEC.md`
- **Roadmap:** `../NEXT_STEPS.md`
- **Helius Docs:** https://docs.helius.dev/
- **Anchor Docs:** https://www.anchor-lang.com/

---

**🥯 Simple payroll, private paydays, and a little extra cream cheese.**
