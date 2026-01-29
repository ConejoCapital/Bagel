import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  House,
  Users,
  PaperPlaneTilt,
  ClockCounterClockwise,
  Vault,
  Wallet,
  ChartBar,
  MagnifyingGlass,
  Command,
  Eye,
  EyeSlash,
  LockSimple,
  ShieldCheck,
  ArrowSquareOut,
  Copy,
  CheckCircle,
  CircleNotch,
  Info,
  Warning,
  CurrencyDollar,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

// Sidebar navigation items
const navItems = [
  { icon: House, label: 'Home', href: '/dashboard' },
  { icon: Users, label: 'Employees', href: '/employees' },
  { icon: PaperPlaneTilt, label: 'Send Payment', href: '/send' },
  { icon: ClockCounterClockwise, label: 'Transaction History', href: '/history' },
  { icon: Vault, label: 'Privacy Vault', href: '/vault', active: true },
  { icon: Wallet, label: 'Wallets', href: '/wallets' },
  { icon: ChartBar, label: 'Reports', href: '/reports' },
];

// Inco Token Program ID
const INCO_TOKEN_PROGRAM_ID = process.env.NEXT_PUBLIC_INCO_TOKEN_PROGRAM_ID || 'HuUn2JwCPCLWwJ3z17m7CER73jseqsxvbcFuZN4JAw22';
const USDBAGEL_MINT = process.env.NEXT_PUBLIC_USDBAGEL_MINT || '8rQ7zU5iJ8o6prw4UGUq7fVNhQaw489rdtkaK5Gh8qsV';

interface VaultBalance {
  encrypted: string;
  decrypted: number | null;
  isDecrypting: boolean;
}

