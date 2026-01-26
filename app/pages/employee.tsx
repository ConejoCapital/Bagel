import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { 
  requestWithdrawal,
  lamportsToSOL,
  solToLamports
} from '../lib/bagel-client';

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
  const [businessEntryIndex, setBusinessEntryIndex] = useState('');
  const [employeeIndex, setEmployeeIndex] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('0.01');
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [withdrawTxid, setWithdrawTxid] = useState('');

  // Note: In the new architecture, employees need their business entry index and employee index
  // These should be provided by the employer when they add the employee

  // Handle withdraw (REAL TRANSACTION!)
  const handleWithdraw = async () => {
    if (!wallet.publicKey || !payrollData) {
      setError('Wallet not connected or no payroll data');
      return;
    }

    try {
      setWithdrawing(true);
      setError('');
      setWithdrawTxid('');

      console.log('💰 Initiating REAL withdraw transaction...');
      console.log('Employee:', wallet.publicKey.toBase58());
      console.log('Employer:', payrollData.employer.toBase58());

      // REAL TRANSACTION - sends get_dough instruction to Solana!
      const txid = await withdrawDough(
        connection,
        wallet,
        payrollData.employer
      );

      setWithdrawTxid(txid);
      
      // Reset balance after successful withdraw
      setBalance(0);
      
      // Re-fetch payroll data to update lastWithdraw timestamp
      const updatedData = await fetchPayrollJar(
        connection,
        wallet.publicKey,
        payrollData.employer
      );
      if (updatedData) {
        setPayrollData(updatedData);
      }

      console.log('✅ Withdraw successful! Transaction:', txid);

    } catch (err: any) {
      console.error('❌ Error withdrawing:', err);
      setError(err.message || 'Failed to withdraw');
    } finally {
      setWithdrawing(false);
    }
  };

  // Calculate stats
  const getStats = () => {
    const salarySOL = lamportsToSOL(MOCK_SALARY_PER_SECOND);
    const daily = salarySOL * 86400;
    const hourly = salarySOL * 3600;
    
    return { hourly, daily, perSecond: salarySOL };
  };

  const stats = getStats();

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
          <WalletButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-[#2D2D2A] mb-2">
            Employee Dashboard 🧑‍🍳
          </h2>
          <p className="text-lg text-gray-600">
            Watch your salary stream in real-time
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

            {/* Withdrawal Form */}
            <div className="bg-white rounded-2xl p-8 shadow-md">
              <h3 className="text-2xl font-bold text-[#2D2D2A] mb-6">
                💰 Request Withdrawal
              </h3>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> You need your Business Entry Index and Employee Index from your employer. 
                    These are provided when you are added to the payroll system.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Entry Index
                  </label>
                  <input
                    type="number"
                    value={businessEntryIndex}
                    onChange={(e) => setBusinessEntryIndex(e.target.value)}
                    placeholder="Enter business entry index"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee Index
                  </label>
                  <input
                    type="number"
                    value={employeeIndex}
                    onChange={(e) => setEmployeeIndex(e.target.value)}
                    placeholder="Enter your employee index"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Withdrawal Amount (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !businessEntryIndex || !employeeIndex}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  {withdrawing ? '🔄 Processing...' : '💰 Request Withdrawal'}
                </button>
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
                {withdrawTxid && (
                  <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                    <h4 className="font-bold text-green-800 mb-2">✅ Withdrawal Successful!</h4>
                    <p className="text-sm text-green-700 mb-2">
                      Transaction ID: {withdrawTxid}
                    </p>
                    <a
                      href={`https://explorer.solana.com/tx/${withdrawTxid}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 text-sm"
                    >
                      🔍 View on Solana Explorer →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
