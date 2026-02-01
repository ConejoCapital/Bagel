/**
 * Payroll Section Component
 *
 * Provides UI for the Confidential Streaming Payroll:
 * - Register business
 * - Initialize vault
 * - Deposit to payroll vault
 * - Add employees (index-based for privacy)
 * - Simple withdrawal (for testing)
 *
 * PRIVACY: No sensitive amounts are displayed in UI or logged
 */

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import {
  Briefcase,
  Plus,
  Users,
  CurrencyDollar,
  CircleNotch,
  Check,
  X,
  Vault,
  ArrowSquareOut,
  Lightning,
} from '@phosphor-icons/react';
import {
  registerBusiness,
  initVault,
  deposit,
  addEmployee,
  simpleWithdraw,
  getBusinessAccount,
  getVaultAccount,
  getBusinessPDA,
  getVaultPDA,
  getExplorerTxLink,
  getDemoAddresses,
  monthlyToPerSecond,
  USDBAGEL_MINT,
} from '../lib/payroll-client';
import { resolveUserTokenAccount } from '../lib/bagel-client';

interface TransactionResult {
  txid: string;
  description: string;
}

export function PayrollSection() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const [isRegistered, setIsRegistered] = useState(false);
  const [isVaultInitialized, setIsVaultInitialized] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const [vaultData, setVaultData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Modal states
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [employeeAddress, setEmployeeAddress] = useState('');
  const [employeeSalary, setEmployeeSalary] = useState('');
  const [withdrawEmployeeIndex, setWithdrawEmployeeIndex] = useState('');

  // Transaction history (for UI feedback, no amounts shown)
  const [recentTransactions, setRecentTransactions] = useState<TransactionResult[]>([]);

  // Load business data
  useEffect(() => {
    if (wallet.publicKey) {
      loadBusinessData();
    }
  }, [wallet.publicKey]);

  async function loadBusinessData() {
    if (!wallet.publicKey) return;

    try {
      const business = await getBusinessAccount(connection, wallet.publicKey);
      if (business) {
        setIsRegistered(true);
        setBusinessData(business);

        // Check if vault is initialized
        if (!business.vault.equals(PublicKey.default)) {
          const vault = await getVaultAccount(connection, business.address);
          if (vault) {
            setVaultData(vault);
            setIsVaultInitialized(true);
          }
        }
      } else {
        setIsRegistered(false);
        setBusinessData(null);
        setVaultData(null);
        setIsVaultInitialized(false);
      }
    } catch (err) {
      console.error('Error loading business data');
    }
  }

  function addTransaction(txid: string, description: string) {
    setRecentTransactions(prev => [
      { txid, description },
      ...prev.slice(0, 4), // Keep last 5 transactions
    ]);
  }

  async function handleRegisterBusiness() {
    if (!wallet.publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoading(true);
    setCurrentStep('Registering business...');
    try {
      const result = await registerBusiness(connection, wallet);
      toast.success('Business registered!', {
        description: 'View on OrbMarkets',
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerTxLink(result.txid), '_blank'),
        },
      });
      addTransaction(result.txid, 'Business registered');
      await loadBusinessData();
    } catch (err: any) {
      toast.error('Failed to register business', {
        description: err.message,
      });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  }

  async function handleInitVault() {
    if (!wallet.publicKey || !businessData) {
      toast.error('Business not registered');
      return;
    }

    setLoading(true);
    setCurrentStep('Initializing vault...');
    try {
      // Get vault token account from env or demo addresses
      const demoAddresses = getDemoAddresses();
      const vaultTokenAccount = demoAddresses.vaultToken;

      if (!vaultTokenAccount) {
        throw new Error('Vault token account not configured. Set NEXT_PUBLIC_PAYROLL_VAULT_TOKEN.');
      }

      const result = await initVault(connection, wallet, vaultTokenAccount, USDBAGEL_MINT);
      toast.success('Vault initialized!', {
        description: 'View on OrbMarkets',
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerTxLink(result.txid), '_blank'),
        },
      });
      addTransaction(result.txid, 'Vault initialized');
      await loadBusinessData();
    } catch (err: any) {
      toast.error('Failed to initialize vault', {
        description: err.message,
      });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  }

  async function handleDeposit() {
    if (!depositAmount || isNaN(parseFloat(depositAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setCurrentStep('Encrypting and depositing...');
    try {
      // Get depositor's token account
      const depositorTokenAccount = await resolveUserTokenAccount(connection, wallet.publicKey!, USDBAGEL_MINT);
      if (!depositorTokenAccount) {
        throw new Error('No USDBagel token account found. Please mint tokens first.');
      }

      // Get vault token account
      const demoAddresses = getDemoAddresses();
      const vaultTokenAccount = demoAddresses.vaultToken;
      if (!vaultTokenAccount) {
        throw new Error('Vault token account not configured');
      }

      const txid = await deposit(
        connection,
        wallet,
        depositorTokenAccount,
        vaultTokenAccount,
        parseFloat(depositAmount)
      );

      // Privacy: Don't show amount in toast
      toast.success('Deposit successful!', {
        description: 'Encrypted amount deposited to vault',
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerTxLink(txid), '_blank'),
        },
      });
      addTransaction(txid, 'Deposit to vault');
      setDepositAmount('');
      setShowDepositForm(false);
      await loadBusinessData();
    } catch (err: any) {
      toast.error('Deposit failed', {
        description: err.message,
      });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  }

  async function handleAddEmployee() {
    if (!employeeAddress || !employeeSalary) {
      toast.error('Please fill in all fields');
      return;
    }

    let employeePubkey: PublicKey;
    try {
      employeePubkey = new PublicKey(employeeAddress);
    } catch {
      toast.error('Invalid employee address');
      return;
    }

    setLoading(true);
    setCurrentStep('Adding employee (encrypted)...');
    try {
      // Convert monthly salary to per-second rate
      const monthlySalary = parseFloat(employeeSalary);
      const perSecondRate = monthlyToPerSecond(monthlySalary);

      const result = await addEmployee(
        connection,
        wallet,
        employeePubkey,
        perSecondRate
      );

      // Privacy: Don't show salary in toast
      toast.success('Employee added!', {
        description: `Employee index: ${result.employeeIndex}`,
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerTxLink(result.txid), '_blank'),
        },
      });
      addTransaction(result.txid, `Employee #${result.employeeIndex} added`);
      setEmployeeAddress('');
      setEmployeeSalary('');
      setShowAddEmployeeForm(false);
      await loadBusinessData();
    } catch (err: any) {
      toast.error('Failed to add employee', {
        description: err.message,
      });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  }

  async function handleWithdraw() {
    if (!withdrawEmployeeIndex) {
      toast.error('Please enter employee index');
      return;
    }

    setLoading(true);
    setCurrentStep('Processing withdrawal...');
    try {
      const demoAddresses = getDemoAddresses();
      const employeeToken = demoAddresses.employeeToken;
      const vaultToken = demoAddresses.vaultToken;

      if (!employeeToken || !vaultToken) {
        throw new Error('Token accounts not configured');
      }

      // Note: For simple_withdraw, we need the business owner and employee index
      // In a real app, this would use the employee's own signature
      const txid = await simpleWithdraw(
        connection,
        wallet,
        wallet.publicKey!,
        parseInt(withdrawEmployeeIndex),
        employeeToken,
        vaultToken,
        1 // Fixed amount for demo - actual amount would be from accrued balance
      );

      toast.success('Withdrawal successful!', {
        description: 'View on OrbMarkets',
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerTxLink(txid), '_blank'),
        },
      });
      addTransaction(txid, `Withdrawal for employee #${withdrawEmployeeIndex}`);
      setWithdrawEmployeeIndex('');
      setShowWithdrawForm(false);
    } catch (err: any) {
      toast.error('Withdrawal failed', {
        description: err.message,
      });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  }

  // Not connected state
  if (!wallet.publicKey) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-2xl p-8 border border-white/10">
        <div className="text-center">
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-semibold text-white mb-2">Confidential Streaming Payroll</h3>
          <p className="text-gray-400">Connect your wallet to manage payroll</p>
        </div>
      </div>
    );
  }

  // Not registered state
  if (!isRegistered) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-2xl p-8 border border-white/10">
        <div className="text-center">
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-semibold text-white mb-2">Register Your Business</h3>
          <p className="text-gray-400 mb-6">
            Start managing confidential payroll with encrypted employee salaries
          </p>
          <button
            onClick={handleRegisterBusiness}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <CircleNotch className="w-5 h-5 animate-spin" />
                {currentStep || 'Registering...'}
              </>
            ) : (
              <>
                <Briefcase className="w-5 h-5" />
                Register Business
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Vault not initialized
  if (!isVaultInitialized) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-2xl p-8 border border-white/10">
        <div className="text-center">
          <Vault className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-semibold text-white mb-2">Initialize Vault</h3>
          <p className="text-gray-400 mb-6">
            Set up your confidential token vault to start depositing funds
          </p>
          <button
            onClick={handleInitVault}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <CircleNotch className="w-5 h-5 animate-spin" />
                {currentStep || 'Initializing...'}
              </>
            ) : (
              <>
                <Vault className="w-5 h-5" />
                Initialize Vault
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Full dashboard
  return (
    <div className="space-y-6">
      {/* Business Info */}
      <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Briefcase className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Your Business</h3>
              <p className="text-sm text-gray-400">Confidential streaming payroll</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Active</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Employees</p>
            <p className="text-2xl font-bold text-white">{businessData?.nextEmployeeIndex || 0}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Vault Balance</p>
            <p className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-lg">🔒</span> Encrypted
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deposit */}
        <button
          onClick={() => setShowDepositForm(true)}
          className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all group text-left"
        >
          <CurrencyDollar className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="text-white font-medium mb-1">Deposit</h4>
          <p className="text-sm text-gray-400">Fund payroll vault</p>
        </button>

        {/* Add Employee */}
        <button
          onClick={() => setShowAddEmployeeForm(true)}
          className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl hover:border-green-500/40 transition-all group text-left"
        >
          <Users className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="text-white font-medium mb-1">Add Employee</h4>
          <p className="text-sm text-gray-400">Register with encrypted salary</p>
        </button>

        {/* Withdraw (for testing) */}
        <button
          onClick={() => setShowWithdrawForm(true)}
          className="p-6 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-xl hover:border-orange-500/40 transition-all group text-left"
        >
          <Lightning className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="text-white font-medium mb-1">Withdraw</h4>
          <p className="text-sm text-gray-400">Test withdrawal flow</p>
        </button>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Recent Transactions</h4>
          <div className="space-y-2">
            {recentTransactions.map((tx, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{tx.description}</span>
                <a
                  href={getExplorerTxLink(tx.txid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                >
                  <span className="font-mono">{tx.txid.slice(0, 8)}...</span>
                  <ArrowSquareOut className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deposit Form Modal */}
      {showDepositForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Deposit to Vault</h3>
              <button
                onClick={() => setShowDepositForm(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount (USDBagel)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="100"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Amount will be encrypted on-chain
                </p>
              </div>
              <button
                onClick={handleDeposit}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <CircleNotch className="w-5 h-5 animate-spin" />
                    {currentStep || 'Processing...'}
                  </>
                ) : (
                  <>
                    <CurrencyDollar className="w-5 h-5" />
                    Deposit (Encrypted)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Form Modal */}
      {showAddEmployeeForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Add Employee</h3>
              <button
                onClick={() => setShowAddEmployeeForm(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Employee Wallet Address</label>
                <input
                  type="text"
                  value={employeeAddress}
                  onChange={(e) => setEmployeeAddress(e.target.value)}
                  placeholder="Enter Solana address..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Address is hashed and encrypted - not stored directly
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Monthly Salary (USDBagel)</label>
                <input
                  type="number"
                  value={employeeSalary}
                  onChange={(e) => setEmployeeSalary(e.target.value)}
                  placeholder="5000"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Salary is encrypted - hidden from everyone
                </p>
              </div>
              <button
                onClick={handleAddEmployee}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <CircleNotch className="w-5 h-5 animate-spin" />
                    {currentStep || 'Processing...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Employee (Encrypted)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Form Modal */}
      {showWithdrawForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Test Withdrawal</h3>
              <button
                onClick={() => setShowWithdrawForm(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-sm text-yellow-400">
                  This is for testing only. In production, employees would sign their own withdrawals.
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Employee Index</label>
                <input
                  type="number"
                  value={withdrawEmployeeIndex}
                  onChange={(e) => setWithdrawEmployeeIndex(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <button
                onClick={handleWithdraw}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <CircleNotch className="w-5 h-5 animate-spin" />
                    {currentStep || 'Processing...'}
                  </>
                ) : (
                  <>
                    <Lightning className="w-5 h-5" />
                    Withdraw
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