export default function PrivacyVault() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [balance, setBalance] = useState<VaultBalance>({
    encrypted: '****',
    decrypted: null,
    isDecrypting: false,
  });
  const [showBalance, setShowBalance] = useState(false);
  const [tokenAccount, setTokenAccount] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load token account from localStorage
  useEffect(() => {
    if (publicKey) {
      const savedAccount = localStorage.getItem(`userTokenAccount_${publicKey.toBase58()}`);
      setTokenAccount(savedAccount);
    } else {
      setTokenAccount(null);
    }
  }, [publicKey]);

  // Fetch balance from token account
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !tokenAccount) return;

    setLoading(true);
    setError(null);

    try {
      const tokenAccountPubkey = new PublicKey(tokenAccount);
      const accountInfo = await connection.getAccountInfo(tokenAccountPubkey);

      if (accountInfo) {
        // For demo purposes, we'll show a simulated encrypted balance
        // In production, this would be the actual FHE encrypted amount
        setBalance({
          encrypted: 'FHE:0x' + Buffer.from(accountInfo.data.slice(64, 80)).toString('hex'),
          decrypted: null,
          isDecrypting: false,
        });
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch vault balance');
    } finally {
      setLoading(false);
    }
  }, [publicKey, tokenAccount, connection]);

  useEffect(() => {
    if (connected && tokenAccount) {
      fetchBalance();
    }
  }, [connected, tokenAccount, fetchBalance]);

  // Simulate decryption (in production, this would use FHE decryption)
  const handleDecrypt = async () => {
    setBalance(prev => ({ ...prev, isDecrypting: true }));

    // Simulate decryption delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For demo, show a simulated balance
    // In production, this would decrypt the actual FHE ciphertext
    const simulatedBalance = Math.random() * 1000 + 100;
    setBalance(prev => ({
      ...prev,
      decrypted: parseFloat(simulatedBalance.toFixed(2)),
      isDecrypting: false,
    }));
    setShowBalance(true);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <Head>
        <title>Privacy Vault - Bagel</title>
        <meta name="description" content="View and manage your confidential assets" />
      </Head>

      <div className="flex h-screen bg-[#F7F7F2]">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-bagel-orange rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">🥯</span>
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-semibold text-bagel-dark">Bagel</span>
              )}
            </Link>
          </div>

          {/* Search */}
          {!sidebarCollapsed && (
            <div className="px-4 py-4">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-9 pr-12 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-200 rounded text-[10px] text-gray-500">
                  <Command className="w-3 h-3" />K
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded mb-1 transition-colors ${
                  item.active
                    ? 'bg-bagel-orange/10 text-bagel-orange'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-bagel-dark'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" weight={item.active ? 'fill' : 'regular'} />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            ))}
          </nav>

          {/* Wallet Button */}
          <div className="p-4 border-t border-gray-100">
            <WalletButton />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-semibold text-bagel-dark">Privacy Vault</h1>
              <p className="text-sm text-gray-500">View and manage your confidential assets</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchBalance}
                disabled={loading || !tokenAccount}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded font-medium text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-6">
            {!connected ? (
              <div className="bg-white rounded border border-gray-200 p-8 text-center">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-bagel-dark mb-2">Connect Your Wallet</h2>
                <p className="text-sm text-gray-600">Connect your wallet to view your privacy vault</p>
              </div>
            ) : !tokenAccount ? (
              <div className="bg-white rounded border border-gray-200 p-8 text-center">
                <Vault className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-bagel-dark mb-2">No Vault Found</h2>
                <p className="text-sm text-gray-600 mb-4">You need to mint USDBagel tokens first to create your vault</p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-bagel-orange text-white rounded text-sm font-medium"
                >
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Balance Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-bagel-cream rounded flex items-center justify-center">
                        <LockSimple className="w-6 h-6 text-bagel-orange" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-bagel-dark">Confidential Balance</h2>
                        <p className="text-sm text-gray-500">FHE-encrypted on Inco Network</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" weight="fill" />
                        Encrypted
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded p-6 mb-6">
                    <div className="text-center">
                      <div className="text-sm text-gray-500 mb-2">Your USDBagel Balance</div>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-4xl">🥯</span>
                        {balance.isDecrypting ? (
                          <div className="flex items-center gap-2">
                            <CircleNotch className="w-8 h-8 animate-spin text-bagel-orange" />
                            <span className="text-2xl font-semibold text-gray-400">Decrypting...</span>
                          </div>
                        ) : showBalance && balance.decrypted !== null ? (
                          <span className="text-4xl font-bold text-bagel-dark">
                            {balance.decrypted.toLocaleString()} <span className="text-xl text-gray-500">USDBagel</span>
                          </span>
                        ) : (
                          <span className="text-4xl font-bold text-gray-400">****.**</span>
                        )}
                      </div>
                      {!showBalance && (
                        <p className="text-xs text-gray-500 mt-2">Balance is encrypted - click below to decrypt</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        if (showBalance) {
                          setShowBalance(false);
                          setBalance(prev => ({ ...prev, decrypted: null }));
                        } else {
                          handleDecrypt();
                        }
                      }}
                      disabled={balance.isDecrypting}
                      className="flex-1 px-4 py-3 bg-bagel-orange text-white rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {showBalance ? (
                        <>
                          <EyeSlash className="w-4 h-4" />
                          Hide Balance
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Decrypt & View Balance
                        </>
                      )}
                    </motion.button>
                    <Link
                      href="/send"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <PaperPlaneTilt className="w-4 h-4" />
                      Send Transfer
                    </Link>
                  </div>
                </motion.div>

                {/* Token Account Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded border border-gray-200 p-6"
                >
                  <h3 className="text-lg font-semibold text-bagel-dark mb-4">Vault Details</h3>

                  <div className="space-y-4">
                    {/* Token Account */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bagel-orange/10 rounded flex items-center justify-center">
                          <Vault className="w-5 h-5 text-bagel-orange" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-bagel-dark">Token Account</div>
                          <div className="text-xs text-gray-500 font-mono">{formatAddress(tokenAccount)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(tokenAccount, 'token')}
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          {copiedKey === 'token' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <a
                          href={`https://orbmarkets.io/address/${tokenAccount}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          <ArrowSquareOut className="w-4 h-4 text-gray-500" />
                        </a>
                      </div>
                    </div>

                    {/* Mint */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bagel-orange/10 rounded flex items-center justify-center">
                          <CurrencyDollar className="w-5 h-5 text-bagel-orange" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-bagel-dark">Token Mint</div>
                          <div className="text-xs text-gray-500 font-mono">{formatAddress(USDBAGEL_MINT)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(USDBAGEL_MINT, 'mint')}
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          {copiedKey === 'mint' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <a
                          href={`https://orbmarkets.io/address/${USDBAGEL_MINT}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          <ArrowSquareOut className="w-4 h-4 text-gray-500" />
                        </a>
                      </div>
                    </div>

                    {/* Program */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bagel-orange/10 rounded flex items-center justify-center">
                          <LockSimple className="w-5 h-5 text-bagel-orange" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-bagel-dark">Inco Token Program</div>
                          <div className="text-xs text-gray-500 font-mono">{formatAddress(INCO_TOKEN_PROGRAM_ID)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(INCO_TOKEN_PROGRAM_ID, 'program')}
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          {copiedKey === 'program' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <a
                          href={`https://orbmarkets.io/address/${INCO_TOKEN_PROGRAM_ID}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                        >
                          <ArrowSquareOut className="w-4 h-4 text-gray-500" />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Info Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-bagel-cream/50 rounded p-5 border border-bagel-orange/20"
                >
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-bagel-orange flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-bagel-dark mb-2">How Privacy Vault Works</h3>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>Your balance is encrypted using Fully Homomorphic Encryption (FHE)</li>
                        <li>On-chain, only encrypted ciphertext is visible - no one can see your actual balance</li>
                        <li>Only you can decrypt and view your true balance using your wallet</li>
                        <li>Transfers are also encrypted - recipients only see what you send them</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* Error Display */}
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded">
                    <Warning className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <div className="text-sm font-medium text-red-800">Error</div>
                      <div className="text-xs text-red-700">{error}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
