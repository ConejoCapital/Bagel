import { useState, useEffect } from 'react';
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
  TrendUp,
  TrendDown,
  CalendarBlank,
  CurrencyDollar,
  ShieldCheck,
  ArrowRight,
  Export,
  CaretDown,
} from '@phosphor-icons/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTransactions } from '../hooks/useTransactions';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

// Sidebar navigation items
const navItems = [
  { icon: House, label: 'Home', href: '/dashboard' },
  { icon: Users, label: 'Employees', href: '/employees' },
  { icon: PaperPlaneTilt, label: 'Send Payment', href: '/send' },
  { icon: ClockCounterClockwise, label: 'Transaction History', href: '/history' },
  { icon: Vault, label: 'Privacy Vault', href: '/vault' },
  { icon: Wallet, label: 'Wallets', href: '/wallets' },
  { icon: ChartBar, label: 'Reports', href: '/reports', active: true },
];

// Employee interface
interface Employee {
  id: number;
  name: string;
  salary: number;
  currency: string;
  paymentFrequency: 'Monthly' | 'Bi-weekly' | 'Weekly';
  status: 'Active' | 'Inactive';
}

const EMPLOYEES_STORAGE_KEY = 'bagel_employees';

export default function Reports() {
  const { publicKey, connected } = useWallet();
  const { transactions, stats } = useTransactions(50);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Load employees from localStorage
  useEffect(() => {
    if (publicKey) {
      const storageKey = `${EMPLOYEES_STORAGE_KEY}_${publicKey.toBase58()}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setEmployees(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse employees:', e);
        }
      }
    }
  }, [publicKey]);

  // Calculate payroll stats
  const activeEmployees = employees.filter(e => e.status === 'Active');
  const monthlyPayroll = activeEmployees.reduce((sum, emp) => {
    let monthly = emp.salary;
    if (emp.paymentFrequency === 'Bi-weekly') monthly = emp.salary * 2;
    if (emp.paymentFrequency === 'Weekly') monthly = emp.salary * 4;
    return sum + monthly;
  }, 0);
  const annualPayroll = monthlyPayroll * 12;

  // Calculate transaction stats
  const outgoingTransactions = transactions.filter(tx => tx.direction === 'out');
  const incomingTransactions = transactions.filter(tx => tx.direction === 'in');
  const totalOutgoing = outgoingTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalIncoming = incomingTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Mock data for charts (in production, calculate from actual data)
  const monthlyData = [
    { month: 'Aug', amount: 45000 },
    { month: 'Sep', amount: 52000 },
    { month: 'Oct', amount: 48000 },
    { month: 'Nov', amount: 61000 },
    { month: 'Dec', amount: 55000 },
    { month: 'Jan', amount: monthlyPayroll || 58000 },
  ];

  const departmentBreakdown = [
    { name: 'Engineering', amount: 45000, percent: 45 },
    { name: 'Product', amount: 25000, percent: 25 },
    { name: 'Design', amount: 15000, percent: 15 },
    { name: 'Marketing', amount: 10000, percent: 10 },
    { name: 'Other', amount: 5000, percent: 5 },
  ];

  return (
    <>
      <Head>
        <title>Reports - Bagel</title>
        <meta name="description" content="Payroll reports and analytics" />
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
              <h1 className="text-xl font-semibold text-bagel-dark">Reports</h1>
              <p className="text-sm text-gray-500">Payroll analytics and insights</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                  className="appearance-none px-4 py-2 pr-8 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange cursor-pointer"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
                <CaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 bg-bagel-orange text-white rounded font-medium text-sm"
              >
                <Export className="w-4 h-4" />
                Export
              </motion.button>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-6">
            {!connected ? (
              <div className="bg-white rounded border border-gray-200 p-8 text-center">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-bagel-dark mb-2">Connect Your Wallet</h2>
                <p className="text-sm text-gray-600">Connect your wallet to view reports</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    {
                      icon: CurrencyDollar,
                      value: `$${monthlyPayroll.toLocaleString()}`,
                      label: 'Monthly Payroll',
                      change: '+12%',
                      trend: 'up',
                    },
                    {
                      icon: Users,
                      value: activeEmployees.length.toString(),
                      label: 'Active Employees',
                      change: `${employees.length} total`,
                      trend: 'neutral',
                    },
                    {
                      icon: ChartBar,
                      value: transactions.length.toString(),
                      label: 'Transactions',
                      change: dateRange === '30d' ? 'Last 30 days' : dateRange === '7d' ? 'Last 7 days' : dateRange === '90d' ? 'Last 90 days' : 'All time',
                      trend: 'neutral',
                    },
                    {
                      icon: ShieldCheck,
                      value: `${Math.round(stats.privateTransactionPercent)}%`,
                      label: 'Private Transactions',
                      change: 'FHE encrypted',
                      trend: 'up',
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
                        {stat.trend === 'up' && (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <TrendUp className="w-3 h-3" />
                            {stat.change}
                          </span>
                        )}
                        {stat.trend === 'down' && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <TrendDown className="w-3 h-3" />
                            {stat.change}
                          </span>
                        )}
                        {stat.trend === 'neutral' && (
                          <span className="text-xs text-gray-500">{stat.change}</span>
                        )}
                      </div>
                      <div className="text-2xl font-semibold text-bagel-dark mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-500">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Payroll Trend */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border border-gray-200 rounded p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-bagel-dark">Payroll Trend</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CalendarBlank className="w-4 h-4" />
                        Last 6 months
                      </div>
                    </div>

                    {/* Simple Bar Chart */}
                    <div className="flex items-end justify-between h-48 gap-3">
                      {monthlyData.map((item, i) => (
                        <div key={item.month} className="flex-1 flex flex-col items-center">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(item.amount / Math.max(...monthlyData.map(d => d.amount))) * 100}%` }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                            className="w-full bg-bagel-orange/20 rounded-t relative group cursor-pointer hover:bg-bagel-orange/30 transition-colors"
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-bagel-dark text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              ${item.amount.toLocaleString()}
                            </div>
                          </motion.div>
                          <div className="text-xs text-gray-500 mt-2">{item.month}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Annual Projection</div>
                        <div className="text-xl font-semibold text-bagel-dark">${annualPayroll.toLocaleString()}</div>
                      </div>
                      <Link
                        href="/history"
                        className="text-sm text-bagel-orange font-medium flex items-center gap-1 hover:underline"
                      >
                        View Details <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>

                  {/* Department Breakdown */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border border-gray-200 rounded p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-bagel-dark">By Department</h3>
                      <span className="text-xs text-gray-500">Monthly breakdown</span>
                    </div>

                    <div className="space-y-4">
                      {departmentBreakdown.map((dept, i) => (
                        <motion.div
                          key={dept.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-bagel-dark">{dept.name}</span>
                            <span className="text-sm text-gray-500">${dept.amount.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${dept.percent}%` }}
                              transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                              className="h-full bg-bagel-orange rounded"
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <Link
                        href="/employees"
                        className="text-sm text-bagel-orange font-medium flex items-center gap-1 hover:underline"
                      >
                        Manage Employees <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                </div>

                {/* Recent Activity */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white border border-gray-200 rounded p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-bagel-dark">Recent Activity</h3>
                    <Link
                      href="/history"
                      className="text-sm text-bagel-orange font-medium flex items-center gap-1 hover:underline"
                    >
                      View All <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <ClockCounterClockwise className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No recent transactions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((tx, i) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + i * 0.05 }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${
                              tx.direction === 'out' ? 'bg-red-100' : 'bg-green-100'
                            }`}>
                              {tx.direction === 'out' ? (
                                <TrendDown className="w-4 h-4 text-red-600" />
                              ) : (
                                <TrendUp className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-bagel-dark">{tx.type}</div>
                              <div className="text-xs text-gray-500">{tx.date} at {tx.time}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              tx.direction === 'out' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {tx.direction === 'out' ? '-' : '+'}{tx.amount.toFixed(4)} {tx.currency}
                            </div>
                            <div className="text-xs text-gray-500">{tx.wallet}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-bagel-cream/50 border border-bagel-orange/20 rounded p-5"
                  >
                    <div className="text-sm text-gray-600 mb-1">Total Outgoing</div>
                    <div className="text-2xl font-semibold text-bagel-dark">{totalOutgoing.toFixed(4)} SOL</div>
                    <div className="text-xs text-gray-500 mt-1">{outgoingTransactions.length} transactions</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="bg-green-50 border border-green-100 rounded p-5"
                  >
                    <div className="text-sm text-gray-600 mb-1">Total Incoming</div>
                    <div className="text-2xl font-semibold text-bagel-dark">{totalIncoming.toFixed(4)} SOL</div>
                    <div className="text-xs text-gray-500 mt-1">{incomingTransactions.length} transactions</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white border border-gray-200 rounded p-5"
                  >
                    <div className="text-sm text-gray-600 mb-1">Net Flow</div>
                    <div className={`text-2xl font-semibold ${
                      totalIncoming - totalOutgoing >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {totalIncoming - totalOutgoing >= 0 ? '+' : ''}{(totalIncoming - totalOutgoing).toFixed(4)} SOL
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Current period</div>
                  </motion.div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
