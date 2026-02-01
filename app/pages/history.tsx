import { useState } from 'react';
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
  Bell,
  Shield,
  ShieldCheck,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Command,
  CalendarBlank,
  Clock,
  Export,
  SpinnerGap,
  WarningCircle,
} from '@phosphor-icons/react';
import { useWallet } from '@solana/wallet-adapter-react';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

import { PayrollChart } from '@/components/ui/payroll-chart';
import { CryptoDistributionChart } from '@/components/ui/crypto-distribution-chart';
import { useTransactions } from '@/hooks/useTransactions';
import { formatBalance } from '@/lib/format';

// Sidebar navigation items
const navItems = [
  { icon: House, label: 'Home', href: '/dashboard' },
  { icon: Users, label: 'Employees', href: '/employees' },
  { icon: PaperPlaneTilt, label: 'Send Payment', href: '/send' },
  { icon: ClockCounterClockwise, label: 'Transaction History', href: '/history', active: true },
  { icon: Wallet, label: 'Wallets', href: '/wallets' },
  { icon: ChartBar, label: 'Reports', href: '/reports' },
];

export default function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'transfer' | 'deposit' | 'withdrawal'>('all');
  const { publicKey } = useWallet();
  const { transactions, stats, loading, error } = useTransactions(50);

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    return tx.type.toLowerCase() === filterType;
  });

  return (
    <>
      <Head>
        <title>Transaction History - Bagel</title>
        <meta name="description" content="View your transaction history" />
      </Head>

      <div className="flex h-screen bg-[#F7F7F2]">
        {/* ============================================
            SIDEBAR
        ============================================ */}
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* ============================================
            MAIN CONTENT
        ============================================ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-semibold text-bagel-dark">Transaction History</h1>
              <p className="text-sm text-gray-500">View and export your payment history</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-50 rounded border border-gray-200 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-bagel-dark rounded font-medium text-sm hover:bg-gray-50"
              >
                <Export className="w-4 h-4" />
                Export CSV
              </motion.button>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  {
                    icon: ArrowUpRight,
                    value: `${formatBalance(stats.totalOutgoing, 2)} SOL`,
                    label: 'Total Outgoing',
                    subtitle: 'Recent transactions',
                  },
                  {
                    icon: ArrowDownLeft,
                    value: `${formatBalance(stats.totalIncoming, 2)} SOL`,
                    label: 'Total Incoming',
                    subtitle: 'Recent transactions',
                  },
                  {
                    icon: ClockCounterClockwise,
                    value: formatBalance(stats.transactionCount, 0),
                    label: 'Transactions',
                    subtitle: 'Loaded',
                  },
                  {
                    icon: ShieldCheck,
                    value: `${stats.privateTransactionPercent.toFixed(1)}%`,
                    label: 'Private Transactions',
                    subtitle: 'Enhanced or Maximum',
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white border border-gray-200 rounded p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-bagel-cream rounded flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-bagel-orange" />
                      </div>
                    </div>
                    <div className="text-2xl font-semibold text-bagel-dark mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{stat.subtitle}</div>
                  </motion.div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-4">
                <PayrollChart />
                <CryptoDistributionChart />
              </div>

              {/* Transactions Table */}
              <div className="bg-white border border-gray-200 rounded">
                {/* Table Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-bagel-dark">All Transactions</h2>
                  <div className="flex items-center gap-3">
                    {/* Filter Tabs */}
                    <div className="flex items-center bg-gray-100 rounded p-1">
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'transfer', label: 'Transfers' },
                        { key: 'deposit', label: 'Deposits' },
                        { key: 'withdrawal', label: 'Withdrawals' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setFilterType(tab.key as typeof filterType)}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            filterType === tab.key
                              ? 'bg-white text-bagel-dark shadow-sm'
                              : 'text-gray-600 hover:text-bagel-dark'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange w-64"
                      />
                    </div>
                    <button className="p-2 hover:bg-gray-50 rounded border border-gray-200 transition-colors">
                      <CalendarBlank className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Table */}
                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-16">
                    <SpinnerGap className="w-8 h-8 text-bagel-orange animate-spin" />
                    <span className="ml-3 text-gray-500">Loading transactions...</span>
                  </div>
                )}

                {/* Error State */}
                {error && !loading && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <WarningCircle className="w-12 h-12 text-red-500 mb-3" />
                    <p className="text-gray-600 mb-2">Failed to load transactions</p>
                    <p className="text-sm text-gray-400">{error}</p>
                  </div>
                )}

                {/* Not Connected State */}
                {!publicKey && !loading && !error && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Wallet className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-2">Connect your wallet</p>
                    <p className="text-sm text-gray-400">Connect your wallet to view transaction history</p>
                  </div>
                )}

                {/* Table */}
                {!loading && !error && publicKey && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Recipient</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Amount</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Date & Time</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Privacy</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">TX Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : filteredTransactions.map((tx, i) => (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 + i * 0.03 }}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${
                              tx.direction === 'in' ? 'bg-green-100' : 'bg-bagel-cream'
                            }`}>
                              {tx.direction === 'in' ? (
                                <ArrowDownLeft className="w-4 h-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-bagel-orange" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-bagel-dark">{tx.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm font-medium text-bagel-dark">{tx.recipient}</div>
                            <code className="text-xs text-gray-500">{tx.wallet}</code>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`text-sm font-medium ${tx.direction === 'in' ? 'text-green-600' : 'text-bagel-dark'}`}>
                            {tx.direction === 'in' ? '+' : '-'}${formatBalance(tx.amount)}
                          </div>
                          <div className="text-xs text-gray-500">{tx.currency}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-bagel-dark">{tx.date}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {tx.time}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            tx.privacy === 'Maximum'
                              ? 'bg-green-100 text-green-700'
                              : tx.privacy === 'Enhanced'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Shield className="w-3 h-3" weight="fill" />
                            {tx.privacy}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            tx.status === 'Completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {tx.status === 'Completed' && <CheckCircle className="w-3 h-3" weight="fill" />}
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 transition-colors">
                            {tx.txHash}
                          </code>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                )}

                {/* Pagination */}
                {!loading && !error && publicKey && transactions.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      Previous
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium bg-bagel-orange text-white rounded">
                      1
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      2
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      3
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      Next
                    </button>
                  </div>
                </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
