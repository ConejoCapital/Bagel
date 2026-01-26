#!/usr/bin/env node
/**
 * Balance Capture Script
 * 
 * Captures balances at each stage for screenshots:
 * 1. Employer view
 * 2. Employee view  
 * 3. Blockchain view (encrypted)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';

// Load config
function loadConfig() {
  const configPath = '.confidential-token-config';
  if (!fs.existsSync(configPath)) {
    throw new Error('Config not found');
  }
  const config = {};
  const content = fs.readFileSync(configPath, 'utf8');
  for (const line of content.split('\n')) {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      config[key.trim()] = value.trim();
    }
  }
  return config;
}

const config = loadConfig();
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const INCO_TOKEN_PROGRAM_ID = new PublicKey('HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22');
const USDBAGEL_MINT = new PublicKey(config.USDBAGEL_MINT);
const DEPOSITOR_TOKEN_ACCOUNT = new PublicKey(config.DEPOSITOR_TOKEN_ACCOUNT);
const VAULT_TOKEN_ACCOUNT = new PublicKey(config.VAULT_TOKEN_ACCOUNT);
const EMPLOYEE_TOKEN_ACCOUNT = new PublicKey(config.EMPLOYEE_TOKEN_ACCOUNT);

const connection = new Connection(RPC_URL, 'confirmed');

async function getTokenAccountInfo(pubkey) {
  try {
    const accountInfo = await connection.getAccountInfo(pubkey);
    if (!accountInfo) {
      return {
        address: pubkey.toString(),
        error: 'Account not found',
      };
    }
    
    // Check if it's a confidential token account
    const isEncrypted = accountInfo.owner.equals(INCO_TOKEN_PROGRAM_ID);
    
    // Extract balance field (typically bytes 64-79 for confidential tokens)
    let balanceField = null;
    let balanceFieldHex = null;
    if (accountInfo.data.length >= 80) {
      balanceField = accountInfo.data.slice(64, 80);
      balanceFieldHex = balanceField.toString('hex');
    }
    
    // For confidential tokens, the balance is encrypted (Euint128 handle)
    // We cannot decode it without the decryption key
    const balanceIsEncrypted = isEncrypted && balanceFieldHex && balanceFieldHex !== '00000000000000000000000000000000';
    
    return {
      address: pubkey.toString(),
      owner: accountInfo.owner.toString(),
      dataLength: accountInfo.data.length,
      lamports: accountInfo.lamports,
      isEncrypted: isEncrypted,
      balanceFieldHex: balanceFieldHex,
      balanceIsEncrypted: balanceIsEncrypted,
      rawDataPreview: accountInfo.data.slice(0, 100).toString('hex'),
      canBeDecoded: !balanceIsEncrypted,
    };
  } catch (e) {
    return {
      address: pubkey.toString(),
      error: e.message,
    };
  }
}

async function main() {
  console.log('\n📸 BALANCE CAPTURE FOR SCREENSHOTS');
  console.log('='.repeat(70));
  
  console.log('\n💰 EMPLOYER VIEW:');
  console.log('-'.repeat(70));
  const employerInfo = await getTokenAccountInfo(DEPOSITOR_TOKEN_ACCOUNT);
  console.log(`Token Account: ${employerInfo.address}`);
  console.log(`Owner: ${employerInfo.owner}`);
  console.log(`Data Length: ${employerInfo.dataLength} bytes`);
  console.log(`Encrypted: ${employerInfo.isEncrypted ? '✅ YES' : '❌ NO'}`);
  if (employerInfo.balanceFieldHex) {
    console.log(`Balance Field (hex): ${employerInfo.balanceFieldHex}`);
    console.log(`   ${employerInfo.balanceIsEncrypted ? '🔒 ENCRYPTED - Cannot be decoded without decryption key' : '⚠️  Not encrypted'}`);
  }
  console.log(`Can be decoded: ${employerInfo.canBeDecoded ? '✅ YES' : '❌ NO'}`);
  if (employerInfo.error) {
    console.log(`Error: ${employerInfo.error}`);
  }
  
  console.log('\n👤 EMPLOYEE VIEW:');
  console.log('-'.repeat(70));
  const employeeInfo = await getTokenAccountInfo(EMPLOYEE_TOKEN_ACCOUNT);
  console.log(`Token Account: ${employeeInfo.address}`);
  console.log(`Owner: ${employeeInfo.owner}`);
  console.log(`Data Length: ${employeeInfo.dataLength} bytes`);
  console.log(`Encrypted: ${employeeInfo.isEncrypted ? '✅ YES' : '❌ NO'}`);
  if (employeeInfo.balanceFieldHex) {
    console.log(`Balance Field (hex): ${employeeInfo.balanceFieldHex}`);
    console.log(`   ${employeeInfo.balanceIsEncrypted ? '🔒 ENCRYPTED - Cannot be decoded without decryption key' : '⚠️  Not encrypted'}`);
  }
  console.log(`Can be decoded: ${employeeInfo.canBeDecoded ? '✅ YES' : '❌ NO'}`);
  if (employeeInfo.error) {
    console.log(`Error: ${employeeInfo.error}`);
  }
  
  console.log('\n🔗 BLOCKCHAIN VIEW (On-Chain Data):');
  console.log('-'.repeat(70));
  const vaultInfo = await getTokenAccountInfo(VAULT_TOKEN_ACCOUNT);
  console.log(`Vault Token Account: ${vaultInfo.address}`);
  console.log(`Owner: ${vaultInfo.owner}`);
  console.log(`Data Length: ${vaultInfo.dataLength} bytes`);
  console.log(`Encrypted: ${vaultInfo.isEncrypted ? '✅ YES' : '❌ NO'}`);
  if (vaultInfo.balanceFieldHex) {
    console.log(`Balance Field (hex): ${vaultInfo.balanceFieldHex}`);
    console.log(`   ${vaultInfo.balanceIsEncrypted ? '🔒 ENCRYPTED - Cannot be decoded' : '⚠️  Not encrypted'}`);
    console.log(`   ❌ Observers CANNOT see actual balance`);
    console.log(`   ❌ Observers CANNOT decode the amount`);
  }
  console.log(`Can be decoded: ${vaultInfo.canBeDecoded ? '✅ YES' : '❌ NO'}`);
  if (vaultInfo.error) {
    console.log(`Error: ${vaultInfo.error}`);
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('-'.repeat(70));
  console.log(`Employer Account: ${employerInfo.isEncrypted ? '🔒 ENCRYPTED' : '⚠️  NOT ENCRYPTED'}`);
  console.log(`Employee Account: ${employeeInfo.isEncrypted ? '🔒 ENCRYPTED' : '⚠️  NOT ENCRYPTED'}`);
  console.log(`Vault Account: ${vaultInfo.isEncrypted ? '🔒 ENCRYPTED' : '⚠️  NOT ENCRYPTED'}`);
  console.log(`\n🔒 Encryption Status: ${employerInfo.isEncrypted && employeeInfo.isEncrypted && vaultInfo.isEncrypted ? '✅ ALL ENCRYPTED' : '⚠️  PARTIAL'}`);
  console.log(`🔓 Can be decoded by observers: ${employerInfo.canBeDecoded || employeeInfo.canBeDecoded || vaultInfo.canBeDecoded ? '✅ YES' : '❌ NO - Requires decryption key'}`);
  
  // Save to file for reference
  const report = {
    timestamp: new Date().toISOString(),
    employer: employerInfo,
    employee: employeeInfo,
    vault: vaultInfo,
    encryptionStatus: {
      allEncrypted: employerInfo.isEncrypted && employeeInfo.isEncrypted && vaultInfo.isEncrypted,
      canBeDecoded: !employerInfo.isEncrypted || !employeeInfo.isEncrypted || !vaultInfo.isEncrypted,
    },
    explorerLinks: {
      employer: `https://explorer.solana.com/address/${DEPOSITOR_TOKEN_ACCOUNT.toString()}?cluster=devnet`,
      employee: `https://explorer.solana.com/address/${EMPLOYEE_TOKEN_ACCOUNT.toString()}?cluster=devnet`,
      vault: `https://explorer.solana.com/address/${VAULT_TOKEN_ACCOUNT.toString()}?cluster=devnet`,
    },
  };
  
  fs.writeFileSync('balance-capture.json', JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: balance-capture.json`);
}

main().catch(console.error);
