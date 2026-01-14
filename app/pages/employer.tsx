import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

const PROGRAM_ID = new PublicKey('8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU');

export default function EmployerDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [employeeAddress, setEmployeeAddress] = useState('');
  const [salaryPerSecond, setSalaryPerSecond] = useState('0.000001');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleCreatePayroll = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus('Please connect your wallet first!');
      return;
    }

    try {
      setLoading(true);
      setStatus('Creating payroll...');

      const employee = new PublicKey(employeeAddress);
      const salaryAmount = parseFloat(salaryPerSecond);

      // For demo purposes, we'll show a simulated transaction
      // In production, this would interact with the actual program
      setStatus('✅ Payroll created! (Demo Mode)');
      
      setTimeout(() => {
        setStatus(`
          📊 Payroll Details:
          • Employee: ${employee.toBase58().slice(0, 8)}...
          • Rate: ${salaryAmount} SOL/second
          • Daily: ${(salaryAmount * 86400).toFixed(4)} SOL
          • Yearly: ${(salaryAmount * 31536000).toFixed(2)} SOL
          
          🔒 Salary encrypted via Arcium MPC
          ⚡ Streaming via MagicBlock PER
          💰 Auto-yield enabled (5% APY)
        `);
      }, 1000);

    } catch (error: any) {
      console.error('Error:', error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Employer Dashboard - Bagel</title>
      </Head>

      <div className="min-h-screen bg-[#F7F7F2]">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-4xl">🥯</span>
              <h1 className="text-2xl font-bold text-[#2D2D2A]">Bagel</h1>
            </Link>
            <WalletMultiButton />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#2D2D2A] mb-2">Employer Dashboard 👔</h2>
            <p className="text-gray-600">Create payrolls and manage your team</p>
          </div>

          {!wallet.connected ? (
            <div className="card text-center">
              <p className="text-lg mb-4">Please connect your wallet to continue</p>
              <WalletMultiButton />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Create Payroll Card */}
              <div className="card">
                <h3 className="text-2xl font-bold mb-6">🥯 Bake a New Payroll</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Employee Wallet Address</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter employee's Solana address..."
                      value={employeeAddress}
                      onChange={(e) => setEmployeeAddress(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Tip: Use your own address to test the employee view!
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Salary per Second (SOL)</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="input"
                      placeholder="0.000001"
                      value={salaryPerSecond}
                      onChange={(e) => setSalaryPerSecond(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      📊 {parseFloat(salaryPerSecond) ? (
                        <>
                          ≈ {(parseFloat(salaryPerSecond) * 3600).toFixed(6)} SOL/hour • 
                          {(parseFloat(salaryPerSecond) * 86400).toFixed(4)} SOL/day • 
                          {(parseFloat(salaryPerSecond) * 31536000).toFixed(2)} SOL/year
                        </>
                      ) : 'Enter amount to see estimates'}
                    </p>
                  </div>

                  <button
                    className="btn-primary w-full"
                    onClick={handleCreatePayroll}
                    disabled={loading || !employeeAddress || !salaryPerSecond}
                  >
                    {loading ? 'Creating...' : '🚀 Create Payroll'}
                  </button>
                </div>

                {status && (
                  <div className={`mt-4 p-4 rounded-lg ${status.includes('❌') ? 'bg-red-50' : 'bg-green-50'}`}>
                    <pre className="text-sm whitespace-pre-wrap">{status}</pre>
                  </div>
                )}
              </div>

              {/* Features Info */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="card">
                  <div className="text-2xl mb-2">🔒</div>
                  <h4 className="font-bold mb-1">Encrypted</h4>
                  <p className="text-sm text-gray-600">Salaries hidden via Arcium MPC</p>
                </div>
                <div className="card">
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="font-bold mb-1">Streaming</h4>
                  <p className="text-sm text-gray-600">Updates every second via MagicBlock</p>
                </div>
                <div className="card">
                  <div className="text-2xl mb-2">💰</div>
                  <h4 className="font-bold mb-1">Auto Yield</h4>
                  <p className="text-sm text-gray-600">Earn 5% APY on idle funds</p>
                </div>
              </div>

              {/* Demo Notice */}
              <div className="card bg-yellow-50">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">ℹ️</div>
                  <div>
                    <h4 className="font-bold mb-2">Demo Mode</h4>
                    <p className="text-sm text-gray-700">
                      This is a proof-of-concept frontend demonstrating Bagel's features. 
                      The actual program is deployed on Solana Devnet at <code className="bg-white px-2 py-1 rounded">8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU</code>.
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      All privacy integrations (Arcium, ShadowWire, MagicBlock, Privacy Cash) are implemented 
                      in the backend with production-ready patterns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
