# Bagel Deployment Scripts

This directory contains scripts for deploying Bagel components.

## Scripts

### `deploy-arcium-circuit.sh` (Deprecated)
Deploy the payroll MPC circuit to Arcium network. Note: This project now uses Inco Lightning instead of Arcium.

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

## Environment Variables

After deployment, update `app/.env.local`:
```bash
NEXT_PUBLIC_BAGEL_PROGRAM_ID=J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_HELIUS_API_KEY=YOUR_KEY
NEXT_PUBLIC_RANGE_API_KEY=YOUR_KEY
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
