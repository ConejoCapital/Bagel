import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowLeft,
  Copy,
  CheckCircle,
  Eye,
  EyeSlash,
  Info,
  Lightning,
  ShieldCheck,
  LockSimple,
  LockSimpleOpen,
  Fingerprint,
  ArrowSquareOut,
  Warning,
  Sparkle,
  Database,
  CircleNotch,
  CurrencyDollar,
  ArrowDown,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { decrypt } from '@inco/solana-sdk/attested-decrypt';
import {
  resolveUserTokenAccount,
  getUserTokenAccountPDA,
  checkUserTokenAccountExists,
  requestWithdrawal,
  getConfidentialBalance,
  getCurrentBusinessIndex,
  getCurrentEmployeeIndex,
  getMasterVaultPDA,
  getBusinessEntryPDA,
  lamportsToSOL,
  USDBAGEL_MINT,
} from '../lib/bagel-client';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

interface AccountInfo {
  bagelPDA: string | null;
  bagelPDAExists: boolean;
  incoTokenAccount: string | null;
  solBalance: number;
  encryptedBalance: string | null;
  encryptedHandle: bigint | null;
  encryptedHandleHex: string | null; // Hex format for Inco SDK
  decryptedBalance: number | null;
}

// Extract handle from IncoAccount data
// Layout from IDL: discriminator(8) + mint(32) + owner(32) + amount(Euint128 = u128 = 16 bytes)
// Amount starts at offset 72
function extractHandleAsHex(data: Buffer): string {
  // Euint128 is just u128 (16 bytes) per the IDL
  const handleBytes = data.slice(72, 72 + 16);
  const hexStr = Buffer.from(handleBytes).toString('hex');
  console.log('Handle bytes (16, hex):', hexStr);
  return hexStr;
}

