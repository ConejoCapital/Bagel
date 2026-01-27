#!/bin/bash
# 🚀 Deploy Bagel to Solana Mainnet
#
# This script builds and deploys the Bagel program to Solana Mainnet
# with confidential token support.
#
# Prerequisites:
#   - Mainnet SOL in wallet (~1-2 SOL recommended)
#   - Anchor CLI installed
#   - Solana CLI configured for mainnet
#
# Usage:
#   ./scripts/deploy-mainnet.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Bagel: Mainnet Deployment${NC}"
echo -e "${BLUE}=============================${NC}\n"

# Check if we're on mainnet
echo -e "${BLUE}📋 Step 1: Verifying Mainnet Configuration${NC}"
CURRENT_CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')

if [[ "$CURRENT_CLUSTER" != *"mainnet"* ]]; then
    echo -e "${YELLOW}⚠️  Warning: Solana CLI not configured for mainnet${NC}"
    echo -e "${YELLOW}   Current RPC: $CURRENT_CLUSTER${NC}"
    echo -e "${YELLOW}   Run: solana config set --url https://api.mainnet-beta.solana.com${NC}"
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

if (( $(echo "$BALANCE_SOL < 1.0" | bc -l) )); then
    echo -e "${RED}❌ Insufficient SOL for deployment${NC}"
    echo -e "${YELLOW}   Recommended: 1-2 SOL${NC}"
    echo -e "${YELLOW}   Current: $BALANCE_SOL SOL${NC}"
    echo -e "${YELLOW}   Get SOL: https://solana.com/developers/guides/getstarted/transfer-sol${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Sufficient SOL for deployment${NC}\n"

# Build program
echo -e "${BLUE}🔨 Step 3: Building Program${NC}"
if anchor build; then
    echo -e "${GREEN}✅ Build successful${NC}\n"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Verify program ID
echo -e "${BLUE}📝 Step 4: Verifying Program ID${NC}"
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

# Deploy
echo -e "${BLUE}🚀 Step 5: Deploying to Mainnet${NC}"
if [ "$DEPLOY_MODE" == "upgrade" ]; then
    echo -e "${YELLOW}   Mode: Upgrade existing program${NC}"
    if anchor deploy --provider.cluster mainnet; then
        echo -e "${GREEN}✅ Program upgraded successfully${NC}\n"
    else
        echo -e "${RED}❌ Upgrade failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}   Mode: New deployment${NC}"
    if anchor deploy --provider.cluster mainnet; then
        echo -e "${GREEN}✅ Program deployed successfully${NC}\n"
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    fi
fi

# Verify deployment
echo -e "${BLUE}✅ Step 6: Verifying Deployment${NC}"
if solana program show "$PROGRAM_ID" &>/dev/null; then
    PROGRAM_INFO=$(solana program show "$PROGRAM_ID")
    echo -e "${GREEN}✅ Program verified on mainnet${NC}"
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
echo -e "   1. Deploy Inco Confidential Token Program to mainnet"
echo -e "   2. Initialize confidential token mint"
echo -e "   3. Configure Bagel program with confidential mint"
echo -e "   4. Update NEXT_PUBLIC_SOLANA_NETWORK=mainnet in app/.env.local"
echo -e "   5. Test with small amounts first"
echo -e "   6. Monitor transactions closely\n"
echo -e "${BLUE}🔗 Explorer:${NC}"
echo -e "   https://orbmarkets.io/address/$PROGRAM_ID?cluster=mainnet\n"
