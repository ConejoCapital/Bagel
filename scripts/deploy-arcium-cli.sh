#!/bin/bash
#
# 🔮 Deploy Bagel Payroll MPC Circuit via Arcium CLI
#
# This script deploys the payroll.arcis circuit using Arcium CLI
# (Dashboard-independent deployment for Solana Privacy Hack 2026)
#
# **TARGET:** Arcium $10,000 DeFi Bounty
#
# Usage:
#   ./scripts/deploy-arcium-cli.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CIRCUIT_FILE="programs/bagel/circuits/payroll.arcis"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLUSTER_OFFSET="1078779259"  # Solana Privacy Hack 2026 devnet offset

echo -e "${BLUE}🔮 Bagel MPC Circuit Deployment (CLI)${NC}"
echo -e "${BLUE}=====================================${NC}\n"

# Check if circuit file exists
if [ ! -f "$PROJECT_ROOT/$CIRCUIT_FILE" ]; then
    echo -e "${RED}❌ Error: Circuit file not found: $CIRCUIT_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Circuit file found${NC}"
echo -e "   File: $CIRCUIT_FILE\n"

# Check if Arcium CLI is installed
if ! command -v arcium &> /dev/null; then
    echo -e "${RED}❌ Arcium CLI not found${NC}"
    echo -e "${YELLOW}📦 Installation Instructions:${NC}"
    echo -e "   1. Install Docker Desktop: https://docs.docker.com/desktop/install/mac-install/"
    echo -e "   2. Run: curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash"
    echo -e "   3. Run: arcup install"
    echo -e "   4. Restart terminal and try again\n"
    exit 1
fi

echo -e "${GREEN}✅ Arcium CLI found${NC}"
arcium --version
echo ""

# Show circuit info
echo -e "${BLUE}📋 Circuit Information${NC}"
echo -e "   Name: Bagel Payroll Calculator"
echo -e "   Version: 1.0.0"
echo -e "   Cluster Offset: $CLUSTER_OFFSET (Devnet)"
echo -e "   File: $CIRCUIT_FILE\n"

# Change to project root
cd "$PROJECT_ROOT"

# Step 1: Build the circuit
echo -e "${BLUE}🔨 Step 1: Building circuit...${NC}"
if arcium build; then
    echo -e "${GREEN}✅ Circuit built successfully${NC}"
    
    # Check if build artifacts exist
    if [ -f "build/payroll.hash" ]; then
        echo -e "${GREEN}✅ Build artifacts created${NC}"
        echo -e "   Hash file: build/payroll.hash"
    fi
    echo ""
else
    echo -e "${RED}❌ Circuit build failed${NC}"
    echo -e "${YELLOW}💡 Troubleshooting:${NC}"
    echo -e "   - Ensure you're in the project root"
    echo -e "   - Check circuit syntax in $CIRCUIT_FILE"
    echo -e "   - Verify Arcium CLI version: arcium --version"
    exit 1
fi

# Step 2: Initialize computation (get Circuit ID)
echo -e "${BLUE}🚀 Step 2: Initializing computation on devnet...${NC}"
echo -e "   Cluster Offset: $CLUSTER_OFFSET\n"

# Try init-computation first (newer versions)
if arcium init-computation --path "$CIRCUIT_FILE" --cluster-offset "$CLUSTER_OFFSET" 2>/dev/null; then
    echo -e "${GREEN}✅ Computation initialized!${NC}\n"
elif arcium deploy --skip-program --path "$CIRCUIT_FILE" --cluster-offset "$CLUSTER_OFFSET" 2>/dev/null; then
    echo -e "${GREEN}✅ Computation deployed!${NC}\n"
else
    # Fallback: try without --path flag
    if arcium deploy --skip-program --cluster-offset "$CLUSTER_OFFSET"; then
        echo -e "${GREEN}✅ Computation deployed!${NC}\n"
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        echo -e "${YELLOW}💡 Troubleshooting:${NC}"
        echo -e "   - Check cluster offset is correct: $CLUSTER_OFFSET"
        echo -e "   - Verify you have SOL for deployment fees"
        echo -e "   - Ask in #arcium Discord for current offset"
        echo -e "   - Try: arcium deploy --help\n"
        exit 1
    fi
fi

# Parse output for Circuit ID
echo -e "${BLUE}📝 Looking for Circuit ID in output...${NC}"
echo -e "${YELLOW}⚠️  Check the output above for:${NC}"
echo -e "   - 'Computation Definition Offset'"
echo -e "   - 'Circuit ID'"
echo -e "   - Any hexadecimal identifier\n"

echo -e "${GREEN}🎉 Deployment Complete!${NC}\n"

# Instructions for next steps
echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo -e "${YELLOW}1. Find your Circuit ID in the output above${NC}"
echo -e "   Look for: 'Computation Definition Offset' or 'Circuit ID'"
echo -e ""
echo -e "${YELLOW}2. Update your files:${NC}"
echo -e "   Run this command with your Circuit ID:"
echo -e "   ${GREEN}./scripts/update-circuit-id.sh <YOUR_CIRCUIT_ID>${NC}"
echo -e ""
echo -e "${YELLOW}3. Verify deployment:${NC}"
echo -e "   Visit: ${BLUE}https://arcium.com/testnet${NC}"
echo -e "   Search for your wallet address to see transaction"
echo -e ""
echo -e "${YELLOW}4. Rebuild Solana program:${NC}"
echo -e "   ${GREEN}anchor build${NC}"
echo -e "   ${GREEN}anchor deploy --provider.cluster devnet${NC}"
echo -e ""
echo -e "${YELLOW}5. Run tests:${NC}"
echo -e "   ${GREEN}anchor test --skip-local-validator${NC}"
echo -e "\n"

# Save deployment info
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_LOG="deployment_${TIMESTAMP}.log"

echo -e "${BLUE}💾 Saving deployment info to: $DEPLOY_LOG${NC}\n"
cat > "$DEPLOY_LOG" << EOF
Bagel Arcium Circuit Deployment
================================

Timestamp: $(date)
Circuit File: $CIRCUIT_FILE
Cluster Offset: $CLUSTER_OFFSET
Arcium CLI Version: $(arcium --version 2>&1)

Next Steps:
1. Find Circuit ID in terminal output above
2. Run: ./scripts/update-circuit-id.sh <circuit_id>
3. Rebuild: anchor build && anchor deploy
4. Test: anchor test --skip-local-validator

Verification:
- Testnet Explorer: https://arcium.com/testnet
- Documentation: https://docs.arcium.com/developers/deployment

Support:
- Discord: #arcium channel in Encode Club
- Issue: Cluster offset might change during devnet resets
EOF

echo -e "${GREEN}✅ Deployment log saved${NC}\n"

# Final reminders
echo -e "${BLUE}🔗 Helpful Resources:${NC}"
echo -e "   Testnet Explorer: ${BLUE}https://arcium.com/testnet${NC}"
echo -e "   Documentation: ${BLUE}https://docs.arcium.com/developers/deployment${NC}"
echo -e "   Support Discord: ${BLUE}#arcium on Encode Club${NC}\n"

echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo -e "   - Cluster offset ($CLUSTER_OFFSET) may change during devnet resets"
echo -e "   - Check #arcium Discord if deployment fails"
echo -e "   - Verify deployment on testnet explorer\n"

echo -e "${GREEN}🥯 Ready to update Circuit ID and continue! ${NC}\n"

exit 0
