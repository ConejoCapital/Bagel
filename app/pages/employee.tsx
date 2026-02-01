import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import {
  resolveUserTokenAccount,
  USDBAGEL_MINT
} from '../lib/bagel-client';
import {
  simpleWithdraw,
  getBusinessPDA,
  getVaultPDA,
  getBusinessAccount,
  getVaultAccount,
  getEmployeeAccount,
  getDemoAddresses,
  USDBAGEL_MINT as PAYROLL_USDBAGEL_MINT,
} from '../lib/payroll-client';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

const NetworkWarning = dynamic(() => import('../components/NetworkWarning'), {
  ssr: false,
});

const NetworkSwitchGuide = dynamic(() => import('../components/NetworkSwitchGuide'), {
  ssr: false,
});

export default function EmployeeDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [employerWallet, setEmployerWallet] = useState('');
  const [employeeIndex, setEmployeeIndex] = useState('0');
  const [withdrawAmount, setWithdrawAmount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [withdrawTxid, setWithdrawTxid] = useState('');
  const [employeeStatus, setEmployeeStatus] = useState<{
    isActive: boolean;
    isDelegated: boolean;
    lastAccrualTime: number;
  } | null>(null);
  const [vaultInfo, setVaultInfo] = useState<{
    vaultPDA: string;
    vaultTokenAccount: string;
  } | null>(null);

  // Load employee status when employer wallet and index are provided
  const loadEmployeeStatus = useCallback(async () => {
    if (!employerWallet || !connection) return;

    try {
      setLoading(true);
      setError('');

      // Validate employer wallet
      let employerPubkey: PublicKey;
      try {
        employerPubkey = new PublicKey(employerWallet);
      } catch {
        setError('Invalid employer wallet address');
        return;
      }

      // Get business account
      const business = await getBusinessAccount(connection, employerPubkey);
      if (!business) {
        setError('Business not found for this employer wallet');
        return;
      }

      // Get vault info
      const vault = await getVaultAccount(connection, business.address);
      if (vault) {
        setVaultInfo({
          vaultPDA: vault.address.toBase58(),
          vaultTokenAccount: vault.tokenAccount.toBase58(),
        });
      }

      // Get employee account
      const empIndex = parseInt(employeeIndex);
      if (isNaN(empIndex) || empIndex < 0) {
        setError('Invalid employee index');
        return;
      }

      const employee = await getEmployeeAccount(connection, business.address, empIndex);
      if (!employee) {
        setError(`Employee #${empIndex} not found for this business`);
        setEmployeeStatus(null);
        return;
      }

      setEmployeeStatus({
        isActive: employee.isActive,
        isDelegated: employee.isDelegated,
        lastAccrualTime: employee.lastAccrualTime,
      });

      console.log('✅ Employee found:', {
        index: empIndex,
        isActive: employee.isActive,
        isDelegated: employee.isDelegated,
      });

    } catch (err: any) {
      console.error('Error loading employee status:', err);
      setError(err.message || 'Failed to load employee status');
    } finally {
      setLoading(false);
    }
  }, [connection, employerWallet, employeeIndex]);

  // Auto-load demo addresses
  useEffect(() => {
    const demoAddresses = getDemoAddresses();
    if (demoAddresses.businessPDA) {
      // Try to get business account to find owner
      // For now, leave employer wallet empty for user to fill
    }
  }, []);

  // Handle withdrawal using simpleWithdraw from payroll program
  const handleWithdraw = async () => {
    if (!wallet.publicKey) {
      setError('Wallet not connected');
      return;
    }

    if (!employerWallet) {
      setError('Please enter your employer\'s wallet address');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Withdrawal amount must be greater than 0');
      return;
    }

    try {
      setWithdrawing(true);
      setError('');
      setWithdrawTxid('');

      // Validate employer wallet
      let employerPubkey: PublicKey;
      try {
        employerPubkey = new PublicKey(employerWallet);
      } catch {
        throw new Error('Invalid employer wallet address');
      }

      const empIndex = parseInt(employeeIndex);
      if (isNaN(empIndex) || empIndex < 0) {
        throw new Error('Invalid employee index');
      }

      console.log('💰 Initiating simple withdrawal...');
      console.log('   Employee:', wallet.publicKey.toBase58());
      console.log('   Employer:', employerPubkey.toBase58());
      console.log('   Employee Index:', empIndex);
      // PRIVACY: Withdrawal amount is not logged

      // Get employee's Inco Token account
      const employeeTokenAccount = await resolveUserTokenAccount(connection, wallet.publicKey, USDBAGEL_MINT);
      if (!employeeTokenAccount) {
        throw new Error('No token account found. Please mint USDBagel tokens first to create your account.');
      }
      console.log('   Employee Token Account:', employeeTokenAccount.toBase58());

      // Get vault token account from on-chain data
      const business = await getBusinessAccount(connection, employerPubkey);
      if (!business) {
        throw new Error('Business not found for this employer');
      }

      const vault = await getVaultAccount(connection, business.address);
      if (!vault) {
        throw new Error('Vault not found for this business');
      }
      console.log('   Vault Token Account:', vault.tokenAccount.toBase58());

      // Call simpleWithdraw
      const txid = await simpleWithdraw(
        connection,
        wallet,
        employerPubkey,
        empIndex,
        employeeTokenAccount,
        vault.tokenAccount,
        amount
      );

      setWithdrawTxid(txid);
      console.log('✅ Withdrawal successful! Transaction:', txid);

    } catch (err: any) {
      console.error('❌ Error withdrawing:', err);
      setError(err.message || 'Failed to withdraw');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F2]">
      <Head>
        <title>Employee Dashboard - Bagel</title>
      </Head>

      <NetworkWarning />

      <header className="bg-white shadow-sm" style={{ marginTop: wallet.connected ? '40px' : '0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-4xl">🥯</span>
            <h1 className="text-2xl font-bold text-[#2D2D2A]">Bagel</h1>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-[#FF6B35]">
              Dashboard
            </Link>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-[#2D2D2A] mb-2">
            Employee Dashboard 🧑‍💼
          </h2>
          <p className="text-lg text-gray-600">
            Claim your accrued salary with privacy
          </p>
        </div>

        {!wallet.connected ? (
          <div className="bg-white rounded-2xl p-8 shadow-md text-center">
            <p className="text-lg mb-4">Please connect your wallet to continue</p>
            <WalletButton />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Network Switch Guide */}
            <NetworkSwitchGuide />

            {/* Employee Info Card */}
            <div className="bg-white rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-[#2D2D2A] mb-6">
                📋 Your Employment Info
              </h3>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>How to use:</strong> Enter your employer's wallet address and your employee index
                    (provided by your employer when they added you to payroll). Then you can claim your salary.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employer Wallet Address
                  </label>
                  <input
                    type="text"
                    value={employerWallet}
                    onChange={(e) => setEmployerWallet(e.target.value)}
                    placeholder="Enter employer's wallet address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Employee Index
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={employeeIndex}
                    onChange={(e) => setEmployeeIndex(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your employer assigns this when adding you to payroll (usually 0 for first employee)
                  </p>
                </div>

                <button
                  onClick={loadEmployeeStatus}
                  disabled={loading || !employerWallet}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  {loading ? '🔄 Loading...' : '🔍 Check Employment Status'}
                </button>

                {employeeStatus && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-bold text-green-800 mb-2">✅ Employee Found!</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Status: {employeeStatus.isActive ? '🟢 Active' : '🔴 Inactive'}</li>
                      <li>• TEE Delegation: {employeeStatus.isDelegated ? '✅ Delegated (streaming)' : '❌ Not delegated'}</li>
                      <li>• Last Accrual: {new Date(employeeStatus.lastAccrualTime * 1000).toLocaleString()}</li>
                    </ul>
                  </div>
                )}

                {vaultInfo && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">📦 Vault Info</h4>
                    <ul className="text-xs text-gray-600 space-y-1 font-mono">
                      <li>Vault PDA: {vaultInfo.vaultPDA.slice(0, 20)}...</li>
                      <li>Token Account: {vaultInfo.vaultTokenAccount.slice(0, 20)}...</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Withdrawal Form */}
            <div className="bg-white rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-[#2D2D2A] mb-6">
                💰 Claim Salary (Simple Withdraw)
              </h3>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Simple Withdraw:</strong> Claim a specific amount from your accrued salary.
                    This is a direct withdrawal without TEE streaming - you specify the amount.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Withdraw (USDBagel)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="1.0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !employerWallet || !employeeIndex}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  {withdrawing ? '🔄 Processing...' : '💰 Claim Salary'}
                </button>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                {withdrawTxid && (
                  <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                    <h4 className="font-bold text-green-800 mb-2">✅ Withdrawal Successful!</h4>
                    <p className="text-sm text-green-700 mb-2 font-mono break-all">
                      Transaction: {withdrawTxid}
                    </p>
                    <a
                      href={`https://orbmarkets.io/tx/${withdrawTxid}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 text-sm"
                    >
                      🔍 View on OrbMarkets →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl p-8 shadow-md">
              <h3 className="text-xl font-bold text-[#2D2D2A] mb-4">
                ℹ️ How Confidential Payroll Works
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  <strong>1. Your employer adds you to payroll</strong> - They provide your wallet address and set your salary rate.
                  You receive an employee index (0, 1, 2, etc.).
                </p>
                <p>
                  <strong>2. Salary accrues over time</strong> - Your salary is calculated in encrypted form using FHE (Fully Homomorphic Encryption).
                  No one can see the actual amounts on-chain.
                </p>
                <p>
                  <strong>3. Claim with Simple Withdraw</strong> - When you want to receive payment,
                  submit a withdrawal request. The encrypted amount is transferred to your token account.
                </p>
                <p>
                  <strong>4. Privacy preserved</strong> - All amounts are encrypted. Only you can decrypt your balance using your wallet signature.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
