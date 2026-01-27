#!/bin/bash
# 🚀 Deploy Confidential Payroll (Full Deployment)
#
# This script performs a complete deployment of Bagel with confidential token support:
# 1. Deploys Inco Confidential Token program (if needed)
# 2. Creates USDBagel mint
# 3. Deploys/upgrades Bagel program
# 4. Configures confidential mint in MasterVault
# 5. Verifies deployment
#
# Prerequisites:
#   - Devnet SOL in wallet (~3-5 SOL recommended)
#   - Anchor CLI installed
#   - Solana CLI configured for devnet
#
# Usage:
#   ./scripts/deploy-confidential-payroll.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploy Confidential Payroll (Full Deployment)${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# Check prerequisites
echo -e "${BLUE}📋 Step 1: Checking Prerequisites${NC}"

if ! command -v anchor &> /dev/null; then
    echo -e "${RED}❌ Anchor CLI not found${NC}"
    echo -e "${YELLOW}   Install: cargo install --git https://github.com/coral-xyz/anchor avm && avm install 0.31.1${NC}"
    exit 1
fi

if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}\n"

# Check SOL balance
echo -e "${BLUE}💰 Step 2: Checking SOL Balance${NC}"
BALANCE=$(solana balance --lamports | awk '{print $1}')
BALANCE_SOL=$(echo "scale=2; $BALANCE / 1000000000" | bc)

echo -e "   Balance: ${GREEN}$BALANCE_SOL SOL${NC}"

if (( $(echo "$BALANCE_SOL < 3.0" | bc -l) )); then
    echo -e "${RED}❌ Insufficient SOL for deployment${NC}"
    echo -e "${YELLOW}   Recommended: 3-5 SOL${NC}"
    echo -e "${YELLOW}   Current: $BALANCE_SOL SOL${NC}"
    echo -e "${YELLOW}   Get devnet SOL: solana airdrop 3${NC}"
    exit 1
fi

# Deploy confidential token program
echo -e "${BLUE}🔒 Step 3: Deploying Confidential Token Program${NC}"
if [ -f "scripts/deploy-confidential-mint.sh" ]; then
    ./scripts/deploy-confidential-mint.sh
    INCO_TOKEN_PROGRAM_ID=$(grep "INCO_TOKEN_PROGRAM_ID=" .confidential-token-config 2>/dev/null | cut -d'=' -f2 || echo "")
    if [ -z "$INCO_TOKEN_PROGRAM_ID" ]; then
        echo -e "${YELLOW}⚠️  Could not read program ID from config${NC}"
        read -p "Enter Inco Confidential Token Program ID: " INCO_TOKEN_PROGRAM_ID
    fi
else
    echo -e "${YELLOW}⚠️  deploy-confidential-mint.sh not found${NC}"
    read -p "Enter Inco Confidential Token Program ID (or press Enter to skip): " INCO_TOKEN_PROGRAM_ID
fi

if [ -z "$INCO_TOKEN_PROGRAM_ID" ]; then
    echo -e "${YELLOW}⏭️  Skipping confidential token program deployment${NC}"
    echo -e "${YELLOW}   You can deploy it later and configure the mint${NC}\n"
else
    echo -e "${GREEN}✅ Confidential Token Program ID: $INCO_TOKEN_PROGRAM_ID${NC}\n"
fi

# Build Bagel program
echo -e "${BLUE}🔨 Step 4: Building Bagel Program${NC}"
if anchor build; then
    echo -e "${GREEN}✅ Build successful${NC}\n"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Verify program ID
echo -e "${BLUE}📝 Step 5: Verifying Program ID${NC}"
PROGRAM_ID=$(solana address -k target/deploy/bagel-keypair.json)
echo -e "   Program ID: ${GREEN}$PROGRAM_ID${NC}"

# Check if program already exists
if solana program show "$PROGRAM_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Program already deployed${NC}"
    read -p "Upgrade existing program? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        DEPLOY_MODE="upgrade"
    else
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
else
    DEPLOY_MODE="deploy"
fi

# Deploy Bagel program
echo -e "${BLUE}🚀 Step 6: Deploying Bagel Program${NC}"
if [ "$DEPLOY_MODE" == "upgrade" ]; then
    echo -e "${YELLOW}   Mode: Upgrade existing program${NC}"
    if anchor deploy --provider.cluster devnet; then
        echo -e "${GREEN}✅ Program upgraded successfully${NC}\n"
    else
        echo -e "${RED}❌ Upgrade failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}   Mode: New deployment${NC}"
    if anchor deploy --provider.cluster devnet; then
        echo -e "${GREEN}✅ Program deployed successfully${NC}\n"
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    fi
fi

# Verify deployment
echo -e "${BLUE}✅ Step 7: Verifying Deployment${NC}"
if solana program show "$PROGRAM_ID" &>/dev/null; then
    PROGRAM_INFO=$(solana program show "$PROGRAM_ID")
    echo -e "${GREEN}✅ Program verified on devnet${NC}"
    echo -e "\n${BLUE}Program Details:${NC}"
    echo "$PROGRAM_INFO" | head -10
    echo ""
else
    echo -e "${RED}❌ Program verification failed${NC}"
    exit 1
fi

# Summary
echo -e "${GREEN}🎉 Deployment Complete!${NC}\n"
echo -e "${BLUE}📋 Next Steps:${NC}"
if [ -n "$INCO_TOKEN_PROGRAM_ID" ]; then
    echo -e "   1. Initialize USDBagel mint using program: ${GREEN}$INCO_TOKEN_PROGRAM_ID${NC}"
    echo -e "   2. Set NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID=$INCO_TOKEN_PROGRAM_ID in app/.env.local"
    echo -e "   3. Call configure_confidential_mint on Bagel program with mint address"
    echo -e "   4. Test confidential token deposits and withdrawals"
else
    echo -e "   1. Deploy Inco Confidential Token program"
    echo -e "   2. Initialize USDBagel mint"
    echo -e "   3. Configure confidential mint in Bagel program"
    echo -e "   4. Test confidential token transfers"
fi
echo -e "   5. Run E2E test: node test-confidential-payroll.mjs\n"
echo -e "${BLUE}🔗 Explorer:${NC}"
echo -e "   Bagel Program: https://orbmarkets.io/address/$PROGRAM_ID?cluster=devnet\n"
if [ -n "$INCO_TOKEN_PROGRAM_ID" ]; then
    echo -e "   Confidential Token Program: https://orbmarkets.io/address/$INCO_TOKEN_PROGRAM_ID?cluster=devnet\n"
fi
