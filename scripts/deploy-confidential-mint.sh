#!/bin/bash
# 🔒 Deploy Confidential USDBagel Token Mint
#
# This script deploys the Inco Confidential SPL Token program (if needed)
# and creates a USDBagel confidential token mint for private payroll transfers.
#
# Prerequisites:
#   - Devnet SOL in wallet (~2-3 SOL recommended)
#   - Anchor CLI installed
#   - Solana CLI configured for devnet
#   - Git (to clone Inco repository)
#
# Usage:
#   ./scripts/deploy-confidential-mint.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Deploy Confidential USDBagel Token Mint${NC}"
echo -e "${BLUE}==========================================${NC}\n"

# Check if we're on devnet
echo -e "${BLUE}📋 Step 1: Verifying Devnet Configuration${NC}"
CURRENT_CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')

if [[ "$CURRENT_CLUSTER" != *"devnet"* ]]; then
    echo -e "${YELLOW}⚠️  Warning: Solana CLI not configured for devnet${NC}"
    echo -e "${YELLOW}   Current RPC: $CURRENT_CLUSTER${NC}"
    echo -e "${YELLOW}   Run: solana config set --url https://api.devnet.solana.com${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check SOL balance
echo -e "${BLUE}💰 Step 2: Checking SOL Balance${NC}"
BALANCE=$(solana balance --lamports | awk '{print $1}')
BALANCE_SOL=$(echo "scale=2; $BALANCE / 1000000000" | bc)

echo -e "   Balance: ${GREEN}$BALANCE_SOL SOL${NC}"

if (( $(echo "$BALANCE_SOL < 2.0" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Low SOL balance. Recommended: 2-3 SOL${NC}"
    echo -e "${YELLOW}   Current: $BALANCE_SOL SOL${NC}"
    echo -e "${YELLOW}   Get devnet SOL: solana airdrop 2${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Clone Inco Confidential Token repository
echo -e "${BLUE}📦 Step 3: Setting Up Inco Confidential Token Program${NC}"
INCO_REPO_DIR="/tmp/inco-confidential-token"

if [ -d "$INCO_REPO_DIR" ]; then
    echo -e "${YELLOW}   Repository already exists, updating...${NC}"
    cd "$INCO_REPO_DIR"
    git pull
else
    echo -e "${BLUE}   Cloning Inco Confidential Token repository...${NC}"
    git clone https://github.com/Inco-fhevm/lightning-rod-solana.git "$INCO_REPO_DIR"
    cd "$INCO_REPO_DIR"
fi

# Build the program
echo -e "${BLUE}🔨 Step 4: Building Confidential Token Program${NC}"
if anchor build; then
    echo -e "${GREEN}✅ Build successful${NC}\n"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/inco_token-keypair.json)
echo -e "${BLUE}📝 Step 5: Confidential Token Program ID${NC}"
echo -e "   Program ID: ${GREEN}$PROGRAM_ID${NC}"

# Check if program already exists
if solana program show "$PROGRAM_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Program already deployed${NC}"
    read -p "Upgrade existing program? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        DEPLOY_MODE="upgrade"
    else
        DEPLOY_MODE="skip"
    fi
else
    DEPLOY_MODE="deploy"
fi

# Deploy program
if [ "$DEPLOY_MODE" == "deploy" ] || [ "$DEPLOY_MODE" == "upgrade" ]; then
    echo -e "${BLUE}🚀 Step 6: Deploying Confidential Token Program${NC}"
    if [ "$DEPLOY_MODE" == "upgrade" ]; then
        echo -e "${YELLOW}   Mode: Upgrade existing program${NC}"
    else
        echo -e "${YELLOW}   Mode: New deployment${NC}"
    fi
    
    if anchor deploy --provider.cluster devnet; then
        echo -e "${GREEN}✅ Program deployed successfully${NC}\n"
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Skipping program deployment${NC}\n"
fi

# Create USDBagel mint
echo -e "${BLUE}🪙 Step 7: Creating USDBagel Confidential Mint${NC}"
echo -e "${YELLOW}   This will create a confidential token mint for USDBagel${NC}"
echo -e "${YELLOW}   Mint authority will be set to deployer wallet${NC}"

# Note: Actual mint creation requires TypeScript/Anchor client
# This script provides the program ID, mint creation should be done via test script
echo -e "${BLUE}   Program ID for mint creation: ${GREEN}$PROGRAM_ID${NC}"
echo -e "${BLUE}   Save this program ID for mint initialization${NC}"

# Save configuration
CONFIG_FILE=".confidential-token-config"
cat > "$CONFIG_FILE" << EOF
# Confidential Token Configuration
# Generated: $(date)

INCO_TOKEN_PROGRAM_ID=$PROGRAM_ID
NETWORK=devnet

# Next steps:
# 1. Run test script to initialize USDBagel mint
# 2. Update NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID in app/.env.local
# 3. Configure mint in Bagel program via configure_confidential_mint instruction
EOF

echo -e "${GREEN}✅ Configuration saved to $CONFIG_FILE${NC}\n"

# Summary
echo -e "${GREEN}🎉 Setup Complete!${NC}\n"
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "   1. Initialize USDBagel mint using the program ID: ${GREEN}$PROGRAM_ID${NC}"
echo -e "   2. Set NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID=$PROGRAM_ID in app/.env.local"
echo -e "   3. Deploy/upgrade Bagel program with confidential token support"
echo -e "   4. Call configure_confidential_mint on Bagel program"
echo -e "   5. Test confidential token transfers\n"
echo -e "${BLUE}🔗 Explorer:${NC}"
echo -e "   https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet\n"
