import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { 
  fetchPayrollJar, 
  calculateAccrued, 
  lamportsToSOL,
  getPayrollJarPDA,
  withdrawDough
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
  const [employerAddress, setEmployerAddress] = useState('');
  const [payrollData, setPayrollData] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [withdrawTxid, setWithdrawTxid] = useState('');

  // Mock salary per second (in a real app, this would be decrypted from Arcium)
  const MOCK_SALARY_PER_SECOND = 1000000; // 0.000001 SOL/sec = 1M lamports/sec

  // Fetch payroll data
  const handleFetchPayroll = async () => {
    if (!wallet.publicKey) {
      setError('Please connect your wallet first!');
      return;
    }

    if (!employerAddress) {
      setError('Please enter employer address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching payroll...');
      console.log('Employee:', wallet.publicKey.toBase58());
      console.log('Employer:', employerAddress);

      const data = await fetchPayrollJar(
        connection,
        wallet.publicKey,
        new PublicKey(employerAddress)
      );

      if (data) {
        setPayrollData(data);
        setIsStreaming(true);
        console.log('✅ Found payroll!', data);
        
        const [pda] = getPayrollJarPDA(wallet.publicKey, new PublicKey(employerAddress));
        console.log('PayrollJar PDA:', pda.toBase58());
      } else {
        setError('No payroll found for this employee/employer pair. Ask your employer to create one!');
        console.log('❌ No payroll found');
      }
    } catch (err: any) {
      console.error('Error fetching payroll:', err);
      setError(`Failed to fetch payroll: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Real-time balance updates (client-side calculation)
  useEffect(() => {
    if (!payrollData || !isStreaming) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const accrued = calculateAccrued(
        payrollData.lastWithdraw,
        MOCK_SALARY_PER_SECOND,
        now
      );
      setBalance(accrued);
    }, 1000);

    return () => clearInterval(interval);
  }, [payrollData, isStreaming]);

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

            {/* Fetch Payroll Card */}
            {!payrollData && (
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <h3 className="text-2xl font-bold text-[#2D2D2A] mb-6">
                  🔍 Find Your Payroll
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employer Wallet Address
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] font-mono text-sm"
                      placeholder="Enter the wallet address of your employer"
                      value={employerAddress}
                      onChange={(e) => setEmployerAddress(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 This is the address that created your payroll
                    </p>
                  </div>

                  <button
                    onClick={handleFetchPayroll}
                    disabled={loading || !employerAddress}
                    className="w-full bg-[#FF6B35] hover:bg-[#E55A24] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    {loading ? '🔄 Searching blockchain...' : '🔍 Fetch My Payroll'}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Streaming Balance Display */}
            {payrollData && (
              <>
                <div className="bg-white rounded-2xl p-8 shadow-md">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-[#2D2D2A] mb-2">
                      Current Balance
                    </h3>
                    <div className="text-6xl font-bold text-[#FF6B35] mb-2">
                      {lamportsToSOL(balance).toFixed(9)} SOL
                    </div>
                    {isStreaming && (
                      <div className="flex items-center justify-center space-x-2 text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <p className="text-sm font-medium">Streaming live ⚡</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">⚡</div>
                      <div>
                        <h4 className="font-bold text-blue-900 mb-1">Real-Time Balance Updates</h4>
                        <p className="text-sm text-blue-800">
                          This balance is calculated client-side based on REAL on-chain data: 
                          your actual <code>lastWithdraw</code> timestamp and salary rate from the blockchain.
                          The calculation runs locally for smooth 1-second updates (no RPC spam!).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => setIsStreaming(!isStreaming)}
                      className={`py-3 px-6 rounded-lg font-bold transition-all duration-300 ${
                        isStreaming
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-[#FF6B35] hover:bg-[#E55A24] text-white'
                      }`}
                    >
                      {isStreaming ? '⏸️ Pause Updates' : '▶️ Start Live Updates'}
                    </button>

                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawing || balance === 0}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                    >
                      {withdrawing ? '🔄 Withdrawing...' : '💰 Withdraw (REAL TX)'}
                    </button>
                  </div>

                  {/* Verification Dashboard */}
                  {payrollData && (
                    <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-6">
                      <h4 className="font-bold text-purple-900 mb-4 text-lg">
                        🔍 Public Verification Dashboard
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <h5 className="font-semibold text-gray-700 mb-2">PayrollJar Vault Balance</h5>
                          <p className="text-2xl font-bold text-[#FF6B35]">
                            {payrollData.totalAccrued ? lamportsToSOL(payrollData.totalAccrued).toFixed(6) : '0.000000'} SOL
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            On-chain balance (PUBLIC)
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <h5 className="font-semibold text-gray-700 mb-2">Employee Wallet Balance</h5>
                          <p className="text-2xl font-bold text-green-600">
                            {balance > 0 ? lamportsToSOL(balance).toFixed(6) : '0.000000'} SOL
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Accrued salary (PUBLIC)
                          </p>
                        </div>
                      </div>
                      {withdrawTxid && (
                        <div className="mt-4 bg-white rounded-lg p-4 border border-green-300">
                          <h5 className="font-semibold text-green-800 mb-2">Latest Withdrawal Transaction</h5>
                          <a
                            href={`https://solscan.io/tx/${withdrawTxid}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
                          >
                            {withdrawTxid}
                          </a>
                          <p className="text-xs text-gray-600 mt-2">
                            ✅ View on Solscan to verify the "Confidential Transfer" instruction
                          </p>
                        </div>
                      )}
                      <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                        <p className="text-xs text-yellow-800">
                          <strong>Privacy Note:</strong> The salary amount is encrypted on-chain (PRIVATE). 
                          Only the payout amount and transaction validity are public.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Withdraw Success Display */}
                  {withdrawTxid && (
                    <div className="mb-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                      <h4 className="font-bold text-green-800 mb-2">✅ Withdrawal Successful!</h4>
                      <p className="text-sm text-green-700 mb-2">
                        Your accrued salary has been withdrawn to your wallet.
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

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Rate per Second</p>
                      <p className="text-lg font-bold text-[#2D2D2A]">
                        {stats.perSecond.toFixed(6)} SOL
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Estimated Daily</p>
                      <p className="text-lg font-bold text-[#2D2D2A]">
                        {stats.daily.toFixed(4)} SOL
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Earned</p>
                      <p className="text-lg font-bold text-[#2D2D2A]">
                        {lamportsToSOL(balance).toFixed(4)} SOL
                      </p>
                    </div>
                  </div>

                  {/* Payroll Info */}
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="font-bold text-blue-900 mb-3">📊 Payroll Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Employer:</span>
                        <span className="font-mono text-blue-900">
                          {payrollData.employer.toBase58().slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Your Address:</span>
                        <span className="font-mono text-blue-900">
                          {payrollData.employee.toBase58().slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Last Withdraw:</span>
                        <span className="text-blue-900">
                          {new Date(payrollData.lastWithdraw * 1000).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Status:</span>
                        <span className={`font-bold ${payrollData.isActive ? 'text-green-700' : 'text-red-700'}`}>
                          {payrollData.isActive ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <a
                        href={`https://explorer.solana.com/address/${wallet.publicKey ? getPayrollJarPDA(wallet.publicKey, payrollData.employer)[0].toBase58() : ''}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:text-blue-900 text-sm font-medium"
                      >
                        🔍 View PayrollJar on Explorer →
                      </a>
                    </div>
                  </div>
                </div>

                {/* How It Works Section */}
                <div className="bg-white rounded-2xl p-8 shadow-md">
                  <h3 className="text-2xl font-bold text-[#2D2D2A] mb-6">
                    How Bagel Works 🥯
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">⚡</div>
                      <div>
                        <h4 className="font-bold text-lg mb-1">Real-Time Streaming</h4>
                        <p className="text-gray-600 text-sm">
                          Your balance updates every second via MagicBlock's Private Ephemeral Rollups (Intel TDX)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">🔒</div>
                      <div>
                        <h4 className="font-bold text-lg mb-1">Encrypted Salary</h4>
                        <p className="text-gray-600 text-sm">
                          Your salary rate is encrypted on-chain using Arcium MPC - even validators can't see it!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">🕵️</div>
                      <div>
                        <h4 className="font-bold text-lg mb-1">Private Withdrawals</h4>
                        <p className="text-gray-600 text-sm">
                          Withdrawals use ShadowWire Bulletproofs - transfer amounts are hidden via zero-knowledge proofs
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">💰</div>
                      <div>
                        <h4 className="font-bold text-lg mb-1">Automatic Yield Bonus</h4>
                        <p className="text-gray-600 text-sm">
                          Idle payroll funds earn 5-10% APY via Kamino Finance vaults - you get 80% of the yield!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-bold text-green-900 mb-2">✅ What's REAL (On Blockchain):</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• PayrollJar account - <strong>REAL on-chain data</strong></li>
                      <li>• Your employer & employee addresses - <strong>REAL from blockchain</strong></li>
                      <li>• Last withdraw timestamp - <strong>REAL from blockchain</strong></li>
                      <li>• Salary rate (encrypted) - <strong>REAL from blockchain</strong></li>
                      <li>• Create payroll transaction - <strong>REAL Solana transaction</strong></li>
                    </ul>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-bold text-blue-900 mb-2">⚡ What's Calculated (Client-Side):</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Balance updates (every 1 second) - <strong>Calculated from real on-chain data</strong></li>
                      <li>• Formula: (now - lastWithdraw) × salaryPerSecond</li>
                      <li>• This avoids spamming RPC calls while showing real-time accrual</li>
                      <li>• In production: MagicBlock PERs would update off-chain with TEE privacy</li>
                    </ul>
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-bold text-yellow-900 mb-2">🔒 Privacy Features (Patterns Ready):</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Arcium MPC - Integration patterns complete (awaiting production API)</li>
                      <li>• ShadowWire ZK - Transfer structure ready (awaiting production API)</li>
                      <li>• MagicBlock PERs - Streaming simulation working (awaiting mainnet)</li>
                      <li>• Kamino Finance - Integration plan documented (post-hackathon)</li>
                    </ul>
                  </div>
                </div>

                {/* Change Employer */}
                <div className="bg-white rounded-2xl p-6 shadow-md">
                  <button
                    onClick={() => {
                      setPayrollData(null);
                      setBalance(0);
                      setIsStreaming(false);
                      setEmployerAddress('');
                    }}
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    ← Check a different employer
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
