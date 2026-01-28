import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
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
  CaretUp,
  CaretDown,
  Shield,
  ShieldCheck,
  Eye,
  EyeSlash,
  Fingerprint,
  LockKey,
  CheckCircle,
  Circle,
  Funnel,
  DotsThree,
  ArrowUpRight,
  Command,
  X,
  CaretDown as CaretDownIcon,
  CurrencyDollar,
  CalendarBlank,
  Clock,
  Lightning,
  Info,
  Warning,
  User,
  Copy,
  Plus,
  CircleNotch,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { PublicKey } from '@solana/web3.js';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  registerBusiness,
  addEmployee,
  deposit,
  getCurrentBusinessIndex,
  getCurrentEmployeeIndex,
  getBusinessEntryPDA,
  getMasterVaultPDA,
  getMasterVaultTokenAccount,
  getConfidentialTokenAccount,
  solToLamports,
  lamportsToSOL,
  BAGEL_PROGRAM_ID,
  INCO_TOKEN_PROGRAM_ID,
  USDBAGEL_MINT,
  mintTestTokens,
  initializeConfidentialTokenAccount,
  getConfidentialBalance,
} from '../lib/bagel-client';
import { PayrollChart } from '@/components/ui/payroll-chart';
import { CryptoDistributionChart } from '@/components/ui/crypto-distribution-chart';
import { useRecentTransactions } from '@/hooks/useTransactions';
import { InteractiveGuide, useGuideStatus, GuideStep } from '@/components/InteractiveGuide';

// Define guide steps targeting actual UI elements (shown after wallet connection)
const guideSteps: GuideStep[] = [
  {
    id: 'new-payment',
    target: '[data-guide="new-payment"]',
    title: 'Send Private Payments',
    description: 'Click here to send payroll to your team with complete privacy. Choose one-time or streaming payments.',
    position: 'bottom',
  },
  {
    id: 'stats',
    target: '[data-guide="stats"]',
    title: 'Track Your Stats',
    description: 'Monitor your payroll metrics at a glance - employees, total payroll, transactions, and privacy status.',
    position: 'bottom',
  },
  {
    id: 'charts',
    target: '[data-guide="charts"]',
    title: 'Analyze Your Data',
    description: 'View payroll trends and payment distribution charts to understand your spending patterns.',
    position: 'top',
  },
  {
    id: 'employees',
    target: '[data-guide="employees"]',
    title: 'Manage Employees',
    description: 'View and manage your team. Track payment status, privacy levels, and transaction history.',
    position: 'top',
  },
  {
    id: 'privacy',
    target: '[data-guide="privacy"]',
    title: 'Privacy Features',
    description: 'All privacy features are enabled by default - zero-knowledge proofs, stealth addresses, and more.',
    position: 'left',
  },
];

// Employee type definition
type Employee = typeof initialEmployees[0];

// Helper function to format relative time
function getRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// Sidebar navigation items
const navItems = [
  { icon: House, label: 'Home', href: '/dashboard', active: true },
  { icon: Users, label: 'Employees', href: '/employees' },
  { icon: PaperPlaneTilt, label: 'Send Payment', href: '/send' },
  { icon: ClockCounterClockwise, label: 'Transaction History', href: '/history' },
  { icon: Vault, label: 'Privacy Vault', href: '/vault' },
  { icon: Wallet, label: 'Wallets', href: '/wallets' },
  { icon: ChartBar, label: 'Reports', href: '/reports' },
];

// Privacy features
const privacyFeatures = [
  { icon: Fingerprint, label: 'Zero-Knowledge Proofs', enabled: true },
  { icon: EyeSlash, label: 'Stealth Addresses', enabled: true },
  { icon: LockKey, label: 'Transaction Mixing', enabled: true },
  { icon: Eye, label: 'IP Masking', enabled: true },
];

// Payment Modal Component
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (entryIndex: number, amountLamports: number) => Promise<string>;
  businessEntryIndex: number | null;
  employees: typeof initialEmployees;
}

