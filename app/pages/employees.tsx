import { useState } from 'react';
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
  Shield,
  ShieldCheck,
  CheckCircle,
  Funnel,
  Command,
  X,
  CaretDown as CaretDownIcon,
  CurrencyDollar,
  CalendarBlank,
  User,
  Plus,
  PencilSimple,
  Trash,
  DotsThreeVertical,
  EnvelopeSimple,
  Clock,
} from '@phosphor-icons/react';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

// Sidebar navigation items
const navItems = [
  { icon: House, label: 'Home', href: '/dashboard' },
  { icon: Users, label: 'Employees', href: '/employees', active: true },
  { icon: PaperPlaneTilt, label: 'Send Payment', href: '/send' },
  { icon: ClockCounterClockwise, label: 'Transaction History', href: '/history' },
  { icon: Vault, label: 'Privacy Vault', href: '/vault' },
  { icon: Wallet, label: 'Wallets', href: '/wallets' },
  { icon: ChartBar, label: 'Reports', href: '/reports' },
];

// Mock data for employees
const initialEmployees = [
  {
    id: 1,
    initials: 'AT',
    name: 'Alex Thompson',
    email: 'alex.thompson@company.com',
    role: 'Senior Developer',
    department: 'Engineering',
    startDate: 'Mar 15, 2024',
    wallet: '0x7a23...f8d9',
    fullWallet: '7a23d8c4e9f1b2a3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7f8d9',
    salary: 8500.00,
    currency: 'SOL',
    paymentFrequency: 'Monthly',
    privacy: 'Maximum',
    status: 'Active',
    lastPayment: 'Jan 15, 2026',
  },
  {
    id: 2,
    initials: 'SC',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    role: 'Product Manager',
    department: 'Product',
    startDate: 'Jan 10, 2024',
    wallet: '0x3b91...c4e2',
    fullWallet: '3b91a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c4e2',
    salary: 12750.00,
    currency: 'USDC',
    paymentFrequency: 'Bi-weekly',
    privacy: 'Standard',
    status: 'Active',
    lastPayment: 'Jan 14, 2026',
  },
  {
    id: 3,
    initials: 'MR',
    name: 'Michael Ross',
    email: 'michael.ross@company.com',
    role: 'DevOps Engineer',
    department: 'Engineering',
    startDate: 'Jun 20, 2024',
    wallet: '0x9f56...a7b3',
    fullWallet: '9f56a7b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9a7b3',
    salary: 6200.00,
    currency: 'SOL',
    paymentFrequency: 'Monthly',
    privacy: 'Maximum',
    status: 'Active',
    lastPayment: 'Jan 15, 2026',
  },
  {
    id: 4,
    initials: 'EW',
    name: 'Emma Wilson',
    email: 'emma.wilson@company.com',
    role: 'UX Designer',
    department: 'Design',
    startDate: 'Sep 5, 2024',
    wallet: '0x2c84...d1f5',
    fullWallet: '2c84d1f5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1d1f5',
    salary: 9100.00,
    currency: 'USDC',
    paymentFrequency: 'Monthly',
    privacy: 'Enhanced',
    status: 'Active',
    lastPayment: 'Jan 13, 2026',
  },
  {
    id: 5,
    initials: 'JK',
    name: 'James Kim',
    email: 'james.kim@company.com',
    role: 'Backend Developer',
    department: 'Engineering',
    startDate: 'Nov 12, 2024',
    wallet: '0x5d92...e3a1',
    fullWallet: '5d92e3a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7e3a1',
    salary: 7800.00,
    currency: 'SOL',
    paymentFrequency: 'Weekly',
    privacy: 'Maximum',
    status: 'Active',
    lastPayment: 'Jan 12, 2026',
  },
  {
    id: 6,
    initials: 'LM',
    name: 'Lisa Martinez',
    email: 'lisa.martinez@company.com',
    role: 'Marketing Lead',
    department: 'Marketing',
    startDate: 'Feb 1, 2024',
    wallet: '0x8e47...b2c9',
    fullWallet: '8e47b2c9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6b2c9',
    salary: 10500.00,
    currency: 'USDC',
    paymentFrequency: 'Monthly',
    privacy: 'Enhanced',
    status: 'Active',
    lastPayment: 'Jan 15, 2026',
  },
  {
    id: 7,
    initials: 'DT',
    name: 'David Turner',
    email: 'david.turner@company.com',
    role: 'QA Engineer',
    department: 'Engineering',
    startDate: 'Aug 22, 2024',
    wallet: '0x1a73...f4d8',
    fullWallet: '1a73f4d8a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6f4d8',
    salary: 5800.00,
    currency: 'SOL',
    paymentFrequency: 'Bi-weekly',
    privacy: 'Standard',
    status: 'Inactive',
    lastPayment: 'Dec 28, 2025',
  },
];

// Add Employee Modal Component
interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (employee: typeof initialEmployees[0]) => void;
}

