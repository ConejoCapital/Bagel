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
  ShieldCheck,
  LockSimple,
  Fingerprint,
  ArrowSquareOut,
  Warning,
  Database,
  CircleNotch,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  resolveUserTokenAccount,
  getUserTokenAccountPDA,
  checkUserTokenAccountExists,
  getConfidentialBalance,
  USDBAGEL_MINT,
} from '../lib/bagel-client';
import { formatBalance } from '../lib/format';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

interface AccountInfo {
  bagelPDA: string | null;
  bagelPDAExists: boolean;
  incoTokenAccount: string | null;
  solBalance: number;
  hasEncryptedBalance: boolean;
}

export default function WalletsPage() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    bagelPDA: null,
    bagelPDAExists: false,
    incoTokenAccount: null,
    solBalance: 0,
    hasEncryptedBalance: false,
  });

  // Load account info on mount and when wallet changes
  useEffect(() => {
    async function loadAccountInfo() {
      if (!publicKey || !connected) {
        setAccountInfo({
          bagelPDA: null,
          bagelPDAExists: false,
          incoTokenAccount: null,
          solBalance: 0,
          hasEncryptedBalance: false,
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const solBalance = await connection.getBalance(publicKey);
        const [bagelPDA] = getUserTokenAccountPDA(publicKey, USDBAGEL_MINT);
        const pdaExists = await checkUserTokenAccountExists(connection, publicKey, USDBAGEL_MINT);
        const incoTokenAccount = await resolveUserTokenAccount(connection, publicKey, USDBAGEL_MINT);

        let hasEncryptedBalance = false;
        if (incoTokenAccount) {
          const balanceInfo = await getConfidentialBalance(connection, incoTokenAccount);
          hasEncryptedBalance = balanceInfo.exists && !!balanceInfo.encryptedBalance;
        }

        setAccountInfo({
          bagelPDA: bagelPDA.toBase58(),
          bagelPDAExists: pdaExists,
          incoTokenAccount: incoTokenAccount?.toBase58() || null,
          solBalance: solBalance / LAMPORTS_PER_SOL,
          hasEncryptedBalance,
        });
      } catch (err: any) {
        console.error('Failed to load account info:', err);
        setError(err.message || 'Failed to load account information');
      } finally {
        setLoading(false);
      }
    }

    loadAccountInfo();
  }, [publicKey, connected, connection]);

  const refreshAccountInfo = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const solBalance = await connection.getBalance(publicKey);
      const incoTokenAccount = await resolveUserTokenAccount(connection, publicKey, USDBAGEL_MINT);

      let hasEncryptedBalance = false;
      if (incoTokenAccount) {
        const balanceInfo = await getConfidentialBalance(connection, incoTokenAccount);
        hasEncryptedBalance = balanceInfo.exists && !!balanceInfo.encryptedBalance;
      }

      setAccountInfo(prev => ({
        ...prev,
        solBalance: solBalance / LAMPORTS_PER_SOL,
        incoTokenAccount: incoTokenAccount?.toBase58() || null,
        hasEncryptedBalance,
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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
                <h1 className="text-xl font-bold text-bagel-dark">Wallets</h1>
              </div>
            </div>
            <WalletButton />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Error Message */}
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

            {/* Connected Wallet */}
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
                    href={`https://orbmarkets.io/address/${publicKey.toBase58()}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ArrowSquareOut className="w-4 h-4 text-gray-500" />
                  </a>
                </div>

                {/* Balances */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* SOL Balance */}
                  <div className="p-4 bg-bagel-cream rounded border border-bagel-orange/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-bagel-orange rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">◎</span>
                      </div>
                      <span className="text-sm font-medium text-bagel-dark">SOL Balance</span>
                    </div>
                    <div className="text-2xl font-bold text-bagel-dark">
                      {loading ? (
                        <CircleNotch className="w-6 h-6 animate-spin text-bagel-orange" />
                      ) : (
                        `${formatBalance(accountInfo.solBalance, 4)} SOL`
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Native Solana</div>
                  </div>

                  {/* USDBagel Balance */}
                  <div className="p-4 bg-bagel-cream rounded border border-bagel-orange/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-bagel-orange rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">🥯</span>
                      </div>
                      <span className="text-sm font-medium text-bagel-dark">USDBagel</span>
                    </div>
                    <div className="text-2xl font-bold text-bagel-dark flex items-center gap-2">
                      {loading ? (
                        <CircleNotch className="w-6 h-6 animate-spin text-bagel-orange" />
                      ) : accountInfo.incoTokenAccount ? (
                        <>
                          <LockSimple className="w-5 h-5 text-bagel-orange" />
                          <span>Encrypted</span>
                        </>
                      ) : (
                        <span className="text-gray-400 text-lg">No account</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {accountInfo.incoTokenAccount
                        ? 'FHE-encrypted balance'
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
                    Account Details
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
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-bagel-orange/10 text-bagel-orange">
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
                          Stores reference to your Inco Token account
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
                            href={`https://orbmarkets.io/address/${accountInfo.bagelPDA}?cluster=devnet`}
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
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-bagel-orange/10 text-bagel-orange">
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
                          Holds your encrypted USDBagel balance
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
                            href={`https://orbmarkets.io/address/${accountInfo.incoTokenAccount}?cluster=devnet`}
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
              </motion.div>
            )}

            {/* How It Works */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded p-6 border border-gray-200"
            >
              <h3 className="font-semibold text-bagel-dark mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-bagel-orange" />
                How Your Wallet Works
              </h3>

              <div className="space-y-4 text-sm text-gray-600">
                <div className="p-4 bg-bagel-cream/50 rounded border border-bagel-orange/10">
                  <h4 className="font-medium text-bagel-dark mb-2 flex items-center gap-2">
                    <LockSimple className="w-4 h-4 text-bagel-orange" />
                    Fully Homomorphic Encryption (FHE)
                  </h4>
                  <p className="text-xs leading-relaxed">
                    Your USDBagel balance is encrypted using Inco's FHE technology. This means your balance
                    remains encrypted on-chain at all times - even the blockchain validators cannot see your
                    actual balance. Computations (transfers, payroll calculations) happen directly on encrypted
                    data without ever decrypting it.
                  </p>
                </div>

                <div className="p-4 bg-bagel-cream/50 rounded border border-bagel-orange/10">
                  <h4 className="font-medium text-bagel-dark mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4 text-bagel-orange" />
                    On-Chain Account Registry
                  </h4>
                  <p className="text-xs leading-relaxed">
                    Bagel uses PDA-based registry accounts to link your wallet to your confidential token account.
                    The PDA is derived deterministically from your wallet address, so anyone can find your token
                    account without relying on localStorage or centralized databases.
                  </p>
                </div>

                <div className="p-4 bg-bagel-cream/50 rounded border border-bagel-orange/10">
                  <h4 className="font-medium text-bagel-dark mb-2 flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-bagel-orange" />
                    Privacy Guarantees
                  </h4>
                  <p className="text-xs leading-relaxed">
                    Only you (the wallet owner) can authorize decryption of your balance. Employers can pay you
                    without knowing your total balance, and coworkers cannot see each other's salaries. All
                    financial data stays private while still being verifiable on-chain.
                  </p>
                </div>
              </div>

              {/* Program IDs */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="font-medium text-bagel-dark mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-bagel-orange" />
                  Program IDs
                </h4>
                <div className="space-y-1 font-mono text-[10px] bg-gray-50 p-3 rounded">
                  <div><span className="text-gray-500">Bagel:</span> AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj</div>
                  <div><span className="text-gray-500">Inco Lightning:</span> 5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj</div>
                  <div><span className="text-gray-500">Inco Token:</span> 4cyJHzecVWuU2xux6bCAPAhALKQT8woBh4Vx3AGEGe5N</div>
                  <div><span className="text-gray-500">USDBagel Mint:</span> GhCZ59UK4Afg4WGpQ11HyRc8ya4swgWFXMh2BxuWQXHt</div>
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
                  Connect your Solana wallet to view your accounts.
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