function PaymentModal({ isOpen, onClose, onDeposit, businessEntryIndex, employees }: PaymentModalProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('SOL');
  const [paymentType, setPaymentType] = useState<'one-time' | 'streaming'>('one-time');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txid, setTxid] = useState('');

  const currencies = [
    { symbol: 'SOL', name: 'Solana', icon: '◎' },
    { symbol: 'USDC', name: 'USD Coin', icon: '$' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTxid('');

    if (businessEntryIndex === null) {
      setError('Business not registered yet. Please register your business first.');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const amountLamports = solToLamports(parseFloat(amount));
      const signature = await onDeposit(businessEntryIndex, amountLamports);
      setTxid(signature);
      // Reset form after success
      setAmount('');
      setRecipient('');
      setMemo('');
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit funds');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setTxid('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg mx-4 bg-white rounded-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-bagel-orange/10 rounded flex items-center justify-center">
                  <PaperPlaneTilt className="w-5 h-5 text-bagel-orange" weight="fill" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-bagel-dark">New Payment</h2>
                  <p className="text-sm text-gray-500">Send a private payment</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Recipient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    onFocus={() => setShowRecipientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowRecipientDropdown(false), 200)}
                    placeholder="Enter wallet address or select employee"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                  />

                  {/* Employee Dropdown */}
                  <AnimatePresence>
                    {showRecipientDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-48 overflow-auto"
                      >
                        {employees.slice(0, 4).map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setRecipient(emp.wallet);
                              setShowRecipientDropdown(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 bg-bagel-cream rounded-full flex items-center justify-center text-xs font-medium text-bagel-dark">
                              {emp.initials}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-bagel-dark">{emp.name}</div>
                              <div className="text-xs text-gray-500">{emp.wallet}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Amount & Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="appearance-none w-28 px-4 py-3 bg-gray-50 border border-gray-200 rounded text-sm font-medium focus:outline-none focus:border-bagel-orange cursor-pointer"
                    >
                      {currencies.map((c) => (
                        <option key={c.symbol} value={c.symbol}>
                          {c.icon} {c.symbol}
                        </option>
                      ))}
                    </select>
                    <CaretDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType('one-time')}
                    className={`flex items-center gap-3 p-3 border rounded transition-all ${
                      paymentType === 'one-time'
                        ? 'border-bagel-orange bg-bagel-orange/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                      paymentType === 'one-time' ? 'bg-bagel-orange/10' : 'bg-gray-100'
                    }`}>
                      <CurrencyDollar className={`w-4 h-4 ${
                        paymentType === 'one-time' ? 'text-bagel-orange' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-medium ${
                        paymentType === 'one-time' ? 'text-bagel-dark' : 'text-gray-600'
                      }`}>One-time</div>
                      <div className="text-xs text-gray-500">Single payment</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('streaming')}
                    className={`flex items-center gap-3 p-3 border rounded transition-all ${
                      paymentType === 'streaming'
                        ? 'border-bagel-orange bg-bagel-orange/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                      paymentType === 'streaming' ? 'bg-bagel-orange/10' : 'bg-gray-100'
                    }`}>
                      <Lightning className={`w-4 h-4 ${
                        paymentType === 'streaming' ? 'text-bagel-orange' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-medium ${
                        paymentType === 'streaming' ? 'text-bagel-dark' : 'text-gray-600'
                      }`}>Streaming</div>
                      <div className="text-xs text-gray-500">Per-second payroll</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Memo (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Memo <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Add a note to this payment..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20 resize-none"
                />
              </div>

              {/* Privacy Notice */}
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded">
                <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" weight="fill" />
                <div>
                  <div className="text-sm font-medium text-green-800">Privacy Protected</div>
                  <div className="text-xs text-green-700">
                    This transaction will be processed with maximum privacy. Amount and recipient will be hidden on-chain.
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded">
                  <Warning className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" weight="fill" />
                  <div>
                    <div className="text-sm font-medium text-red-800">Error</div>
                    <div className="text-xs text-red-700">{error}</div>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {txid && (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" weight="fill" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-green-800">Deposit Successful!</div>
                    <div className="text-xs text-green-700 break-all mt-1">{txid}</div>
                    <a
                      href={`https://explorer.solana.com/tx/${txid}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 mt-2 font-medium"
                    >
                      View on Explorer <ArrowSquareOut className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  {txid ? 'Close' : 'Cancel'}
                </button>
                {!txid && (
                  <motion.button
                    type="submit"
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    disabled={loading || businessEntryIndex === null}
                    className="flex-1 px-4 py-3 bg-bagel-orange text-white rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <CircleNotch className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                        Deposit Funds
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Add Employee Modal Component
interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (walletAddress: string, salaryPerSecond: number) => Promise<{ txid: string; employeeIndex: number }>;
  businessEntryIndex: number | null;
}

function AddEmployeeModal({ isOpen, onClose, onAddEmployee, businessEntryIndex }: AddEmployeeModalProps) {
  const [name, setName] = useState('');
  const [wallet, setWallet] = useState('');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('SOL');
  const [paymentFrequency, setPaymentFrequency] = useState<'monthly' | 'bi-weekly' | 'weekly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txid, setTxid] = useState('');
  const [employeeIndex, setEmployeeIndex] = useState<number | null>(null);

  const currencies = [
    { symbol: 'SOL', name: 'Solana', icon: '◎' },
    { symbol: 'USDC', name: 'USD Coin', icon: '$' },
  ];

  // Convert salary to per-second rate based on frequency
  const calculateSalaryPerSecond = (monthlySalary: number, frequency: string): number => {
    let annualSalary: number;
    switch (frequency) {
      case 'weekly':
        annualSalary = monthlySalary * 52;
        break;
      case 'bi-weekly':
        annualSalary = monthlySalary * 26;
        break;
      default: // monthly
        annualSalary = monthlySalary * 12;
    }
    // Seconds in a year: 365.25 * 24 * 60 * 60 = 31,557,600
    return annualSalary / 31557600;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTxid('');

    if (businessEntryIndex === null) {
      setError('Business not registered yet. Please register your business first.');
      return;
    }

    if (!wallet) {
      setError('Please enter a wallet address');
      return;
    }

    if (!salary || parseFloat(salary) <= 0) {
      setError('Please enter a valid salary amount');
      return;
    }

    // Validate wallet address
    try {
      new PublicKey(wallet);
    } catch {
      setError('Invalid Solana wallet address');
      return;
    }

    try {
      setLoading(true);
      const salaryPerSecond = calculateSalaryPerSecond(parseFloat(salary), paymentFrequency);
      const salaryLamports = solToLamports(salaryPerSecond);

      const result = await onAddEmployee(wallet, salaryLamports);
      setTxid(result.txid);
      setEmployeeIndex(result.employeeIndex);
    } catch (err: any) {
      console.error('Add employee error:', err);
      setError(err.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setTxid('');
    setEmployeeIndex(null);
    if (txid) {
      // Reset form only on successful add
      setName('');
      setWallet('');
      setSalary('');
      setCurrency('SOL');
      setPaymentFrequency('monthly');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg mx-4 bg-white rounded-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-bagel-orange/10 rounded flex items-center justify-center">
                  <Users className="w-5 h-5 text-bagel-orange" weight="fill" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-bagel-dark">Add Employee</h2>
                  <p className="text-sm text-gray-500">Set up payroll for a new team member</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Employee Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter employee name"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                  />
                </div>
              </div>

              {/* Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    placeholder="Enter Solana wallet address"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                  />
                </div>
              </div>

              {/* Salary & Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salary Amount
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="appearance-none w-28 px-4 py-3 bg-gray-50 border border-gray-200 rounded text-sm font-medium focus:outline-none focus:border-bagel-orange cursor-pointer"
                    >
                      {currencies.map((c) => (
                        <option key={c.symbol} value={c.symbol}>
                          {c.icon} {c.symbol}
                        </option>
                      ))}
                    </select>
                    <CaretDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Payment Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Frequency
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'bi-weekly', label: 'Bi-weekly' },
                    { value: 'weekly', label: 'Weekly' },
                  ].map((freq) => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() => setPaymentFrequency(freq.value as typeof paymentFrequency)}
                      className={`flex items-center justify-center gap-2 p-3 border rounded transition-all ${
                        paymentFrequency === freq.value
                          ? 'border-bagel-orange bg-bagel-orange/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CalendarBlank className={`w-4 h-4 ${
                        paymentFrequency === freq.value ? 'text-bagel-orange' : 'text-gray-500'
                      }`} />
                      <span className={`text-sm font-medium ${
                        paymentFrequency === freq.value ? 'text-bagel-dark' : 'text-gray-600'
                      }`}>{freq.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded">
                <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" weight="fill" />
                <div>
                  <div className="text-sm font-medium text-green-800">Privacy Protected</div>
                  <div className="text-xs text-green-700">
                    All payroll transactions for this employee will be processed with maximum privacy.
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded">
                  <Warning className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" weight="fill" />
                  <div>
                    <div className="text-sm font-medium text-red-800">Error</div>
                    <div className="text-xs text-red-700">{error}</div>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {txid && (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" weight="fill" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-green-800">Employee Added Successfully!</div>
                    <div className="text-xs text-green-700 mt-1">
                      Employee Index: <span className="font-mono">{employeeIndex}</span>
                    </div>
                    <div className="text-xs text-green-700 break-all mt-1">{txid}</div>
                    <a
                      href={`https://explorer.solana.com/tx/${txid}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 mt-2 font-medium"
                    >
                      View on Explorer <ArrowSquareOut className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  {txid ? 'Close' : 'Cancel'}
                </button>
                {!txid && (
                  <motion.button
                    type="submit"
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    disabled={loading || businessEntryIndex === null}
                    className="flex-1 px-4 py-3 bg-bagel-orange text-white rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <CircleNotch className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" weight="fill" />
                        Add Employee
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Mint Tokens Section Component
interface MintTokensSectionProps {
  onMint: (amount: number) => Promise<{ txid: string; amount: number }>;
}

function MintTokensSection({ onMint }: MintTokensSectionProps) {
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txid, setTxid] = useState('');
  const [mintedAmount, setMintedAmount] = useState(0);

  const presetAmounts = [10, 50, 100, 500, 1000];

  const handleMint = async () => {
    setError('');
    setTxid('');

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const result = await onMint(amountNum);
      setTxid(result.txid);
      setMintedAmount(result.amount);
    } catch (err: any) {
      console.error('Mint error:', err);
      setError(err.message || 'Failed to mint tokens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <Lightning className="w-5 h-5 text-purple-600" weight="fill" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-purple-900">Mint Test Tokens</h3>
          <p className="text-xs text-purple-600">Get USDBagel tokens to try the demo</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-purple-800 mb-2">
            Amount (USDBagel)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              className="w-full px-4 py-3 border border-purple-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-mono"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 font-medium">
              USDB
            </div>
          </div>
        </div>

        {/* Preset Amounts */}
        <div className="flex flex-wrap gap-2">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                amount === preset.toString()
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-purple-200 text-purple-700 hover:border-purple-400'
              }`}
            >
              {preset} USDB
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-purple-100/50 rounded text-xs text-purple-700">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Demo Mode:</strong> These are test tokens on Solana Devnet.
            The amount is encrypted on-chain using Inco FHE (Fully Homomorphic Encryption).
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded">
            <Warning className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" weight="fill" />
            <div>
              <div className="text-sm font-medium text-red-800">Error</div>
              <div className="text-xs text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* Success Display */}
        {txid && (
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" weight="fill" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-800">
                {mintedAmount} USDBagel Minted!
              </div>
              <div className="text-xs text-green-700 break-all mt-1">{txid}</div>
              <a
                href={`https://explorer.solana.com/tx/${txid}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 mt-2 font-medium"
              >
                View on Explorer <ArrowSquareOut className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Mint Button */}
        <motion.button
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          onClick={handleMint}
          disabled={loading}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
        >
          {loading ? (
            <>
              <CircleNotch className="w-5 h-5 animate-spin" />
              Minting...
            </>
          ) : (
            <>
              <Lightning className="w-5 h-5" weight="fill" />
              Mint {amount || '0'} USDBagel
            </>
          )}
        </motion.button>

        {/* Program Info */}
        <div className="pt-2 border-t border-purple-100 mt-4">
          <div className="text-[10px] font-mono text-purple-500 space-y-1">
            <div>Inco Token: {INCO_TOKEN_PROGRAM_ID.toBase58().slice(0, 20)}...</div>
            <div>USDBagel Mint: {USDBAGEL_MINT.toBase58().slice(0, 20)}...</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Initial mock employees (will be replaced/augmented with on-chain data)
const initialEmployees = [
  {
    id: 1,
    initials: 'AT',
    name: 'Alex Thompson',
    date: 'Jan 15, 2026',
    wallet: '0x7a23...f8d9',
    amount: 8500.00,
    currency: 'SOL',
    privacy: 'Maximum',
    status: 'Paid',
  },
  {
    id: 2,
    initials: 'SC',
    name: 'Sarah Chen',
    date: 'Jan 14, 2026',
    wallet: '0x3b91...c4e2',
    amount: 12750.00,
    currency: 'USDC',
    privacy: 'Standard',
    status: 'Pending',
  },
  {
    id: 3,
    initials: 'MR',
    name: 'Michael Ross',
    date: 'Jan 15, 2026',
    wallet: '0x9f56...a7b3',
    amount: 6200.00,
    currency: 'SOL',
    privacy: 'Maximum',
    status: 'Paid',
  },
  {
    id: 4,
    initials: 'EW',
    name: 'Emma Wilson',
    date: 'Jan 13, 2026',
    wallet: '0x2c84...d1f5',
    amount: 9100.00,
    currency: 'USDC',
    privacy: 'Enhanced',
    status: 'Processing',
  },
  {
    id: 5,
    initials: 'JK',
    name: 'James Kim',
    date: 'Jan 12, 2026',
    wallet: '0x5d92...e3a1',
    amount: 7800.00,
    currency: 'SOL',
    privacy: 'Maximum',
    status: 'Paid',
  },
];

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { transactions: recentTransactions, loading: txLoading } = useRecentTransactions(5);
  const { hasCompleted: hasCompletedGuide } = useGuideStatus();
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [hasShownGuide, setHasShownGuide] = useState(false);

  // Business state
  const [businessEntryIndex, setBusinessEntryIndex] = useState<number | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [registrationTxid, setRegistrationTxid] = useState('');

  // Employees state (combines mock + on-chain)
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [employeeCount, setEmployeeCount] = useState(0);

  // Load business index when wallet connects
  useEffect(() => {
    if (publicKey && connection) {
      loadBusinessIndex();
    } else {
      setBusinessEntryIndex(null);
    }
  }, [publicKey, connection]);

  const loadBusinessIndex = async () => {
    if (!publicKey) return;
    try {
      const index = await getCurrentBusinessIndex(connection);
      // The current index is the NEXT available, so we check if there's a business at index - 1
      if (index > 0) {
        // Try to verify this business belongs to current wallet
        // For now, we assume if there's any business, the user might own one
        setBusinessEntryIndex(index - 1);
      } else {
        setBusinessEntryIndex(null);
      }
    } catch (err) {
      console.log('No business registered yet or vault not initialized');
      setBusinessEntryIndex(null);
    }
  };

  // Register business
  const handleRegisterBusiness = async () => {
    if (!publicKey || !wallet.signTransaction) {
      setRegistrationError('Please connect your wallet');
      return;
    }

    try {
      setIsRegistering(true);
      setRegistrationError('');
      setRegistrationTxid('');

      console.log('📝 Registering business on-chain...');
      const result = await registerBusiness(connection, wallet);

      setBusinessEntryIndex(result.entryIndex);
      setRegistrationTxid(result.txid);
      console.log('✅ Business registered! Entry index:', result.entryIndex);
    } catch (err: any) {
      console.error('Registration error:', err);
      setRegistrationError(err.message || 'Failed to register business');
    } finally {
      setIsRegistering(false);
    }
  };

  // Deposit funds (confidential token transfer)
  const handleDeposit = useCallback(async (entryIndex: number, amountLamports: number): Promise<string> => {
    if (!publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    console.log('💰 Depositing funds via confidential transfer...');

    // Get confidential token accounts
    const [depositorTokenAccount] = getConfidentialTokenAccount(publicKey, USDBAGEL_MINT);
    const [vaultTokenAccount] = getMasterVaultTokenAccount();

    console.log('   Depositor Token Account:', depositorTokenAccount.toBase58());
    console.log('   Vault Token Account:', vaultTokenAccount.toBase58());

    const signature = await deposit(
      connection,
      wallet,
      entryIndex,
      amountLamports,
      depositorTokenAccount,
      vaultTokenAccount
    );
    console.log('✅ Confidential deposit successful:', signature);
    return signature;
  }, [connection, wallet, publicKey]);

  // Add employee
  const handleAddEmployee = useCallback(async (walletAddress: string, salaryLamports: number): Promise<{ txid: string; employeeIndex: number }> => {
    if (!publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    if (businessEntryIndex === null) {
      throw new Error('Business not registered');
    }

    console.log('👷 Adding employee on-chain...');
    const result = await addEmployee(
      connection,
      wallet,
      businessEntryIndex,
      new PublicKey(walletAddress),
      salaryLamports
    );

    console.log('✅ Employee added! Index:', result.employeeIndex);

    // Add to local employees list
    const newEmployee: Employee = {
      id: employees.length + 1,
      initials: walletAddress.slice(0, 2).toUpperCase(),
      name: `Employee ${result.employeeIndex}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      wallet: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      amount: lamportsToSOL(salaryLamports) * 31557600, // Annual salary
      currency: 'SOL',
      privacy: 'Maximum',
      status: 'Pending',
    };
    setEmployees(prev => [newEmployee, ...prev]);
    setEmployeeCount(prev => prev + 1);

    return result;
  }, [connection, wallet, publicKey, businessEntryIndex, employees.length]);

  // Mint test tokens
  const handleMint = useCallback(async (amount: number): Promise<{ txid: string; amount: number }> => {
    if (!publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    console.log('🪙 Minting test tokens...');
    const result = await mintTestTokens(connection, wallet, amount);
    console.log('✅ Tokens minted:', result.amount, 'USDBagel');
    return { txid: result.txid, amount: result.amount };
  }, [connection, wallet, publicKey]);

  // Auto-open guide after wallet connection (only once per session if not completed)
  useEffect(() => {
    if (connected && !hasCompletedGuide && !hasShownGuide) {
      const timer = setTimeout(() => {
        setIsGuideOpen(true);
        setHasShownGuide(true);
      }, 800); // Delay to let the page settle after wallet connection
      return () => clearTimeout(timer);
    }
  }, [connected, hasCompletedGuide, hasShownGuide]);

  return (
    <>
      <Head>
        <title>Dashboard - Bagel</title>
        <meta name="description" content="Manage your private payroll operations" />
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
          <div className="p-4 border-t border-gray-100" data-guide="wallet-button">
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
              <h1 className="text-xl font-semibold text-bagel-dark">Dashboard</h1>
              <p className="text-sm text-gray-500">Manage your private payroll operations</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsGuideOpen(true)}
                className="relative p-2 hover:bg-gray-50 rounded border border-gray-200 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {/* Notification badge for first-time users */}
                {!hasCompletedGuide && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 300 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-bagel-orange rounded-full"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-bagel-orange rounded-full"
                    />
                  </motion.span>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-bagel-orange text-white rounded font-medium text-sm"
                data-guide="new-payment"
              >
                <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                New Payment
              </motion.button>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-6">
            <div className="flex gap-6">
              {/* Left Column - Stats & Table */}
              <div className="flex-1 space-y-6">
                {/* Business Registration Banner */}
                {connected && businessEntryIndex === null && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-bagel-orange/10 to-bagel-yellow/10 border border-bagel-orange/20 rounded p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-bagel-dark flex items-center gap-2">
                          <span className="text-2xl">🥯</span> Register Your Business
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Register your business on-chain to start managing payroll with maximum privacy.
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          Program: <code className="bg-white px-1.5 py-0.5 rounded">{BAGEL_PROGRAM_ID.toBase58().slice(0, 8)}...</code>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRegisterBusiness}
                        disabled={isRegistering}
                        className="px-6 py-3 bg-bagel-orange text-white rounded font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {isRegistering ? (
                          <>
                            <CircleNotch className="w-4 h-4 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          <>
                            <Vault className="w-4 h-4" weight="fill" />
                            Register Business
                          </>
                        )}
                      </motion.button>
                    </div>
                    {registrationError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded text-sm text-red-700">
                        {registrationError}
                      </div>
                    )}
                    {registrationTxid && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded">
                        <div className="text-sm text-green-700 font-medium">Business Registered Successfully!</div>
                        <div className="text-xs text-green-600 mt-1 break-all">{registrationTxid}</div>
                        <a
                          href={`https://explorer.solana.com/tx/${registrationTxid}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 mt-2 font-medium"
                        >
                          View on Explorer <ArrowSquareOut className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Registered Business Info */}
                {connected && businessEntryIndex !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-100 rounded p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" weight="fill" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-green-800">Business Registered</div>
                        <div className="text-xs text-green-600">
                          Entry Index: <code className="bg-white px-1.5 py-0.5 rounded">{businessEntryIndex}</code>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-green-600">
                      Connected: <code className="bg-white px-1.5 py-0.5 rounded">{publicKey?.toBase58().slice(0, 8)}...</code>
                    </div>
                  </motion.div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4" data-guide="stats">
                  {[
                    {
                      icon: Users,
                      value: connected ? `${employees.length}` : '--',
                      label: 'Total Employees',
                      change: employeeCount > 0 ? `+${employeeCount}` : undefined,
                      positive: true,
                    },
                    {
                      icon: Wallet,
                      value: connected ? `$${employees.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}` : '--',
                      label: 'Annual Payroll',
                      change: connected ? '+8.2%' : undefined,
                      positive: true,
                    },
                    {
                      icon: ChartBar,
                      value: connected ? `${recentTransactions.length}` : '--',
                      label: 'Transactions',
                      change: recentTransactions.length > 0 ? `+${recentTransactions.length}` : undefined,
                      positive: true,
                    },
                    {
                      icon: ShieldCheck,
                      value: connected ? '100%' : '--',
                      label: 'Privacy Score',
                      badge: connected ? 'Maximum' : undefined,
                      positive: true,
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
                        {stat.change && (
                          <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.positive ? 'text-green-600' : 'text-red-500'}`}>
                            {stat.change}
                            <ArrowUpRight className="w-3 h-3" />
                          </div>
                        )}
                        {stat.badge && (
                          <span className="text-xs font-medium text-green-600">{stat.badge} ↗</span>
                        )}
                      </div>
                      <div className="text-2xl font-semibold text-bagel-dark mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-500">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-2 gap-4" data-guide="charts">
                  <PayrollChart />
                  <CryptoDistributionChart />
                </div>

                {/* Employees Table */}
                <div className="bg-white border border-gray-200 rounded" data-guide="employees">
                  {/* Table Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-bagel-dark">Employees</h2>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsAddEmployeeModalOpen(true)}
                        className="w-7 h-7 bg-bagel-orange text-white rounded flex items-center justify-center hover:bg-bagel-orange/90 transition-colors"
                        title="Add Employee"
                      >
                        <Plus className="w-4 h-4" weight="bold" />
                      </motion.button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search employees..."
                          className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange w-64"
                        />
                      </div>
                      <button className="p-2 hover:bg-gray-50 rounded border border-gray-200 transition-colors">
                        <Funnel className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Employee</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Wallet</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Amount</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Privacy</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee, i) => (
                        <motion.tr
                          key={employee.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-bagel-cream rounded-full flex items-center justify-center text-sm font-medium text-bagel-dark">
                                {employee.initials}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-bagel-dark">{employee.name}</div>
                                <div className="text-xs text-gray-500">{employee.date}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{employee.wallet}</code>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-bagel-dark">${employee.amount.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">{employee.currency}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                              employee.privacy === 'Maximum'
                                ? 'bg-green-100 text-green-700'
                                : employee.privacy === 'Enhanced'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              <Shield className="w-3 h-3" weight="fill" />
                              {employee.privacy}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                              employee.status === 'Paid'
                                ? 'bg-green-100 text-green-700'
                                : employee.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {employee.status === 'Paid' && <CheckCircle className="w-3 h-3" weight="fill" />}
                              {employee.status}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column - Privacy Status & Transactions */}
              <div className="w-80 space-y-6">
                {/* Privacy Status Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white border border-gray-200 rounded p-5"
                  data-guide="privacy"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-bagel-orange" weight="fill" />
                    <h3 className="font-semibold text-bagel-dark">Privacy Status</h3>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Privacy Score</span>
                    <span className="text-lg font-semibold text-green-600">98.7%</span>
                  </div>

                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '98.7%' }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="h-full bg-green-500 rounded-full"
                    />
                  </div>

                  <div className="space-y-3">
                    {privacyFeatures.map((feature, i) => (
                      <motion.div
                        key={feature.label}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <feature.icon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{feature.label}</span>
                        </div>
                        <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-5 p-3 bg-bagel-cream/50 rounded text-xs text-gray-600">
                    All transactions are processed through our privacy layer on Solana Devnet.
                    <div className="mt-2 font-mono text-[10px] text-gray-500 break-all">
                      Program: {BAGEL_PROGRAM_ID.toBase58()}
                    </div>
                  </div>
                </motion.div>

                {/* Mint Tokens Section */}
                {connected && (
                  <MintTokensSection onMint={handleMint} />
                )}

                {/* Recent Transactions */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-gray-200 rounded p-5"
                >
                  <h3 className="font-semibold text-bagel-dark mb-4">Recent Transactions</h3>

                  <div className="space-y-3">
                    {txLoading ? (
                      <div className="text-center py-4 text-gray-500 text-sm">Loading transactions...</div>
                    ) : recentTransactions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-sm">No recent transactions</div>
                    ) : (
                      recentTransactions.map((tx, i) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.7 + i * 0.1 }}
                          className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                        >
                          <div>
                            <div className="text-sm font-medium text-bagel-dark">{tx.type}</div>
                            <div className="text-xs text-gray-500">{getRelativeTime(tx.timestamp)}</div>
                          </div>
                          <div className={`text-sm font-medium ${tx.direction === 'in' ? 'text-green-600' : 'text-bagel-dark'}`}>
                            {tx.direction === 'in' ? '+' : '-'}{tx.amount.toFixed(4)} {tx.currency}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  <button className="w-full mt-4 py-2 text-sm text-bagel-orange font-medium hover:bg-bagel-orange/5 rounded transition-colors">
                    View All Transactions
                  </button>
                </motion.div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onDeposit={handleDeposit}
        businessEntryIndex={businessEntryIndex}
        employees={employees}
      />

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onAddEmployee={handleAddEmployee}
        businessEntryIndex={businessEntryIndex}
      />

      {/* Interactive Guide */}
      <InteractiveGuide
        steps={guideSteps}
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onComplete={() => setIsGuideOpen(false)}
      />
    </>
  );
}