function AddEmployeeModal({ isOpen, onClose, onAdd }: AddEmployeeModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [wallet, setWallet] = useState('');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('SOL');
  const [paymentFrequency, setPaymentFrequency] = useState<'Monthly' | 'Bi-weekly' | 'Weekly'>('Monthly');

  const currencies = [
    { symbol: 'SOL', name: 'Solana', icon: '◎' },
    { symbol: 'USDC', name: 'USD Coin', icon: '$' },
  ];

  const departments = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Operations'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newEmployee = {
      id: Date.now(),
      initials,
      name,
      email,
      role,
      department,
      startDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      wallet: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
      fullWallet: wallet,
      salary: parseFloat(salary),
      currency,
      paymentFrequency,
      privacy: 'Maximum' as const,
      status: 'Active' as const,
      lastPayment: 'Not yet',
    };
    onAdd(newEmployee);
    onClose();
    // Reset form
    setName('');
    setEmail('');
    setRole('');
    setDepartment('Engineering');
    setWallet('');
    setSalary('');
    setCurrency('SOL');
    setPaymentFrequency('Monthly');
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Employee Name & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@company.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Senior Developer"
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="appearance-none w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange cursor-pointer"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <CaretDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
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
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
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
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="appearance-none w-28 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded text-sm font-medium focus:outline-none focus:border-bagel-orange cursor-pointer"
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
                    { value: 'Monthly', label: 'Monthly' },
                    { value: 'Bi-weekly', label: 'Bi-weekly' },
                    { value: 'Weekly', label: 'Weekly' },
                  ].map((freq) => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() => setPaymentFrequency(freq.value as typeof paymentFrequency)}
                      className={`flex items-center justify-center gap-2 p-2.5 border rounded transition-all ${
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
                    All payroll transactions will be processed with maximum privacy.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex-1 px-4 py-2.5 bg-bagel-orange text-white rounded text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" weight="bold" />
                  Add Employee
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [employees, setEmployees] = useState(initialEmployees);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);

  const departments = ['all', ...new Set(employees.map(e => e.department))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const totalPayroll = employees.reduce((sum, emp) => sum + emp.salary, 0);
  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const departmentCount = new Set(employees.map(e => e.department)).size;

  const handleAddEmployee = (employee: typeof initialEmployees[0]) => {
    setEmployees(prev => [...prev, employee]);
  };

  const handleDeleteEmployee = (id: number) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    setSelectedEmployee(null);
  };

  return (
    <>
      <Head>
        <title>Employees - Bagel</title>
        <meta name="description" content="Manage your team and payroll" />
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
              <h1 className="text-xl font-semibold text-bagel-dark">Employees</h1>
              <p className="text-sm text-gray-500">Manage your team and payroll settings</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 hover:bg-gray-50 rounded border border-gray-200 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-bagel-orange text-white rounded font-medium text-sm"
              >
                <Plus className="w-4 h-4" weight="bold" />
                Add Employee
              </motion.button>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  {
                    icon: Users,
                    value: employees.length.toString(),
                    label: 'Total Employees',
                    subtitle: `${activeEmployees} active`,
                  },
                  {
                    icon: Wallet,
                    value: `$${totalPayroll.toLocaleString()}`,
                    label: 'Monthly Payroll',
                    subtitle: 'All employees',
                  },
                  {
                    icon: ChartBar,
                    value: departmentCount.toString(),
                    label: 'Departments',
                    subtitle: 'Across the company',
                  },
                  {
                    icon: ShieldCheck,
                    value: `${Math.round((employees.filter(e => e.privacy === 'Maximum').length / employees.length) * 100)}%`,
                    label: 'Maximum Privacy',
                    subtitle: 'Protected payments',
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

              {/* Employees Table */}
              <div className="bg-white border border-gray-200 rounded">
                {/* Table Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-bagel-dark">All Employees</h2>
                  <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange w-64"
                      />
                    </div>
                    {/* Department Filter */}
                    <div className="relative">
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="appearance-none px-4 py-2 pr-8 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange cursor-pointer"
                      >
                        <option value="all">All Departments</option>
                        {departments.filter(d => d !== 'all').map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <CaretDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    {/* Status Filter */}
                    <div className="flex items-center bg-gray-100 rounded p-1">
                      {['all', 'Active', 'Inactive'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status as typeof filterStatus)}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            filterStatus === status
                              ? 'bg-white text-bagel-dark shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {status === 'all' ? 'All' : status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Employee</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Role</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Wallet</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Salary</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Frequency</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Privacy</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee, i) => (
                      <motion.tr
                        key={employee.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 + i * 0.03 }}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-bagel-cream rounded-full flex items-center justify-center text-sm font-medium text-bagel-dark">
                              {employee.initials}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-bagel-dark">{employee.name}</div>
                              <div className="text-xs text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-bagel-dark">{employee.role}</div>
                          <div className="text-xs text-gray-500">{employee.department}</div>
                        </td>
                        <td className="px-4 py-4">
                          <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{employee.wallet}</code>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-bagel-dark">${employee.salary.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{employee.currency}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="w-3.5 h-3.5" />
                            {employee.paymentFrequency}
                          </div>
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
                            employee.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {employee.status === 'Active' && <CheckCircle className="w-3 h-3" weight="fill" />}
                            {employee.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setSelectedEmployee(selectedEmployee === employee.id ? null : employee.id)}
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            >
                              <DotsThreeVertical className="w-4 h-4 text-gray-500" />
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                              {selectedEmployee === employee.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg z-10"
                                >
                                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    <PencilSimple className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    <PaperPlaneTilt className="w-4 h-4" />
                                    Send Payment
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEmployee(employee.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash className="w-4 h-4" />
                                    Remove
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>

                {/* Empty State */}
                {filteredEmployees.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Users className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 mb-2">No employees found</p>
                    <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                  </div>
                )}

                {/* Footer */}
                {filteredEmployees.length > 0 && (
                  <div className="flex items-center justify-between p-4 border-t border-gray-100">
                    <div className="text-sm text-gray-500">
                      Showing {filteredEmployees.length} of {employees.length} employees
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddEmployee}
      />
    </>
  );
}
