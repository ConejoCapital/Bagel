#!/bin/bash
# Deploy Arcium Circuit Script
# 
# This script builds and deploys the payroll.arcis circuit to Arcium Devnet.
# 
# Usage:
#   ./scripts/deploy-arcium-circuit.sh
# 
# Prerequisites:
#   - arcium CLI installed (via arcup)
#   - Circuit file: encrypted-ixs/circuits/payroll.arcis
#   - Arcium Devnet access

set -e

echo "🥯 Bagel: Deploying Arcium Circuit"
echo "=================================="
echo ""

# Check if arcium CLI is installed
if ! command -v arcium &> /dev/null; then
    echo "❌ Error: arcium CLI not found"
    echo "   Install with: arcup install"
    exit 1
fi

# Circuit file path
CIRCUIT_FILE="encrypted-ixs/circuits/payroll.arcis"

if [ ! -f "$CIRCUIT_FILE" ]; then
    echo "❌ Error: Circuit file not found: $CIRCUIT_FILE"
    exit 1
fi

echo "📋 Circuit file: $CIRCUIT_FILE"
echo ""

# Step 1: Build the circuit
echo "🔨 Step 1: Building circuit..."
arcium build "$CIRCUIT_FILE" || {
    echo "❌ Build failed!"
    exit 1
}

echo "✅ Circuit built successfully"
echo ""

# Step 2: Deploy to Arcium Devnet
echo "🚀 Step 2: Deploying to Arcium Devnet..."
echo "   Cluster Offset: 1078779259"
echo "   Priority Fee: 1000 micro-lamports"
echo ""

# Deploy with cluster offset and priority fee
DEPLOY_OUTPUT=$(arcium deploy \
    --cluster-offset 1078779259 \
    --priority-fee-micro-lamports 1000 \
    "$CIRCUIT_FILE" 2>&1) || {
    echo "❌ Deployment failed!"
    echo "$DEPLOY_OUTPUT"
    exit 1
}

echo "$DEPLOY_OUTPUT"
echo ""

# Extract Computation Offset from output
# The output format may vary, but typically includes "Computation Offset: ..."
COMPUTATION_OFFSET=$(echo "$DEPLOY_OUTPUT" | grep -i "computation offset" | awk '{print $NF}' | tr -d '\n')

if [ -z "$COMPUTATION_OFFSET" ]; then
    # Try alternative extraction patterns
    COMPUTATION_OFFSET=$(echo "$DEPLOY_OUTPUT" | grep -i "circuit id" | awk '{print $NF}' | tr -d '\n')
fi

if [ -z "$COMPUTATION_OFFSET" ]; then
    echo "⚠️  Warning: Could not extract Computation Offset from output"
    echo "   Please manually extract it from the output above"
    echo "   Then update NEXT_PUBLIC_ARCIUM_CIRCUIT_ID in .env.local"
    exit 0
fi

echo "✅ Deployment successful!"
echo ""
echo "📝 Computation Offset: $COMPUTATION_OFFSET"
echo ""

# Step 3: Update .env.local (if it exists)
ENV_FILE="app/.env.local"
if [ -f "$ENV_FILE" ]; then
    echo "📝 Step 3: Updating $ENV_FILE..."
    
    # Check if ARCIUM_CIRCUIT_ID already exists
    if grep -q "NEXT_PUBLIC_ARCIUM_CIRCUIT_ID" "$ENV_FILE"; then
        # Update existing value
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=.*|NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$COMPUTATION_OFFSET|" "$ENV_FILE"
        else
            # Linux
            sed -i "s|NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=.*|NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$COMPUTATION_OFFSET|" "$ENV_FILE"
        fi
    else
        # Add new line
        echo "" >> "$ENV_FILE"
        echo "# Arcium Circuit ID (from deployment)" >> "$ENV_FILE"
        echo "NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$COMPUTATION_OFFSET" >> "$ENV_FILE"
    fi
    
    echo "✅ Updated $ENV_FILE"
else
    echo "⚠️  $ENV_FILE not found - creating it..."
    mkdir -p app
    cat > "$ENV_FILE" << EOF
# Arcium Circuit ID (from deployment)
NEXT_PUBLIC_ARCIUM_CIRCUIT_ID=$COMPUTATION_OFFSET
EOF
    echo "✅ Created $ENV_FILE"
fi

echo ""
echo "🎉 Circuit deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify NEXT_PUBLIC_ARCIUM_CIRCUIT_ID in app/.env.local"
echo "   2. Update programs/bagel/src/privacy/arcium.rs with Circuit ID"
echo "   3. Rebuild and redeploy the program"
echo "   4. Test MPC computation flow"
echo ""
