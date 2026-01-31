import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  House,
  Users,
  PaperPlaneTilt,
  ClockCounterClockwise,
  Wallet,
  ChartBar,
  MagnifyingGlass,
  Command,
  TrendUp,
  TrendDown,
  CurrencyDollar,
  ShieldCheck,
  ArrowRight,
  LockSimple,
  Lightning,
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
  { icon: PaperPlaneTilt, label: 'Send Payment', href: '/dashboard?transfer=true' },
  { icon: ClockCounterClockwise, label: 'Transaction History', href: '/history' },
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
  const { transactions, loading: txLoading } = useTransactions(100);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

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

  // Group transactions by month for trend chart
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { month: string; outgoing: number; incoming: number; count: number }> = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      months[key] = { month: monthName, outgoing: 0, incoming: 0, count: 0 };
    }

    // Fill with transaction data
    transactions.forEach(tx => {
      const d = new Date(tx.timestamp * 1000);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (months[key]) {
        months[key].count++;
        if (tx.direction === 'out') {
          months[key].outgoing += tx.amount;
        } else {
          months[key].incoming += tx.amount;
        }
      }
    });

    return Object.values(months);
  }, [transactions]);

  // Group transactions by type
  const transactionsByType = useMemo(() => {
    const types: Record<string, { count: number; amount: number }> = {};

    transactions.forEach(tx => {
      const type = tx.type || 'Other';
      if (!types[type]) {
        types[type] = { count: 0, amount: 0 };
      }
      types[type].count++;
      types[type].amount += tx.amount;
    });

    return Object.entries(types)
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount,
        percent: transactions.length > 0 ? Math.round((data.count / transactions.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [transactions]);

  // Employee salary breakdown
  const employeeBreakdown = useMemo(() => {
    return activeEmployees
      .map(emp => ({
        name: emp.name,
        salary: emp.salary,
        frequency: emp.paymentFrequency,
        monthly: emp.paymentFrequency === 'Weekly' ? emp.salary * 4 :
                 emp.paymentFrequency === 'Bi-weekly' ? emp.salary * 2 : emp.salary,
      }))
      .sort((a, b) => b.monthly - a.monthly);
  }, [activeEmployees]);

  const maxMonthlyAmount = Math.max(...monthlyTrend.map(d => Math.max(d.outgoing, d.incoming)), 0.001);

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
              <p className="text-sm text-gray-500">Analytics and insights</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <LockSimple className="w-4 h-4 text-bagel-orange" />
              All amounts encrypted via FHE
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
                      sub: `${activeEmployees.length} active employee${activeEmployees.length !== 1 ? 's' : ''}`,
                    },
                    {
                      icon: Users,
                      value: employees.length.toString(),
                      label: 'Total Employees',
                      sub: `${activeEmployees.length} active`,
                    },
                    {
                      icon: Lightning,
                      value: transactions.length.toString(),
                      label: 'Transactions',
                      sub: txLoading ? 'Loading...' : 'From Helius',
                    },
                    {
                      icon: ShieldCheck,
                      value: '100%',
                      label: 'FHE Encrypted',
                      sub: 'Inco confidential',
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
                        <span className="text-xs text-gray-500">{stat.sub}</span>
                      </div>
                      <div className="text-2xl font-semibold text-bagel-dark mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-500">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Transaction Trend */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border border-gray-200 rounded p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-bagel-dark">Transaction Activity</h3>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-400 rounded" />
                          <span className="text-gray-500">Outgoing</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-400 rounded" />
                          <span className="text-gray-500">Incoming</span>
                        </div>
                      </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="flex items-end justify-between h-40 gap-2">
                      {monthlyTrend.map((item, i) => (
                        <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex gap-0.5 items-end h-32">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(item.outgoing / maxMonthlyAmount) * 100}%` }}
                              transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                              className="flex-1 bg-red-400/60 rounded-t min-h-[2px]"
                              title={`Out: ${item.outgoing.toFixed(4)} SOL`}
                            />
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(item.incoming / maxMonthlyAmount) * 100}%` }}
                              transition={{ delay: 0.35 + i * 0.05, duration: 0.4 }}
                              className="flex-1 bg-green-400/60 rounded-t min-h-[2px]"
                              title={`In: ${item.incoming.toFixed(4)} SOL`}
                            />
                          </div>
                          <div className="text-xs text-gray-500">{item.month}</div>
                          <div className="text-[10px] text-gray-400">{item.count} tx</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Annual Payroll Projection</div>
                        <div className="text-xl font-semibold text-bagel-dark">${annualPayroll.toLocaleString()}</div>
                      </div>
                      <Link
                        href="/history"
                        className="text-sm text-bagel-orange font-medium flex items-center gap-1 hover:underline"
                      >
                        View History <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>

                  {/* Transaction Types or Employee Breakdown */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white border border-gray-200 rounded p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-bagel-dark">
                        {employeeBreakdown.length > 0 ? 'Employee Salaries' : 'Transaction Types'}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {employeeBreakdown.length > 0 ? 'Monthly breakdown' : 'By category'}
                      </span>
                    </div>

                    {employeeBreakdown.length > 0 ? (
                      <div className="space-y-4">
                        {employeeBreakdown.slice(0, 5).map((emp, i) => (
                          <motion.div
                            key={emp.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-bagel-dark">{emp.name}</span>
                              <span className="text-sm text-gray-500">${emp.monthly.toLocaleString()}/mo</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${monthlyPayroll > 0 ? (emp.monthly / monthlyPayroll) * 100 : 0}%` }}
                                transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                                className="h-full bg-bagel-orange rounded"
                              />
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{emp.frequency}</div>
                          </motion.div>
                        ))}
                      </div>
                    ) : transactionsByType.length > 0 ? (
                      <div className="space-y-4">
                        {transactionsByType.map((type, i) => (
                          <motion.div
                            key={type.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-bagel-dark truncate max-w-[150px]">{type.name}</span>
                              <span className="text-sm text-gray-500">{type.count} tx</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${type.percent}%` }}
                                transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                                className="h-full bg-bagel-orange rounded"
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No data yet. Add employees or make transactions.
                      </div>
                    )}

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
                    <div className="text-xs text-gray-500 mt-1">Based on {transactions.length} transactions</div>
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