// Extract as bigint (u128 little-endian)
function extractHandleAsBigInt(data: Buffer): bigint {
  const bytes = data.slice(72, 88);
  let result = BigInt(0);
  for (let i = 15; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  console.log('Handle (bigint):', result.toString());
  return result;
}

interface EmployeeInfo {
  businessIndex: number;
  employeeIndex: number;
  accruedBalance: number | null;
}

export default function WalletsPage() {
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(false);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Account info state
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    bagelPDA: null,
    bagelPDAExists: false,
    incoTokenAccount: null,
    solBalance: 0,
    encryptedBalance: null,
    encryptedHandle: null,
    encryptedHandleHex: null,
    decryptedBalance: null,
  });
  const [decrypting, setDecrypting] = useState(false);
  const [settingUpAllowance, setSettingUpAllowance] = useState(false);

  // Employee info for withdrawals
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Load account info on mount and when wallet changes
  useEffect(() => {
    async function loadAccountInfo() {
      if (!publicKey || !connected) {
        setAccountInfo({
          bagelPDA: null,
          bagelPDAExists: false,
          incoTokenAccount: null,
          solBalance: 0,
          encryptedBalance: null,
          encryptedHandle: null,
          encryptedHandleHex: null,
          decryptedBalance: null,
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get SOL balance
        const solBalance = await connection.getBalance(publicKey);

        // Get Bagel PDA address
        const [bagelPDA] = getUserTokenAccountPDA(publicKey, USDBAGEL_MINT);

        // Check if PDA exists
        const pdaExists = await checkUserTokenAccountExists(connection, publicKey, USDBAGEL_MINT);

        // Resolve Inco Token account from on-chain PDA
        const incoTokenAccount = await resolveUserTokenAccount(connection, publicKey, USDBAGEL_MINT);

        // Get encrypted balance if token account exists
        let encryptedBalance: string | null = null;
        let encryptedHandle: bigint | null = null;
        let encryptedHandleHex: string | null = null;
        if (incoTokenAccount) {
          const balanceInfo = await getConfidentialBalance(connection, incoTokenAccount);
          if (balanceInfo.exists && balanceInfo.encryptedBalance) {
            encryptedBalance = balanceInfo.encryptedBalance;
          }
          // Also fetch the raw account data to extract the handle
          const tokenAccountInfo = await connection.getAccountInfo(incoTokenAccount);
          if (tokenAccountInfo?.data) {
            const handleBigInt = extractHandleAsBigInt(tokenAccountInfo.data as Buffer);
            const handleHex = extractHandleAsHex(tokenAccountInfo.data as Buffer);
            if (handleBigInt !== BigInt(0)) {
              encryptedHandle = handleBigInt;
              encryptedHandleHex = handleHex;
              console.log('Extracted handle (bigint):', handleBigInt.toString());
              console.log('Extracted handle (hex):', handleHex);
            }
          }
        }

        setAccountInfo({
          bagelPDA: bagelPDA.toBase58(),
          bagelPDAExists: pdaExists,
          incoTokenAccount: incoTokenAccount?.toBase58() || null,
          solBalance: solBalance / LAMPORTS_PER_SOL,
          encryptedBalance,
          encryptedHandle,
          encryptedHandleHex,
          decryptedBalance: null,
        });

        // Try to load employee info for withdrawal
        try {
          const businessIndex = await getCurrentBusinessIndex(connection);
          if (businessIndex > 0) {
            // Check if user is an employee in any business
            // For demo, check index 0
            const storageKey = `bagel_employee_info_${publicKey.toBase58()}`;
            const saved = localStorage.getItem(storageKey);
            if (saved) {
              const parsed = JSON.parse(saved);
              setEmployeeInfo(parsed);
            }
          }
        } catch {
          // Not an employee, that's fine
        }
      } catch (err: any) {
        console.error('Failed to load account info:', err);
        setError(err.message || 'Failed to load account information');
      } finally {
        setLoading(false);
      }
    }

    loadAccountInfo();
  }, [publicKey, connected, connection]);

  // Refresh account info
  const refreshAccountInfo = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const solBalance = await connection.getBalance(publicKey);
      const incoTokenAccount = await resolveUserTokenAccount(connection, publicKey, USDBAGEL_MINT);

      let encryptedBalance: string | null = null;
      let encryptedHandle: bigint | null = null;
      let encryptedHandleHex: string | null = null;
      if (incoTokenAccount) {
        const balanceInfo = await getConfidentialBalance(connection, incoTokenAccount);
        if (balanceInfo.exists && balanceInfo.encryptedBalance) {
          encryptedBalance = balanceInfo.encryptedBalance;
        }
        // Also fetch the raw account data to extract the handle
        const tokenAccountInfo = await connection.getAccountInfo(incoTokenAccount);
        if (tokenAccountInfo?.data) {
          const handleBigInt = extractHandleAsBigInt(tokenAccountInfo.data as Buffer);
          const handleHex = extractHandleAsHex(tokenAccountInfo.data as Buffer);
          if (handleBigInt !== BigInt(0)) {
            encryptedHandle = handleBigInt;
            encryptedHandleHex = handleHex;
          }
        }
      }

      setAccountInfo(prev => ({
        ...prev,
        solBalance: solBalance / LAMPORTS_PER_SOL,
        incoTokenAccount: incoTokenAccount?.toBase58() || null,
        encryptedBalance,
        encryptedHandle,
        encryptedHandleHex,
        decryptedBalance: null, // Reset decrypted on refresh
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  // Decrypt balance using Inco SDK
  const handleDecryptBalance = useCallback(async () => {
    if (!publicKey || !wallet.signMessage || !accountInfo.encryptedHandle) {
      setError('Missing required data for decryption');
      return;
    }

    setDecrypting(true);
    setError(null);

    try {
      console.log('🔓 Requesting balance decryption from Inco...');
      console.log('   Handle (decimal):', accountInfo.encryptedHandle.toString());
      console.log('   Handle (hex):', accountInfo.encryptedHandleHex);
      console.log('   Wallet:', publicKey.toBase58());

      // SDK expects handle as decimal string (BigInt.toString())
      const result = await decrypt([accountInfo.encryptedHandle.toString()], {
        address: publicKey,
        signMessage: wallet.signMessage,
      });

      console.log('✅ Decryption result:', result);

      if (result.plaintexts && result.plaintexts.length > 0) {
        // Convert from smallest unit (6 or 9 decimals) to display format
        const rawValue = BigInt(result.plaintexts[0] ?? '0');
        // USDBagel uses 9 decimals
        const decryptedValue = Number(rawValue) / 1e9;

        setAccountInfo(prev => ({
          ...prev,
          decryptedBalance: decryptedValue,
        }));

        console.log('💰 Decrypted balance:', decryptedValue, 'USDBagel');
      }
    } catch (err: any) {
      console.error('Decryption failed:', err);
      const errorMsg = err.message || 'Failed to decrypt balance';
      console.error('Error details:', JSON.stringify(err, null, 2));

      // Check if it's an allowance issue
      if (errorMsg.includes('not allowed')) {
        setError(`${errorMsg}. Click "Setup Allowance" first to enable decryption.`);
      } else {
        setError(`${errorMsg}. Make sure allowance is set up for your wallet.`);
      }
    } finally {
      setDecrypting(false);
    }
  }, [publicKey, wallet.signMessage, accountInfo.encryptedHandle, accountInfo.encryptedHandleHex]);

  // Setup allowance for decryption
  const handleSetupAllowance = useCallback(async () => {
    if (!publicKey || !accountInfo.incoTokenAccount) {
      setError('Missing token account');
      return;
    }

    setSettingUpAllowance(true);
    setError(null);

    try {
      console.log('🔐 Setting up allowance for decryption...');
      console.log('   Token Account:', accountInfo.incoTokenAccount);
      console.log('   Owner:', publicKey.toBase58());

      const response = await fetch('/api/setup-allowance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAccount: accountInfo.incoTokenAccount,
          ownerAddress: publicKey.toBase58(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Allowance set up!', data);
        setSuccessMessage(`Allowance set up! You can now decrypt your balance. (Tx: ${data.txid?.slice(0, 8)}...)`);
      } else {
        throw new Error(data.error || 'Failed to set up allowance');
      }
    } catch (err: any) {
      console.error('Setup allowance failed:', err);
      setError(err.message || 'Failed to set up allowance');
    } finally {
      setSettingUpAllowance(false);
    }
  }, [publicKey, accountInfo.incoTokenAccount]);

  // Handle withdrawal (employee claim)
  const handleWithdraw = useCallback(async () => {
    if (!publicKey || !employeeInfo || !accountInfo.incoTokenAccount) {
      setError('Missing required information for withdrawal');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setWithdrawing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Get vault token account
      const vaultTokenAccountStr = process.env.NEXT_PUBLIC_VAULT_TOKEN_ACCOUNT || 'C2nZ8CK2xqRJj7uQuipmi111hqXf3sRK2Zq4aQhmSYJu';
      const vaultTokenAccount = new PublicKey(vaultTokenAccountStr);
      const employeeTokenAccount = new PublicKey(accountInfo.incoTokenAccount);

      // Convert to lamports (assuming 9 decimals)
      const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

      console.log('💸 Initiating withdrawal...');
      console.log('   Amount:', amount, 'USDBagel');
      console.log('   Business Index:', employeeInfo.businessIndex);
      console.log('   Employee Index:', employeeInfo.employeeIndex);

      const txid = await requestWithdrawal(
        connection,
        wallet,
        employeeInfo.businessIndex,
        employeeInfo.employeeIndex,
        amountLamports,
        false, // useShadowwire
        vaultTokenAccount,
        employeeTokenAccount
      );

      console.log('✅ Withdrawal successful! Tx:', txid);
      setSuccessMessage(`Withdrawal successful! Transaction: ${txid.slice(0, 8)}...`);
      setWithdrawAmount('');

      // Refresh account info
      await refreshAccountInfo();
    } catch (err: any) {
      console.error('Withdrawal failed:', err);
      setError(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  }, [publicKey, employeeInfo, accountInfo.incoTokenAccount, withdrawAmount, connection, wallet, refreshAccountInfo]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatAddress = (address: string) => {
    if (address.length > 20) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  return (
    <>
      <Head>
        <title>Wallets - Bagel</title>
        <meta name="description" content="Manage your wallets and confidential accounts" />
      </Head>

      <div className="min-h-screen bg-[#F7F7F2]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥯</span>
                <h1 className="text-xl font-bold text-bagel-dark">Wallets & Balances</h1>
              </div>
            </div>
            <WalletButton />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Error/Success Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2"
              >
                <Warning className="w-5 h-5" />
                {error}
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" weight="fill" />
                {successMessage}
              </motion.div>
            )}

            {/* Connected Wallet & Balances */}
            {connected && publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-bagel-dark flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-bagel-orange" />
                    Connected Wallet
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshAccountInfo}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    >
                      <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Active
                    </span>
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded border border-gray-200 mb-4">
                  <div className="w-10 h-10 bg-bagel-orange/10 rounded-full flex items-center justify-center">
                    <Fingerprint className="w-5 h-5 text-bagel-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-bagel-dark">Primary Wallet</div>
                    <div className="text-xs text-gray-500 font-mono truncate">{publicKey.toBase58()}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(publicKey.toBase58(), 'wallet')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copiedKey === 'wallet' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <a
                    href={`https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ArrowSquareOut className="w-4 h-4 text-gray-500" />
                  </a>
                </div>

                {/* Balances Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* SOL Balance */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">◎</span>
                      </div>
                      <span className="text-sm font-medium text-purple-900">SOL Balance</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {loading ? (
                        <CircleNotch className="w-6 h-6 animate-spin" />
                      ) : (
                        `${accountInfo.solBalance.toFixed(4)} SOL`
                      )}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">Native Solana</div>
                  </div>

                  {/* USDBagel Balance */}
                  <div className="p-4 bg-gradient-to-br from-bagel-cream to-bagel-orange/20 rounded border border-bagel-orange/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-bagel-orange rounded-full flex items-center justify-center">
                          <span className="text-white text-lg">🥯</span>
                        </div>
                        <span className="text-sm font-medium text-bagel-dark">USDBagel Balance</span>
                      </div>
                      {accountInfo.encryptedHandle && !accountInfo.decryptedBalance && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSetupAllowance}
                            disabled={settingUpAllowance}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {settingUpAllowance ? (
                              <>
                                <CircleNotch className="w-3 h-3 animate-spin" />
                                Setting up...
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3 h-3" />
                                Setup Allowance
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleDecryptBalance}
                            disabled={decrypting || !wallet.signMessage}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-bagel-orange bg-white border border-bagel-orange/30 rounded hover:bg-bagel-orange/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {decrypting ? (
                              <>
                                <CircleNotch className="w-3 h-3 animate-spin" />
                                Decrypting...
                              </>
                            ) : (
                              <>
                                <LockSimpleOpen className="w-3 h-3" />
                                Decrypt
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-bagel-dark flex items-center gap-2">
                      {loading ? (
                        <CircleNotch className="w-6 h-6 animate-spin" />
                      ) : accountInfo.decryptedBalance !== null ? (
                        <>
                          <LockSimpleOpen className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">{accountInfo.decryptedBalance.toFixed(4)} USDBagel</span>
                        </>
                      ) : accountInfo.incoTokenAccount ? (
                        <>
                          <LockSimple className="w-5 h-5 text-bagel-orange" />
                          <span className="text-gray-500">🔒 Encrypted</span>
                        </>
                      ) : (
                        <span className="text-gray-400 text-lg">No account</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {accountInfo.decryptedBalance !== null
                        ? 'Decrypted via Inco FHE'
                        : accountInfo.incoTokenAccount
                        ? 'Click Decrypt to reveal balance'
                        : 'Mint tokens to create account'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* On-Chain Account Details */}
            {connected && publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-bagel-dark flex items-center gap-2">
                    <Database className="w-5 h-5 text-bagel-orange" />
                    On-Chain Account Details
                  </h3>
                  <button
                    onClick={() => setShowValues(!showValues)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    {showValues ? (
                      <>
                        <EyeSlash className="w-4 h-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Bagel PDA */}
                  <div className="p-4 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
                            Bagel Registry PDA
                          </span>
                          {accountInfo.bagelPDAExists ? (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">
                              Initialized
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-yellow-100 text-yellow-700">
                              Not Created
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Deterministic PDA that stores your Inco Token account reference
                        </p>
                        <div className="text-sm font-mono text-bagel-dark">
                          {showValues && accountInfo.bagelPDA ? accountInfo.bagelPDA : '••••••••••••••••••••••••••••••••'}
                        </div>
                      </div>
                      {accountInfo.bagelPDA && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(accountInfo.bagelPDA!, 'bagelPDA')}
                            className="p-2 hover:bg-gray-200 rounded transition-colors"
                          >
                            {copiedKey === 'bagelPDA' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          <a
                            href={`https://explorer.solana.com/address/${accountInfo.bagelPDA}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-200 rounded transition-colors"
                          >
                            <ArrowSquareOut className="w-4 h-4 text-gray-500" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inco Token Account */}
                  <div className="p-4 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">
                            Inco Token Account
                          </span>
                          {accountInfo.incoTokenAccount ? (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">
                              Linked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
                              Not Linked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Actual token account holding your encrypted USDBagel balance
                        </p>
                        <div className="text-sm font-mono text-bagel-dark">
                          {showValues && accountInfo.incoTokenAccount
                            ? accountInfo.incoTokenAccount
                            : accountInfo.incoTokenAccount
                            ? '••••••••••••••••••••••••••••••••'
                            : 'Not created yet - mint tokens first'}
                        </div>
                      </div>
                      {accountInfo.incoTokenAccount && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(accountInfo.incoTokenAccount!, 'incoToken')}
                            className="p-2 hover:bg-gray-200 rounded transition-colors"
                          >
                            {copiedKey === 'incoToken' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          <a
                            href={`https://explorer.solana.com/address/${accountInfo.incoTokenAccount}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-200 rounded transition-colors"
                          >
                            <ArrowSquareOut className="w-4 h-4 text-gray-500" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700">
                      <strong>On-Chain Storage:</strong> Your account addresses are now stored on-chain in the Bagel PDA.
                      No more localStorage dependency - anyone can derive your token account from your wallet address!
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Employee Withdrawal Section */}
            {connected && publicKey && employeeInfo && accountInfo.incoTokenAccount && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-bagel-dark flex items-center gap-2">
                    <ArrowDown className="w-5 h-5 text-bagel-orange" />
                    Claim Accrued Salary
                  </h3>
                  <span className="px-2 py-1 bg-bagel-orange/10 text-bagel-orange text-xs font-medium rounded">
                    Employee
                  </span>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded border border-green-200 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-green-700 mb-1">Accrued Balance</div>
                      <div className="text-2xl font-bold text-green-900 flex items-center gap-2">
                        <LockSimple className="w-5 h-5" />
                        <span>Encrypted</span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Business #{employeeInfo.businessIndex} • Employee #{employeeInfo.employeeIndex}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CurrencyDollar className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Withdrawal Amount (USDBagel)
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                      />
                      <motion.button
                        onClick={handleWithdraw}
                        disabled={withdrawing || !withdrawAmount}
                        whileHover={{ scale: withdrawing ? 1 : 1.02 }}
                        whileTap={{ scale: withdrawing ? 1 : 0.98 }}
                        className={`px-6 py-2.5 rounded text-sm font-medium flex items-center gap-2 ${
                          withdrawing || !withdrawAmount
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-bagel-orange text-white hover:bg-bagel-orange/90'
                        }`}
                      >
                        {withdrawing ? (
                          <>
                            <CircleNotch className="w-4 h-4 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-4 h-4" />
                            Claim
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Your salary accrues over time based on your per-second rate. Claim any amount up to your accrued balance.
                    The transfer uses confidential tokens so the amount remains private.
                  </div>
                </div>
              </motion.div>
            )}

            {/* Technical Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded p-6 border border-gray-200"
            >
              <h3 className="font-semibold text-bagel-dark mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-bagel-orange" />
                Technical Architecture
              </h3>

              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-bagel-dark mb-1">On-Chain Account Registry</h4>
                  <p className="text-xs">
                    Bagel uses PDA-based registry accounts to store references to your Inco Token accounts.
                    The PDA is derived from your wallet address and can be computed by anyone, making your
                    token account discoverable without needing localStorage.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-bagel-dark mb-1">FHE Encryption</h4>
                  <p className="text-xs">
                    All balances are encrypted using Inco's Fully Homomorphic Encryption. The encrypted
                    ciphertext is stored on-chain, but only authorized parties can decrypt it. This ensures
                    complete privacy of your financial data.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-bagel-dark mb-1">Program IDs</h4>
                  <div className="mt-2 space-y-1 font-mono text-[10px] bg-gray-50 p-3 rounded">
                    <div><span className="text-gray-500">Bagel:</span> AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj</div>
                    <div><span className="text-gray-500">Inco Lightning:</span> 5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj</div>
                    <div><span className="text-gray-500">Inco Token:</span> 4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N</div>
                    <div><span className="text-gray-500">USDBagel Mint:</span> GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Not Connected State */}
            {!connected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded p-12 border border-gray-200 text-center"
              >
                <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Connect your Solana wallet to view your balances and manage your accounts.
                </p>
                <WalletButton />
              </motion.div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
            <p className="text-xs">Bagel Privacy Payroll - Built on Solana with Inco FHE</p>
          </div>
        </footer>
      </div>
    </>
  );
}
