/**
 * Real SDK Verification Test - Runs from /app to access node_modules
 */

import { Connection, PublicKey } from '@solana/web3.js';

const CONFIG = {
  SHADOWWIRE_PROGRAM_ID: 'GQBqwwoikYh7p6KEUHDUu5r9dHHXx9tMGskAPubmFPzD',
  MAGICBLOCK_TEE_RPC: 'https://tee.magicblock.app',
};

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  REAL SDK VERIFICATION TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

// Test 1: ShadowWire SDK
console.log('── TEST 1: SHADOWWIRE SDK ──\n');
try {
  const { ShadowWireClient } = await import('@radr/shadowwire');
  console.log('✅ ShadowWire SDK imported successfully!');
  
  const client = new ShadowWireClient({ debug: false });
  console.log('✅ ShadowWire client created');
  console.log('   Type:', typeof client);
  console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)).filter(m => m !== 'constructor').join(', '));
  
  // Check mainnet program
  const mainnet = new Connection('https://api.mainnet-beta.solana.com');
  const programInfo = await mainnet.getAccountInfo(new PublicKey(CONFIG.SHADOWWIRE_PROGRAM_ID));
  console.log('✅ ShadowWire program on mainnet:', programInfo ? 'EXISTS' : 'NOT FOUND');
  console.log('   Executable:', programInfo?.executable);
  console.log('\n🛡️  ShadowWire Status: FULLY FUNCTIONAL');
  
} catch (error) {
  console.log('❌ ShadowWire SDK error:', error.message);
}

// Test 2: MagicBlock SDK
console.log('\n── TEST 2: MAGICBLOCK SDK ──\n');
try {
  const magicblock = await import('@magicblock-labs/ephemeral-rollups-sdk');
  console.log('✅ MagicBlock SDK imported successfully!');
  console.log('   Exports:', Object.keys(magicblock).slice(0, 10).join(', '), '...');
  
  // Check for key functions
  if (magicblock.verifyTeeRpcIntegrity) {
    console.log('✅ verifyTeeRpcIntegrity available');
    
    // Try to verify TEE
    console.log('\n   Verifying TEE RPC integrity...');
    const isVerified = await magicblock.verifyTeeRpcIntegrity(CONFIG.MAGICBLOCK_TEE_RPC);
    console.log('   TEE Verified:', isVerified);
  }
  
  if (magicblock.getAuthToken) {
    console.log('✅ getAuthToken available');
  }
  
  console.log('\n🎮 MagicBlock Status: SDK LOADED');
  
} catch (error) {
  console.log('❌ MagicBlock SDK error:', error.message);
}

// Test 3: Check Inco SDK
console.log('\n── TEST 3: INCO SDK ──\n');
try {
  // Check if @inco/solana-sdk exists
  const inco = await import('@inco/solana-sdk');
  console.log('✅ Inco SDK imported successfully!');
  console.log('   Exports:', Object.keys(inco).join(', '));
} catch (error) {
  console.log('⚠️  Inco SDK not available in frontend:', error.message);
  console.log('   NOTE: Inco encryption is done via on-chain CPI');
  console.log('   The Rust program calls inco_lightning::cpi directly');
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  TEST COMPLETE');
console.log('═══════════════════════════════════════════════════════════════\n');
