# Bagel Project Structure

Clean, organized structure for the Bagel platform.

## Root Directory

```
Bagel/
├── README.md                    # Main project overview
├── LICENSE                      # MIT License
├── .gitignore                   # Git ignore rules
│
├── 📚 Documentation
├── CONTRIBUTING.md              # How to contribute
├── DEVELOPMENT.md               # Setup and build guide
├── TROUBLESHOOTING.md           # Common issues and fixes
├── TESTING_GUIDE.md             # How to test the platform
├── DEMO_SCRIPT.md               # Video demo walkthrough
│
├── 🚀 Deployment Guides
├── DEPLOY_NOW.md                # Quick Vercel deployment
├── VERCEL_DEPLOYMENT.md         # Complete Vercel guide
├── MAINNET_CHECKLIST.md         # Mainnet deployment checklist
├── KAMINO_INTEGRATION_PLAN.md   # Real yield integration
│
├── 📁 Core Directories
├── programs/                    # Solana smart contracts
├── app/                         # Next.js frontend
├── tests/                       # Integration tests
├── scripts/                     # Deployment scripts
├── docs/                        # Technical documentation
│
└── 🗄️ Archive
    └── .archive/                # Historical docs (hidden)
```

## Programs Directory (`programs/bagel/`)

```
programs/bagel/
├── Cargo.toml                   # Rust dependencies
├── Xargo.toml                   # Cross-compilation config
│
├── src/
│   ├── lib.rs                   # Program entry point
│   ├── constants.rs             # Constants and seeds
│   ├── error.rs                 # Custom error codes
│   │
│   ├── state/
│   │   └── mod.rs               # Account structures
│   │
│   ├── instructions/
│   │   ├── mod.rs               # Instruction exports
│   │   ├── bake_payroll.rs      # Create payroll
│   │   ├── deposit_dough.rs     # Fund payroll
│   │   ├── get_dough.rs         # Employee withdrawal
│   │   ├── update_salary.rs     # Modify salary
│   │   └── close_jar.rs         # Close payroll
│   │
│   └── privacy/
│       ├── mod.rs               # Privacy module exports
│       ├── arcium.rs            # Arcium MPC integration
│       ├── shadowwire.rs        # ShadowWire ZK integration
│       ├── magicblock.rs        # MagicBlock streaming
│       └── kamino.rs            # Kamino yield (NEW!)
│
├── circuits/
│   └── payroll.arcis            # Arcium MPC circuit
│
└── target/
    └── deploy/
        ├── bagel.so             # Compiled program
        └── bagel-keypair.json   # Program keypair
```

## App Directory (`app/`)

```
app/
├── package.json                 # Frontend dependencies
├── next.config.js               # Next.js configuration
├── tsconfig.json                # TypeScript config
├── tailwind.config.js           # Tailwind CSS config
├── postcss.config.js            # PostCSS config
├── .env.local                   # Environment variables
├── .vercelignore                # Vercel ignore rules
├── vercel.json                  # Vercel deployment config
│
├── pages/
│   ├── _app.tsx                 # App wrapper (wallet provider)
│   ├── index.tsx                # Landing page
│   ├── employer.tsx             # Employer dashboard
│   └── employee.tsx             # Employee dashboard
│
├── components/
│   └── WalletButton.tsx         # Client-only wallet button
│
├── styles/
│   └── globals.css              # Global styles + Tailwind
│
└── lib/
    ├── arcium.ts                # Arcium client
    ├── shadowwire.ts            # ShadowWire client
    ├── magicblock.ts            # MagicBlock client
    └── kamino.ts                # Kamino client (NEW!)
```

## Tests Directory (`tests/`)

```
tests/
├── bagel.ts                     # Main program tests
└── arcium-e2e.ts                # Arcium integration tests
```

## Scripts Directory (`scripts/`)

```
scripts/
├── README.md                    # Scripts documentation
├── deploy-arcium-circuit.sh     # Deploy Arcium circuit
├── deploy-arcium-cli.sh         # Arcium CLI deployment
└── update-circuit-id.sh         # Update circuit ID
```

## Docs Directory (`docs/`)

```
docs/
└── ARCHITECTURE.md              # Technical architecture
```

