# 🛠️ Bagel Deployment Scripts

This directory contains scripts for deploying Bagel components.

## Scripts

### `deploy-arcium-circuit.sh`
Deploy the payroll MPC circuit to Arcium network.

**Usage:**
```bash
# Deploy to devnet (default)
./scripts/deploy-arcium-circuit.sh

# Deploy to mainnet
./scripts/deploy-arcium-circuit.sh mainnet
```

**Prerequisites:**
- Docker installed and running
- Arcium CLI installed (`arcup install`)
- SOL for deployment fees

**What it does:**
1. Validates circuit file exists
2. Builds circuit with `arcium build`
3. Deploys to specified network
4. Retrieves circuit ID
5. Updates `.env.local` automatically

**Output:**
- Circuit ID in terminal
- Updated `.env.local` file
- Next steps instructions

## Future Scripts

- `deploy-solana.sh` - Deploy Bagel program to Solana
- `test-integration.sh` - Run end-to-end integration tests
- `setup-dev.sh` - Set up local development environment

## Environment Variables

After running `deploy-arcium-circuit.sh`, check `app/.env.local`:
```bash
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=<circuit_id>
NEXT_PUBLIC_BAGEL_PROGRAM_ID=8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
```

## Troubleshooting

**"Arcium CLI not found":**
- Install Docker Desktop
- Run: `curl https://install.arcium.com/ | bash`
- Run: `arcup install`

**"Circuit build failed":**
- Check syntax in `programs/bagel/circuits/payroll.arcis`
- Verify Arcium CLI version: `arcium --version`

**"Deployment failed":**
- Check SOL balance for deployment fees
- Verify network connectivity
- Try manual deployment via dashboard

## Manual Deployment

If CLI installation is not possible:

1. Visit https://dashboard.arcium.com
2. Upload `programs/bagel/circuits/payroll.arcis`
3. Select network: devnet
4. Copy circuit ID
5. Add to `.env.local` manually

## Notes

- Circuit deployment is one-time setup
- Circuit ID is needed for on-chain program
- Keep circuit ID in version control (.env.example)
- Redeploy only when circuit logic changes
