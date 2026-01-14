#!/bin/bash
#
# 🔮 Deploy Bagel Payroll MPC Circuit to Arcium
#
# This script deploys the payroll.arcis circuit to Arcium's devnet
# for privacy-preserving salary calculations.
#
# **TARGET:** Arcium $10,000 DeFi Bounty
#
# Usage:
#   ./scripts/deploy-arcium-circuit.sh [network]
#
# Arguments:
#   network - 'devnet' (default) or 'mainnet'

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="${1:-devnet}"
CIRCUIT_FILE="programs/bagel/circuits/payroll.arcis"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}🔮 Bagel MPC Circuit Deployment${NC}"
echo -e "${BLUE}================================${NC}\n"

# Check if circuit file exists
if [ ! -f "$PROJECT_ROOT/$CIRCUIT_FILE" ]; then
    echo -e "${RED}❌ Error: Circuit file not found: $CIRCUIT_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Circuit file found${NC}"
echo -e "   File: $CIRCUIT_FILE\n"

# Check if Arcium CLI is installed
if ! command -v arcium &> /dev/null; then
    echo -e "${YELLOW}⚠️  Arcium CLI not found${NC}"
    echo -e "${BLUE}ℹ️  Installation required for circuit deployment${NC}"
    echo -e "\n${YELLOW}To install Arcium CLI:${NC}"
    echo -e "   1. Install Docker Desktop"
    echo -e "   2. Run: curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash"
    echo -e "   3. Run: arcup install"
    echo -e "\n${YELLOW}Alternative: Manual deployment via Arcium dashboard${NC}"
    echo -e "   1. Visit: https://dashboard.arcium.com"
    echo -e "   2. Upload: $CIRCUIT_FILE"
    echo -e "   3. Network: $NETWORK"
    echo -e "   4. Copy circuit ID to .env"
    exit 1
fi

echo -e "${GREEN}✅ Arcium CLI found${NC}\n"

# Show circuit info
echo -e "${BLUE}📋 Circuit Information${NC}"
echo -e "   Name: Bagel Payroll Calculator"
echo -e "   Version: 1.0.0"
echo -e "   Network: $NETWORK"
echo -e "   File: $CIRCUIT_FILE\n"

# Build the circuit
echo -e "${BLUE}🔨 Building circuit...${NC}"
cd "$PROJECT_ROOT"

if arcium build "$CIRCUIT_FILE"; then
    echo -e "${GREEN}✅ Circuit built successfully${NC}\n"
else
    echo -e "${RED}❌ Circuit build failed${NC}"
    echo -e "${YELLOW}💡 Tip: Check circuit syntax in $CIRCUIT_FILE${NC}"
    exit 1
fi

# Deploy the circuit
echo -e "${BLUE}🚀 Deploying circuit to $NETWORK...${NC}"

if arcium deploy --cluster-offset "$NETWORK" "$CIRCUIT_FILE"; then
    echo -e "${GREEN}✅ Circuit deployed successfully!${NC}\n"
else
    echo -e "${RED}❌ Circuit deployment failed${NC}"
    echo -e "${YELLOW}💡 Tip: Ensure you have enough SOL for deployment${NC}"
    exit 1
fi

# Get the circuit ID
CIRCUIT_ID=$(arcium list-circuits --network "$NETWORK" | grep "payroll_calculation" | awk '{print $1}')

if [ -z "$CIRCUIT_ID" ]; then
    echo -e "${YELLOW}⚠️  Could not automatically retrieve circuit ID${NC}"
    echo -e "${BLUE}ℹ️  Manually check with: arcium list-circuits --network $NETWORK${NC}\n"
else
    echo -e "${GREEN}🎉 Circuit deployed!${NC}"
    echo -e "${BLUE}Circuit ID: $CIRCUIT_ID${NC}\n"
    
    # Update environment variable
    echo -e "${BLUE}📝 Updating environment variables...${NC}"
    
    ENV_FILE="$PROJECT_ROOT/app/.env.local"
    
    if [ -f "$ENV_FILE" ]; then
        # Update existing file
        if grep -q "NEXT_PUBLIC_ARCIUM_CIRCUIT_ID" "$ENV_FILE"; then
            sed -i.bak "s/NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=.*/NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$CIRCUIT_ID/" "$ENV_FILE"
            echo -e "${GREEN}✅ Updated $ENV_FILE${NC}"
        else
            echo "NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$CIRCUIT_ID" >> "$ENV_FILE"
            echo -e "${GREEN}✅ Added circuit ID to $ENV_FILE${NC}"
        fi
    else
        # Create new file
        cat > "$ENV_FILE" << EOF
# Bagel Environment Variables

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af
NEXT_PUBLIC_BAGEL_PROGRAM_ID=8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU

# Arcium
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$CIRCUIT_ID
NEXT_PUBLIC_ARCIUM_MPC_PROGRAM_ID=<get_from_arcium_docs>

# Helius
NEXT_PUBLIC_HELIUS_API_KEY=06227422-9d57-42de-a7b3-92f1491c58af
EOF
        echo -e "${GREEN}✅ Created $ENV_FILE${NC}"
    fi
fi

# Next steps
echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo -e "   1. ${GREEN}✅${NC} Circuit deployed to $NETWORK"
echo -e "   2. Update Solana program with circuit ID"
echo -e "   3. Redeploy Solana program to devnet"
echo -e "   4. Test end-to-end payroll flow"
echo -e "   5. Submit for Arcium \$10k DeFi bounty! 🎯\n"

echo -e "${BLUE}📚 Resources:${NC}"
echo -e "   Circuit file: $CIRCUIT_FILE"
echo -e "   Arcium docs: https://docs.arcium.com"
echo -e "   Dashboard: https://dashboard.arcium.com\n"

echo -e "${GREEN}🥯 Bagel MPC deployment complete! ${NC}\n"

# Optional: Update Rust program
echo -e "${YELLOW}💡 Tip: Update programs/bagel/src/privacy/arcium.rs${NC}"
echo -e "   Change: circuit_id: [0u8; 32]"
echo -e "   To: circuit_id: decode_base58(\"$CIRCUIT_ID\")\n"

exit 0
