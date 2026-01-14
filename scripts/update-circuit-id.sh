#!/bin/bash
#
# 🔮 Update Circuit ID Across All Files
#
# This script updates the Arcium circuit ID in all necessary files
# after manual or CLI deployment.
#
# Usage:
#   ./scripts/update-circuit-id.sh <circuit_id>

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

CIRCUIT_ID=$1

if [ -z "$CIRCUIT_ID" ]; then
    echo -e "${RED}❌ Error: Circuit ID required${NC}"
    echo -e "${YELLOW}Usage: ./scripts/update-circuit-id.sh <circuit_id>${NC}"
    echo -e "${BLUE}Example: ./scripts/update-circuit-id.sh ABC123XYZ...${NC}"
    exit 1
fi

echo -e "${BLUE}🔮 Updating Circuit ID: $CIRCUIT_ID${NC}\n"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. Update .env.local
echo -e "${BLUE}📝 Updating app/.env.local...${NC}"
ENV_FILE="app/.env.local"

if [ -f "$ENV_FILE" ]; then
    if grep -q "NEXT_PUBLIC_ARCIUM_CIRCUIT_ID" "$ENV_FILE"; then
        # Update existing line
        sed -i.bak "s/NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=.*/NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$CIRCUIT_ID/" "$ENV_FILE"
        rm -f "$ENV_FILE.bak"
        echo -e "${GREEN}✅ Updated existing CIRCUIT_ID in .env.local${NC}"
    else
        # Add new line
        echo "NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$CIRCUIT_ID" >> "$ENV_FILE"
        echo -e "${GREEN}✅ Added CIRCUIT_ID to .env.local${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.local not found, creating...${NC}"
    cat > "$ENV_FILE" << EOF
# Bagel Environment Variables
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af
NEXT_PUBLIC_BAGEL_PROGRAM_ID=8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$CIRCUIT_ID
NEXT_PUBLIC_HELIUS_API_KEY=06227422-9d57-42de-a7b3-92f1491c58af
EOF
    echo -e "${GREEN}✅ Created .env.local with CIRCUIT_ID${NC}"
fi

echo ""

# 2. Note: arcium.ts update would require TypeScript editing
echo -e "${YELLOW}⚠️  Manual update needed:${NC}"
echo -e "${BLUE}File: app/lib/arcium.ts${NC}"
echo -e "   Update the constructor to read from env:"
echo -e "   ${GREEN}this.circuitId = process.env.NEXT_PUBLIC_ARCIUM_CIRCUIT_ID || '';${NC}"
echo ""

# 3. Note: arcium.rs update would require Rust editing
echo -e "${YELLOW}⚠️  Manual update needed:${NC}"
echo -e "${BLUE}File: programs/bagel/src/privacy/arcium.rs${NC}"
echo -e "   Update the circuit_id in payroll_circuit():"
echo -e "   ${GREEN}let circuit_id_str = \"$CIRCUIT_ID\";${NC}"
echo ""

# Summary
echo -e "${GREEN}🎉 Circuit ID Update Summary${NC}\n"
echo -e "Circuit ID: ${YELLOW}$CIRCUIT_ID${NC}"
echo -e ""
echo -e "${GREEN}✅ Completed:${NC}"
echo -e "   - app/.env.local updated"
echo -e ""
echo -e "${YELLOW}⏳ Manual Updates Needed:${NC}"
echo -e "   - app/lib/arcium.ts (read from env)"
echo -e "   - programs/bagel/src/privacy/arcium.rs (hardcode or read)"
echo -e ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "   1. Update arcium.ts manually (or tell Cursor)"
echo -e "   2. Update arcium.rs manually (or tell Cursor)"
echo -e "   3. Run: ${GREEN}anchor build${NC}"
echo -e "   4. Run: ${GREEN}anchor deploy --provider.cluster devnet${NC}"
echo -e "   5. Run: ${GREEN}anchor test --skip-local-validator${NC}"
echo -e ""
echo -e "${GREEN}🥯 Circuit ID updated successfully! ${NC}\n"

exit 0
