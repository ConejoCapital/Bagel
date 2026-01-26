# Bagel Deployment Scripts

This directory contains scripts for deploying Bagel components and managing confidential tokens.

## Core Deployment Scripts

### `deploy-mainnet.sh`
Deploy Bagel program to Solana mainnet.

**Usage:**
```bash
./scripts/deploy-mainnet.sh
```

**Prerequisites:**
- Solana CLI configured for mainnet
- Sufficient SOL for deployment fees
- Anchor CLI 0.31.1

### `deploy-confidential-mint.sh`
Deploy the Inco Confidential Token Program to devnet/mainnet.

**Usage:**
```bash
./scripts/deploy-confidential-mint.sh
```

**What it does:**
- Clones the Inco Confidential Token program repository
- Builds and deploys the program
- Saves program ID to `.confidential-token-config`

**Prerequisites:**
- Solana CLI configured
- Sufficient SOL (~4-5 SOL for deployment)
- Git installed

### `deploy-confidential-payroll.sh`
Complete deployment script for confidential token payroll setup.

**Usage:**
```bash
./scripts/deploy-confidential-payroll.sh
```

**What it does:**
- Deploys Inco Confidential Token Program
- Creates USDBagel mint
- Initializes token accounts
- Configures Bagel program

## Confidential Token Setup Scripts

### `initialize-usdbagel-mint.mjs`
Initialize the USDBagel confidential mint.

**Usage:**
```bash
node scripts/initialize-usdbagel-mint.mjs
```

**What it does:**
- Creates a new confidential token mint (USDBagel)
- Sets decimals (9)
- Saves mint address to `.confidential-token-config`

**Prerequisites:**
- Inco Confidential Token Program deployed
- Configuration file exists

### `initialize-confidential-accounts.mjs`
Initialize confidential token accounts and mint initial tokens.

**Usage:**
```bash
node scripts/initialize-confidential-accounts.mjs
```

**What it does:**
- Creates token accounts for depositor, vault, and employee
- Mints initial tokens to depositor (encrypted on-chain)
- Saves account addresses to `.confidential-token-config`

**Prerequisites:**
- USDBagel mint initialized
- Inco Confidential Token Program deployed

### `configure-bagel-confidential.mjs`
Configure the Bagel program to use confidential tokens.

**Usage:**
```bash
node scripts/configure-bagel-confidential.mjs
```

**What it does:**
- Calls `configure_confidential_mint` instruction
- Sets the confidential mint address in MasterVault
- Enables `use_confidential_tokens` flag

**Prerequisites:**
- Bagel program deployed
- MasterVault initialized (and migrated if needed)
- USDBagel mint created

## Migration Scripts

### `migrate-vault.mjs`
Migrate existing MasterVault from old structure to new structure.

**Usage:**
```bash
node scripts/migrate-vault.mjs
```

**What it does:**
- Calls `migrate_vault` instruction
- Upgrades vault from 122 bytes to 154 bytes
- Adds `confidential_mint` and `use_confidential_tokens` fields
- Preserves all existing data

**When to use:**
- When upgrading from old Bagel deployment
- Before enabling confidential tokens on existing vault

**Prerequisites:**
- Bagel program with `migrate_vault` instruction deployed
- Authority wallet has sufficient SOL

### `close-old-vault.mjs`
Close an old MasterVault account (for testing/migration).

**Usage:**
```bash
node scripts/close-old-vault.mjs
```

**What it does:**
- Calls `close_vault` instruction
- Transfers lamports back to authority
- Closes the account

**When to use:**
- Testing scenarios
- After migration to new vault structure
- Cleanup of old deployments


## Confidential Token Setup Workflow

### Complete Setup (First Time)

1. **Deploy Inco Confidential Token Program:**
   ```bash
   ./scripts/deploy-confidential-mint.sh
   ```

2. **Initialize USDBagel Mint:**
   ```bash
   node scripts/initialize-usdbagel-mint.mjs
   ```

3. **Initialize Token Accounts:**
   ```bash
   node scripts/initialize-confidential-accounts.mjs
   ```

4. **Migrate Vault (if upgrading from old deployment):**
   ```bash
   node scripts/migrate-vault.mjs
   ```

5. **Configure Bagel Program:**
   ```bash
   node scripts/configure-bagel-confidential.mjs
   ```

### Configuration File

All scripts save configuration to `.confidential-token-config`:
- `INCO_TOKEN_PROGRAM_ID` - Inco Confidential Token Program ID
- `USDBAGEL_MINT` - USDBagel mint address
- `DEPOSITOR_TOKEN_ACCOUNT` - Depositor's token account
- `VAULT_TOKEN_ACCOUNT` - Vault's token account
- `EMPLOYEE_TOKEN_ACCOUNT` - Employee's token account

**Note:** This file is in `.gitignore` and should not be committed.

## Environment Variables

After deployment, update `app/.env.local`:
```bash
NEXT_PUBLIC_BAGEL_PROGRAM_ID=J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_HELIUS_API_KEY=YOUR_KEY
NEXT_PUBLIC_RANGE_API_KEY=YOUR_KEY
NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID=HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22
```

## Deployment Checklist

1. Build the program: `anchor build`
2. Run tests: `anchor test`
3. Deploy to devnet first: `anchor deploy --provider.cluster devnet`
4. Verify on explorer
5. Deploy to mainnet when ready

## Troubleshooting

**"Insufficient funds":**
- Check SOL balance for deployment fees
- Devnet: Use faucet at https://faucet.solana.com/

**"Program deploy failed":**
- Verify Anchor version matches Cargo.toml
- Check program size limits

**"Transaction failed":**
- Check network connectivity
- Verify RPC endpoint is responsive

## Notes

- Program deployment is one-time per network
- Keep program ID in version control
- Test thoroughly on devnet before mainnet
