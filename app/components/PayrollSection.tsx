/**
 * Payroll Section Component
 *
 * Provides UI for:
 * - Register business
 * - Deposit to payroll
 * - Add employees
 * - Pay employees
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
  X
} from '@phosphor-icons/react';
import {
  registerBusiness,
  depositToPayroll,
  addEmployee,
  payEmployee,
  getBusinessAccount,
  getBusinessPDA,
} from '../lib/payroll-client';

export function PayrollSection() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const [isRegistered, setIsRegistered] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [showPayEmployeeForm, setShowPayEmployeeForm] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [employeeAddress, setEmployeeAddress] = useState('');
  const [employeeSalary, setEmployeeSalary] = useState('');
  const [payEmployeeAddress, setPayEmployeeAddress] = useState('');
  const [payAmount, setPayAmount] = useState('');

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
      } else {
        setIsRegistered(false);
        setBusinessData(null);
      }
    } catch (err) {
      console.error('Error loading business:', err);
    }
  }

  async function handleRegisterBusiness() {
    if (!wallet.publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      const result = await registerBusiness(connection, wallet);
      toast.success('Business registered!', {
        description: `Transaction: ${result.txid.slice(0, 8)}...`,
      });
      await loadBusinessData();
    } catch (err: any) {
      toast.error('Failed to register business', {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeposit() {
    if (!depositAmount || isNaN(parseFloat(depositAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const txid = await depositToPayroll(
        connection,
        wallet,
        parseFloat(depositAmount)
      );
      toast.success('Deposit successful!', {
        description: `${depositAmount} USDBagel deposited (encrypted)`,
      });
      setDepositAmount('');
      setShowDepositForm(false);
      await loadBusinessData();
    } catch (err: any) {
      toast.error('Deposit failed', {
        description: err.message,
      });
    } finally {
      setLoading(false);
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
    try {
      const result = await addEmployee(
        connection,
        wallet,
        employeePubkey,
        parseFloat(employeeSalary)
      );
      toast.success('Employee added!', {
        description: `Salary: ${employeeSalary} USDBagel/month (encrypted)`,
      });
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
    }
  }

  async function handlePayEmployee() {
    if (!payEmployeeAddress || !payAmount) {
      toast.error('Please fill in all fields');
      return;
    }

    let employeePubkey: PublicKey;
    try {
      employeePubkey = new PublicKey(payEmployeeAddress);
    } catch {
      toast.error('Invalid employee address');
      return;
    }

    setLoading(true);
    try {
      const txid = await payEmployee(
        connection,
        wallet,
        employeePubkey,
        parseFloat(payAmount)
      );
      toast.success('Employee paid!', {
        description: `${payAmount} USDBagel sent (encrypted)`,
      });
      setPayEmployeeAddress('');
      setPayAmount('');
      setShowPayEmployeeForm(false);
      await loadBusinessData();
    } catch (err: any) {
      toast.error('Payment failed', {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  if (!wallet.publicKey) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-2xl p-8 border border-white/10">
        <div className="text-center">
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-semibold text-white mb-2">Confidential Payroll</h3>
          <p className="text-gray-400">Connect your wallet to manage payroll</p>
        </div>
      </div>
    );
  }

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
                Registering...
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
              <p className="text-sm text-gray-400">Confidential payroll enabled</p>
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
            <p className="text-2xl font-bold text-white">{businessData?.employeeCount || 0}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Deposits</p>
            <p className="text-2xl font-bold text-white">{businessData?.totalDeposited || 0}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deposit */}
        <button
          onClick={() => setShowDepositForm(true)}
          className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all group"
        >
          <CurrencyDollar className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="text-white font-medium mb-1">Deposit</h4>
          <p className="text-sm text-gray-400">Fund payroll vault</p>
        </button>

        {/* Add Employee */}
        <button
          onClick={() => setShowAddEmployeeForm(true)}
          className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl hover:border-green-500/40 transition-all group"
        >
          <Users className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="text-white font-medium mb-1">Add Employee</h4>
          <p className="text-sm text-gray-400">Register new employee</p>
        </button>

        {/* Pay Employee */}
        <button
          onClick={() => setShowPayEmployeeForm(true)}
          className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl hover:border-purple-500/40 transition-all group"
        >
          <CurrencyDollar className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="text-white font-medium mb-1">Pay Employee</h4>
          <p className="text-sm text-gray-400">Send encrypted payment</p>
        </button>
      </div>

      {/* Deposit Form Modal */}
      {showDepositForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Deposit to Payroll</h3>
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
              </div>
              <button
                onClick={handleDeposit}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <CircleNotch className="w-5 h-5 animate-spin" />
                    Depositing...
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
              </div>
              <button
                onClick={handleAddEmployee}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <CircleNotch className="w-5 h-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Employee
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Employee Form Modal */}
      {showPayEmployeeForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Pay Employee</h3>
              <button
                onClick={() => setShowPayEmployeeForm(false)}
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
                  value={payEmployeeAddress}
                  onChange={(e) => setPayEmployeeAddress(e.target.value)}
                  placeholder="Enter Solana address..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount (USDBagel)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <button
                onClick={handlePayEmployee}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <CircleNotch className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <CurrencyDollar className="w-5 h-5" />
                    Pay (Encrypted)
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
