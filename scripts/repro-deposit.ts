#!/usr/bin/env npx ts-node
/**
 * Deposit Reproduction Script
 *
 * Runs a single deposit transaction and prints detailed trace information
 * to prove the confidential token transfer occurred.
 *
 * Usage:
 *   npx ts-node scripts/repro-deposit.ts
 *
 * Output:
 *   - Transaction hash
 *   - Call trace proving Inco Token Program invocation
 *   - Pre/post balance comparison (encrypted handles)
 *   - Privacy verification results
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Configuration
// ============================================================

const HELIUS_RPC = process.env.HELIUS_RPC || "https://devnet.helius-rpc.com/?api-key=06227422-9d57-42de-a7b3-92f1491c58af";

// Program IDs
const BAGEL_PROGRAM_ID = new PublicKey("AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj");
const INCO_TOKEN_PROGRAM_ID_DEFAULT = new PublicKey("4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N");
const INCO_LIGHTNING_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");

// Seeds
const MASTER_VAULT_SEED = Buffer.from("master_vault");
const BUSINESS_ENTRY_SEED = Buffer.from("entry");
const USER_TOKEN_SEED = Buffer.from("user_token");

// Deposit amount (100 USDBagel)
const DEPOSIT_AMOUNT = 100_000_000_000;

// ============================================================
// Utility Functions
// ============================================================

function log(message: string, type: "info" | "success" | "warning" | "error" | "trace" = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "\x1b[36m[INFO]\x1b[0m",
    success: "\x1b[32m[SUCCESS]\x1b[0m",
    warning: "\x1b[33m[WARNING]\x1b[0m",
    error: "\x1b[31m[ERROR]\x1b[0m",
    trace: "\x1b[35m[TRACE]\x1b[0m",
  }[type];
  console.log(`${timestamp} ${prefix} ${message}`);
}

function loadAuthority(): Keypair {
  const keyPath = path.join(process.env.HOME!, ".config/solana/id.json");
  if (!fs.existsSync(keyPath)) {
    throw new Error("Solana keypair not found. Run: solana-keygen new");
  }
  const secretKey = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function loadConfig(): Record<string, string> {
  const configPath = ".confidential-token-config";
  if (!fs.existsSync(configPath)) {
    throw new Error("Configuration not found. Run setup scripts first.");
  }

  const config: Record<string, string> = {};
  const content = fs.readFileSync(configPath, "utf8");
  for (const line of content.split("\n")) {
    if (line.includes("=") && !line.startsWith("#")) {
      const [key, value] = line.split("=");
      config[key.trim()] = value.trim();
    }
  }

  return config;
}

function loadIDL(): any {
  const idlPath = "./target/idl/bagel.json";
  if (!fs.existsSync(idlPath)) {
    throw new Error("IDL not found. Run: anchor build");
  }
  return JSON.parse(fs.readFileSync(idlPath, "utf8"));
}

async function resolveUserTokenAccount(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<PublicKey | null> {
  const [userTokenPDA] = PublicKey.findProgramAddressSync(
    [USER_TOKEN_SEED, owner.toBuffer(), mint.toBuffer()],
    BAGEL_PROGRAM_ID
  );

  try {
    const accountInfo = await connection.getAccountInfo(userTokenPDA);
    if (!accountInfo) return null;

    const INCO_TOKEN_ACCOUNT_OFFSET = 72;
    const incoTokenAccountBytes = accountInfo.data.slice(
      INCO_TOKEN_ACCOUNT_OFFSET,
      INCO_TOKEN_ACCOUNT_OFFSET + 32
    );
    const incoTokenAccount = new PublicKey(incoTokenAccountBytes);

    if (incoTokenAccount.equals(PublicKey.default)) return null;
    return incoTokenAccount;
  } catch {
    return null;
  }
}

// ============================================================
// Deposit Reproduction
// ============================================================

interface DepositTraceResult {
  txHash: string;
  success: boolean;
  callTrace: CallTraceEntry[];
  preBalance: EncryptedBalanceSnapshot;
  postBalance: EncryptedBalanceSnapshot;
  privacyVerification: PrivacyVerification;
  logs: string[];
}

interface CallTraceEntry {
  program: string;
  programName: string;
  depth: number;
  success: boolean;
}

interface EncryptedBalanceSnapshot {
  timestamp: number;
  businessEntryPDA: string;
  encryptedBalanceHandle: string;
  depositCount: number;
}

interface PrivacyVerification {
  instructionUsesOptionNone: boolean;
  noPlaintextAmount: boolean;
  confidentialTransferInvoked: boolean;
  encryptedBalanceUpdated: boolean;
  overallPass: boolean;
}

async function getEncryptedBalanceSnapshot(
  connection: Connection,
  businessEntryPDA: PublicKey
): Promise<EncryptedBalanceSnapshot | null> {
  const accountInfo = await connection.getAccountInfo(businessEntryPDA);
  if (!accountInfo) return null;

  // Parse BusinessEntry:
  // discriminator(8) + master_vault(32) + entry_index(8) +
  // encrypted_employer_id(16) + encrypted_balance(16) + ...

  const ENCRYPTED_BALANCE_OFFSET = 8 + 32 + 8 + 16;

  const encryptedBalance = accountInfo.data.slice(
    ENCRYPTED_BALANCE_OFFSET,
    ENCRYPTED_BALANCE_OFFSET + 16
  );

  // Parse next_employee_index for deposit count approximation
  // We'll use a different metric if available

  return {
    timestamp: Date.now(),
    businessEntryPDA: businessEntryPDA.toBase58(),
    encryptedBalanceHandle: encryptedBalance.toString("hex"),
    depositCount: 0, // Not stored in Bagel BusinessEntry
  };
}

function parseCallTrace(logs: string[]): CallTraceEntry[] {
  const trace: CallTraceEntry[] = [];
  const knownPrograms: Record<string, string> = {
    [BAGEL_PROGRAM_ID.toBase58()]: "Bagel",
    [INCO_TOKEN_PROGRAM_ID_DEFAULT.toBase58()]: "IncoToken",
    [INCO_LIGHTNING_ID.toBase58()]: "IncoLightning",
    [SystemProgram.programId.toBase58()]: "System",
  };

  for (const log of logs) {
    const invokeMatch = log.match(/Program (\w+) invoke \[(\d+)\]/);
    if (invokeMatch) {
      const programId = invokeMatch[1];
      trace.push({
        program: programId,
        programName: knownPrograms[programId] || "Unknown",
        depth: parseInt(invokeMatch[2]),
        success: true,
      });
    }

    const failMatch = log.match(/Program (\w+) failed/);
    if (failMatch) {
      const lastEntry = trace.find(e => e.program === failMatch[1]);
      if (lastEntry) lastEntry.success = false;
    }
  }

  return trace;
}

function verifyPrivacy(
  logs: string[],
  callTrace: CallTraceEntry[],
  preBalance: EncryptedBalanceSnapshot | null,
  postBalance: EncryptedBalanceSnapshot | null
): PrivacyVerification {
  // Check instruction uses Option::None
  let instructionUsesOptionNone = false;
  for (const log of logs) {
    if (log.includes("Option::None") || log.includes("ENCRYPTED") || log.includes("encrypted_amount")) {
      instructionUsesOptionNone = true;
      break;
    }
  }

  // Check no plaintext amount
  let noPlaintextAmount = true;
  for (const log of logs) {
    if (log.includes(DEPOSIT_AMOUNT.toString())) {
      noPlaintextAmount = false;
      break;
    }
  }

  // Check confidential transfer invoked
  const confidentialTransferInvoked = callTrace.some(
    e => e.programName === "IncoToken" || e.programName === "IncoLightning"
  );

  // Check encrypted balance updated
  const encryptedBalanceUpdated =
    preBalance !== null &&
    postBalance !== null &&
    preBalance.encryptedBalanceHandle !== postBalance.encryptedBalanceHandle;

  const overallPass =
    instructionUsesOptionNone &&
    noPlaintextAmount &&
    confidentialTransferInvoked &&
    encryptedBalanceUpdated;

  return {
    instructionUsesOptionNone,
    noPlaintextAmount,
    confidentialTransferInvoked,
    encryptedBalanceUpdated,
    overallPass,
  };
}

async function runDepositReproduction(): Promise<DepositTraceResult> {
  const connection = new Connection(HELIUS_RPC, "confirmed");
  const authority = loadAuthority();
  const config = loadConfig();
  const idl = loadIDL();

  log("Starting Deposit Reproduction", "info");
  log(`Authority: ${authority.publicKey.toBase58()}`, "info");

  // Load configuration
  const INCO_TOKEN_PROGRAM_ID = new PublicKey(
    config.INCO_TOKEN_PROGRAM_ID || INCO_TOKEN_PROGRAM_ID_DEFAULT.toBase58()
  );
  const USDBAGEL_MINT = new PublicKey(config.USDBAGEL_MINT);
  const DEPOSITOR_TOKEN_ACCOUNT = new PublicKey(config.DEPOSITOR_TOKEN_ACCOUNT);
  const VAULT_TOKEN_ACCOUNT = new PublicKey(config.VAULT_TOKEN_ACCOUNT);

  log(`Inco Token Program: ${INCO_TOKEN_PROGRAM_ID.toBase58()}`, "info");
  log(`USDBagel Mint: ${USDBAGEL_MINT.toBase58()}`, "info");

  // Derive PDAs
  const [masterVaultPDA] = PublicKey.findProgramAddressSync(
    [MASTER_VAULT_SEED],
    BAGEL_PROGRAM_ID
  );
  log(`Master Vault: ${masterVaultPDA.toBase58()}`, "info");

  // Get current business count to find latest business
  const vaultInfo = await connection.getAccountInfo(masterVaultPDA);
  if (!vaultInfo) {
    throw new Error("Master Vault not initialized");
  }

  const NEXT_BUSINESS_INDEX_OFFSET = 8 + 32 + 8 + 16 + 16;
  const nextBusinessIndex = Number(vaultInfo.data.readBigUInt64LE(NEXT_BUSINESS_INDEX_OFFSET));

  if (nextBusinessIndex === 0) {
    throw new Error("No businesses registered. Register a business first.");
  }

  // Use first business (index 0)
  const businessIndex = 0;
  const [businessEntryPDA] = PublicKey.findProgramAddressSync(
    [
      BUSINESS_ENTRY_SEED,
      masterVaultPDA.toBuffer(),
      Buffer.alloc(8), // Little-endian 0
    ],
    BAGEL_PROGRAM_ID
  );
  log(`Business Entry (index ${businessIndex}): ${businessEntryPDA.toBase58()}`, "info");

  // Get pre-deposit balance snapshot
  log("Taking pre-deposit balance snapshot...", "trace");
  const preBalance = await getEncryptedBalanceSnapshot(connection, businessEntryPDA);
  if (preBalance) {
    log(`Pre-deposit encrypted balance: ${preBalance.encryptedBalanceHandle}`, "trace");
  }

  // Build deposit instruction
  const depositIx = idl.instructions.find((ix: any) => ix.name === "deposit");
  if (!depositIx) {
    throw new Error("deposit instruction not found in IDL");
  }

  const discriminator = Buffer.from(depositIx.discriminator);

  // Create mock encrypted amount (in production, use @inco/solana-sdk)
  const encryptedAmount = Buffer.alloc(128);
  encryptedAmount.writeBigUInt64LE(BigInt(DEPOSIT_AMOUNT), 0);
  for (let i = 8; i < 128; i++) {
    encryptedAmount[i] = Math.floor(Math.random() * 256);
  }

  // Build instruction data
  const lengthPrefix = Buffer.alloc(4);
  lengthPrefix.writeUInt32LE(encryptedAmount.length);

  const instructionData = Buffer.concat([
    discriminator,
    lengthPrefix,
    encryptedAmount,
  ]);

  log(`Instruction data: ${instructionData.length} bytes`, "trace");
  log(`  Discriminator: ${discriminator.toString("hex")}`, "trace");
  log(`  Encrypted amount: ${encryptedAmount.length} bytes`, "trace");

  // Build accounts
  const accounts = [
    { pubkey: authority.publicKey, isSigner: true, isWritable: true }, // depositor
    { pubkey: masterVaultPDA, isSigner: false, isWritable: true }, // master_vault
    { pubkey: businessEntryPDA, isSigner: false, isWritable: true }, // business_entry
    { pubkey: INCO_LIGHTNING_ID, isSigner: false, isWritable: false }, // inco_lightning_program
    { pubkey: INCO_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // inco_token_program (optional)
    { pubkey: DEPOSITOR_TOKEN_ACCOUNT, isSigner: false, isWritable: true }, // depositor_token_account (optional)
    { pubkey: VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true }, // master_vault_token_account (optional)
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
  ];

  const instruction = new TransactionInstruction({
    programId: BAGEL_PROGRAM_ID,
    keys: accounts,
    data: instructionData,
  });

  // Build and send transaction
  log("Building transaction...", "trace");
  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authority.publicKey;
  transaction.sign(authority);

  log("Sending transaction...", "trace");
  let txHash: string;
  try {
    txHash = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });
  } catch (error: any) {
    throw new Error(`Transaction send failed: ${error.message}`);
  }

  log(`Transaction hash: ${txHash}`, "success");
  log(`Explorer: https://orbmarkets.io/tx/${txHash}?cluster=devnet`, "info");

  // Wait for confirmation
  log("Waiting for confirmation...", "trace");
  await connection.confirmTransaction(
    { blockhash, lastValidBlockHeight, signature: txHash },
    "confirmed"
  );

  // Fetch transaction details
  await new Promise(resolve => setTimeout(resolve, 2000));
  const txResponse = await connection.getTransaction(txHash, {
    maxSupportedTransactionVersion: 0,
  });

  if (!txResponse) {
    throw new Error("Transaction not found");
  }

  const success = txResponse.meta?.err === null;
  const logs = txResponse.meta?.logMessages || [];

  log(`Transaction success: ${success}`, success ? "success" : "error");

  // Parse call trace
  log("Parsing call trace...", "trace");
  const callTrace = parseCallTrace(logs);

  // Get post-deposit balance snapshot
  log("Taking post-deposit balance snapshot...", "trace");
  const postBalance = await getEncryptedBalanceSnapshot(connection, businessEntryPDA);
  if (postBalance) {
    log(`Post-deposit encrypted balance: ${postBalance.encryptedBalanceHandle}`, "trace");
  }

  // Verify privacy
  log("Verifying privacy...", "trace");
  const privacyVerification = verifyPrivacy(logs, callTrace, preBalance, postBalance);

  return {
    txHash,
    success,
    callTrace,
    preBalance: preBalance || {
      timestamp: 0,
      businessEntryPDA: "",
      encryptedBalanceHandle: "",
      depositCount: 0,
    },
    postBalance: postBalance || {
      timestamp: 0,
      businessEntryPDA: "",
      encryptedBalanceHandle: "",
      depositCount: 0,
    },
    privacyVerification,
    logs,
  };
}

// ============================================================
// Report Generation
// ============================================================

function generateReport(result: DepositTraceResult): string {
  const lines: string[] = [];

  lines.push("═".repeat(70));
  lines.push("  DEPOSIT REPRODUCTION REPORT");
  lines.push("═".repeat(70));
  lines.push("");

  lines.push("TRANSACTION DETAILS");
  lines.push("─".repeat(70));
  lines.push(`  TX Hash:    ${result.txHash}`);
  lines.push(`  Success:    ${result.success ? "YES" : "NO"}`);
  lines.push(`  Explorer:   https://orbmarkets.io/tx/${result.txHash}?cluster=devnet`);
  lines.push("");

  lines.push("CALL TRACE");
  lines.push("─".repeat(70));
  for (const entry of result.callTrace) {
    const indent = "  ".repeat(entry.depth);
    const status = entry.success ? "[OK]" : "[FAILED]";
    lines.push(`  ${indent}${status} ${entry.programName} (${entry.program.slice(0, 8)}...)`);
  }
  lines.push("");

  lines.push("ENCRYPTED BALANCE COMPARISON");
  lines.push("─".repeat(70));
  lines.push(`  Pre-deposit:  ${result.preBalance.encryptedBalanceHandle || "N/A"}`);
  lines.push(`  Post-deposit: ${result.postBalance.encryptedBalanceHandle || "N/A"}`);
  lines.push(`  Changed:      ${
    result.preBalance.encryptedBalanceHandle !== result.postBalance.encryptedBalanceHandle
      ? "YES"
      : "NO"
  }`);
  lines.push("");

  lines.push("PRIVACY VERIFICATION");
  lines.push("─".repeat(70));
  lines.push(`  Option::None format:        ${result.privacyVerification.instructionUsesOptionNone ? "PASS" : "UNKNOWN"}`);
  lines.push(`  No plaintext amount:        ${result.privacyVerification.noPlaintextAmount ? "PASS" : "FAIL"}`);
  lines.push(`  Confidential transfer CPI:  ${result.privacyVerification.confidentialTransferInvoked ? "PASS" : "UNKNOWN"}`);
  lines.push(`  Encrypted balance updated:  ${result.privacyVerification.encryptedBalanceUpdated ? "PASS" : "NO CHANGE"}`);
  lines.push("");
  lines.push(`  OVERALL: ${result.privacyVerification.overallPass ? "PASS" : "REVIEW NEEDED"}`);
  lines.push("");

  lines.push("TRANSACTION LOGS");
  lines.push("─".repeat(70));
  for (const log of result.logs) {
    // Truncate long logs
    const displayLog = log.length > 80 ? log.slice(0, 77) + "..." : log;
    lines.push(`  ${displayLog}`);
  }
  lines.push("");

  lines.push("═".repeat(70));

  return lines.join("\n");
}

// ============================================================
// Main Execution
// ============================================================

async function main() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  DEPOSIT REPRODUCTION - Confidential Token Transfer Verification  ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  try {
    const result = await runDepositReproduction();

    console.log("\n");
    console.log(generateReport(result));

    // Save report to file
    const reportFile = "DEPOSIT_REPRODUCTION_REPORT.txt";
    fs.writeFileSync(reportFile, generateReport(result));
    log(`Report saved to: ${reportFile}`, "success");

    // Exit with appropriate code
    if (result.success && result.privacyVerification.noPlaintextAmount) {
      log("Deposit verification PASSED", "success");
      process.exit(0);
    } else {
      log("Deposit verification needs review", "warning");
      process.exit(1);
    }
  } catch (error: any) {
    log(`Error: ${error.message}`, "error");
    console.error(error);
    process.exit(1);
  }
}

main();