## Archive Directory (`.archive/`)

Hidden folder containing historical documentation:

```
.archive/
├── README.md                    # Archive overview
├── status-reports/              # Development progress
│   ├── BUILD_SUCCESS.md
│   ├── DEPLOYED.md
│   ├── FRONTEND_COMPLETE.md
│   └── [other status docs]
│
└── integration-docs/            # Integration research
    ├── ALL_INTEGRATIONS_COMPLETE.md
    └── PRIVACY_SDK_INTEGRATION.md
```

## Configuration Files

### Root Level
- **Anchor.toml** - Anchor framework configuration
- **Arcium.toml** - Arcium toolchain configuration
- **LICENSE** - MIT License
- **.gitignore** - Git ignore rules
- **tsconfig.json** - Root TypeScript config

### App Level
- **package.json** - Frontend dependencies
- **next.config.js** - Next.js settings
- **tailwind.config.js** - Tailwind CSS configuration
- **vercel.json** - Vercel deployment settings
- **.env.local** - Environment variables (not in git)

## Key Files by Purpose

### For Users
- `README.md` - Start here!
- `DEMO_SCRIPT.md` - How to demo
- `TESTING_GUIDE.md` - How to test

### For Developers
- `DEVELOPMENT.md` - Setup guide
- `CONTRIBUTING.md` - How to contribute
- `docs/ARCHITECTURE.md` - Technical details

### For Deployment
- `DEPLOY_NOW.md` - Quick deploy
- `VERCEL_DEPLOYMENT.md` - Complete guide
- `MAINNET_CHECKLIST.md` - Production prep

### For Integration
- `KAMINO_INTEGRATION_PLAN.md` - Real yield
- `programs/bagel/src/privacy/` - SDK integrations

## File Naming Conventions

### Documentation
- `UPPERCASE_WITH_UNDERSCORES.md` - Important docs
- `lowercase-with-dashes.md` - Supporting docs

### Code
- `snake_case.rs` - Rust files
- `camelCase.tsx` - TypeScript/React files
- `kebab-case.css` - Style files

### Configuration
- `lowercase.toml` - Rust configs
- `lowercase.json` - JSON configs
- `lowercase.js` - JavaScript configs

## Important Paths

### Program
- **Source**: `programs/bagel/src/`
- **Binary**: `programs/bagel/target/deploy/bagel.so`
- **Keypair**: `programs/bagel/target/deploy/bagel-keypair.json`

### Frontend
- **Pages**: `app/pages/`
- **Components**: `app/components/`
- **Client Libraries**: `app/lib/`
- **Styles**: `app/styles/`

### Documentation
- **Main**: Root `*.md` files
- **Technical**: `docs/`
- **Historical**: `.archive/`

## Git Structure

### Tracked
- All source code
- Documentation
- Configuration files
- Package manifests

### Ignored (.gitignore)
- `node_modules/`
- `target/` (Rust build artifacts)
- `.next/` (Next.js build)
- `.env.local` (secrets)
- `.DS_Store` (macOS)
- `*.log` (log files)

## Clean Repository Checklist

- [x] Old status docs moved to `.archive/`
- [x] Integration docs organized
- [x] Main docs easy to find
- [x] Clear directory structure
- [x] Proper .gitignore
- [x] Documentation up to date

## Navigation Tips

### Starting Point
1. Read `README.md`
2. Follow `TESTING_GUIDE.md`
3. Check `DEMO_SCRIPT.md`

### For Development
1. Read `DEVELOPMENT.md`
2. Review `docs/ARCHITECTURE.md`
3. Check `programs/bagel/src/`

### For Deployment
1. Test locally first
2. Follow `DEPLOY_NOW.md`
3. Use `MAINNET_CHECKLIST.md` for production

### For Integration
1. Review `KAMINO_INTEGRATION_PLAN.md`
2. Check `programs/bagel/src/privacy/`
3. Update `app/lib/` clients

## Maintenance

### Regular Updates
- Keep README.md current
- Update deployment guides
- Maintain architecture docs
- Archive old status reports

### Before Each Release
- Update version numbers
- Review documentation
- Clean up unused files
- Update changelogs

---

**A clean repository makes for happy developers!** 🥯✨
