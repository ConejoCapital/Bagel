import { useState, useEffect } from 'react';
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
  Fingerprint,
  ArrowSquareOut,
  Warning,
  Sparkle,
  Database,
} from '@phosphor-icons/react';
import { useWallet } from '@solana/wallet-adapter-react';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

interface StoredAccount {
  key: string;
  value: string;
  type: 'token_account' | 'business' | 'other';
  wallet?: string;
}

export default function WalletsPage() {
  const { connected, publicKey } = useWallet();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(false);
  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);

  // Load localStorage data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accounts: StoredAccount[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';

          // Categorize the stored data
          let type: StoredAccount['type'] = 'other';
          let wallet: string | undefined;

          if (key.startsWith('userTokenAccount_')) {
            type = 'token_account';
            wallet = key.replace('userTokenAccount_', '');
          } else if (key.startsWith('businessEntryIndex_')) {
            type = 'business';
            wallet = key.replace('businessEntryIndex_', '');
          }

          // Only include Bagel-related keys
          if (type !== 'other') {
            accounts.push({ key, value, type, wallet });
          }
        }
      }

      setStoredAccounts(accounts);
    }
  }, [connected]);

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

  const getTypeLabel = (type: StoredAccount['type']) => {
    switch (type) {
      case 'token_account':
        return 'Confidential Token Account';
      case 'business':
        return 'Business Entry Index';
      default:
        return 'Other';
    }
  };

  const getTypeColor = (type: StoredAccount['type']) => {
    switch (type) {
      case 'token_account':
        return 'bg-green-100 text-green-700';
      case 'business':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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
            {/* UX Abstraction Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-bagel-cream to-bagel-orange/10 rounded p-6 border border-bagel-orange/20"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-bagel-orange/20 rounded flex items-center justify-center flex-shrink-0">
                  <Sparkle className="w-6 h-6 text-bagel-orange" weight="fill" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-bagel-dark mb-2">How We Simplify Privacy</h2>
                  <p className="text-sm text-gray-700 mb-4">
                    Bagel abstracts away the complexity of confidential tokens so you can focus on what matters - paying your team privately.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white/60 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-bagel-orange" />
                        <span className="text-sm font-medium text-bagel-dark">Local Account Storage</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Your confidential token accounts are stored locally in your browser. This means you don't need to remember complex addresses - we handle it automatically.
                      </p>
                    </div>

                    <div className="bg-white/60 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <LockSimple className="w-4 h-4 text-bagel-orange" />
                        <span className="text-sm font-medium text-bagel-dark">Automatic Encryption</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Every transfer amount is automatically encrypted using FHE before hitting the blockchain. You just enter numbers, we handle the crypto.
                      </p>
                    </div>

                    <div className="bg-white/60 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightning className="w-4 h-4 text-bagel-orange" />
                        <span className="text-sm font-medium text-bagel-dark">One-Click Minting</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Creating a confidential token account is as simple as clicking "Mint". The complex account initialization happens behind the scenes.
                      </p>
                    </div>

                    <div className="bg-white/60 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-4 h-4 text-bagel-orange" />
                        <span className="text-sm font-medium text-bagel-dark">Privacy by Default</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        All transactions use confidential tokens by default. You don't need to opt-in to privacy - it's built into every action.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Connected Wallet */}
            {connected && publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-bagel-dark flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-bagel-orange" />
                    Connected Wallet
                  </h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    Active
                  </span>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded border border-gray-200">
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
              </motion.div>
            )}

            {/* Stored Accounts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-bagel-dark flex items-center gap-2">
                  <Database className="w-5 h-5 text-bagel-orange" />
                  Local Storage Accounts
                </h3>
                <button
                  onClick={() => setShowValues(!showValues)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  {showValues ? (
                    <>
                      <EyeSlash className="w-4 h-4" />
                      Hide Values
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Show Values
                    </>
                  )}
                </button>
              </div>

              {storedAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No Bagel accounts stored locally</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Accounts will appear here after you mint tokens or register a business
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {storedAccounts.map((account) => (
                    <div
                      key={account.key}
                      className="p-4 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getTypeColor(account.type)}`}>
                              {getTypeLabel(account.type)}
                            </span>
                          </div>

                          {account.wallet && (
                            <div className="text-xs text-gray-500 mb-2">
                              For wallet: <span className="font-mono">{formatAddress(account.wallet)}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-bagel-dark">
                              {showValues ? account.value : '••••••••••••••••'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(account.value, account.key)}
                            className="p-2 hover:bg-gray-200 rounded transition-colors"
                          >
                            {copiedKey === account.key ? (
                              <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          {account.type === 'token_account' && (
                            <a
                              href={`https://orbmarkets.io/address/${account.value}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-200 rounded transition-colors"
                            >
                              <ArrowSquareOut className="w-4 h-4 text-gray-500" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Info Note */}
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <strong>Why localStorage?</strong> Confidential token accounts are unique to each user.
                    By storing them locally, we keep your account addresses private and enable seamless
                    transfers without manual address entry. Clearing browser data will require re-minting tokens.
                  </div>
                </div>
              </div>
            </motion.div>

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
                  <h4 className="font-medium text-bagel-dark mb-1">Inco Confidential Token Accounts</h4>
                  <p className="text-xs">
                    Unlike standard SPL tokens that use Associated Token Accounts (ATAs) derived from your wallet,
                    Inco confidential tokens use keypair-based accounts. This means each user needs a unique
                    token account created specifically for them.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-bagel-dark mb-1">FHE Encryption Flow</h4>
                  <p className="text-xs">
                    When you deposit or transfer tokens, the amount is encrypted client-side using Inco's FHE
                    (Fully Homomorphic Encryption). The encrypted ciphertext is then stored on-chain. Only
                    authorized parties with the decryption key can see the actual values.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-bagel-dark mb-1">Program IDs</h4>
                  <div className="mt-2 space-y-1 font-mono text-[10px] bg-gray-50 p-3 rounded">
                    <div><span className="text-gray-500">Bagel:</span> AEd52vEEAdXWUjKut1aQyLLJQnwMWqYMb4hSaHpxd8Hj</div>
                    <div><span className="text-gray-500">Inco Lightning:</span> 5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj</div>
                    <div><span className="text-gray-500">Inco Token:</span> HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22</div>
                    <div><span className="text-gray-500">USDBagel Mint:</span> 8rQ7zU5iJ8o6prw4UGUq7fVNhQaw489rdtkaK5Gh8qsV</div>
                  </div>
                </div>
              </div>
            </motion.div>
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
