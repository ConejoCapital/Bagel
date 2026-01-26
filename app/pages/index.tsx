import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

export default function Home() {
  const { connected, publicKey } = useWallet();

  return (
    <>
      <Head>
        <title>Bagel - Privacy-First Payroll</title>
        <meta name="description" content="Real-time streaming payments with zero-knowledge privacy" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-[#F7F7F2]">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-4xl">🥯</span>
              <h1 className="text-2xl font-bold text-[#2D2D2A]">Bagel</h1>
            </div>
            <WalletButton />
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-[#2D2D2A] mb-4">
              Privacy-First Payroll for Solana
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Real-time streaming payments • Zero-knowledge transfers • Automated yield generation
            </p>
            
            {!connected ? (
              <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto">
                <p className="text-lg mb-6">Connect your wallet to get started!</p>
                <p className="text-sm text-gray-500">
                  This demo runs on <strong>Solana Devnet</strong>
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Employer Card */}
                <Link href="/dashboard">
                  <div className="card hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="text-4xl mb-4">👔</div>
                    <h3 className="text-2xl font-bold mb-2">I'm an Employer</h3>
                    <p className="text-gray-600 mb-4">
                      Create payrolls, deposit funds, and watch them earn yield automatically
                    </p>
                    <button className="btn-primary w-full">
                      Open Dashboard
                    </button>
                  </div>
                </Link>

                {/* Employee Card */}
                <Link href="/employee">
                  <div className="card hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="text-4xl mb-4">👨‍💼</div>
                    <h3 className="text-2xl font-bold mb-2">I'm an Employee</h3>
                    <p className="text-gray-600 mb-4">
                      Watch your salary stream in real-time and withdraw with privacy
                    </p>
                    <button className="btn-secondary w-full">
                      View My Payroll
                    </button>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Features Section */}
          <div className="mt-16 grid md:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="text-3xl mb-3">🔒</div>
              <h4 className="font-bold mb-2">Encrypted Salaries</h4>
              <p className="text-sm text-gray-600">Inco Lightning FHE keeps salaries hidden on-chain</p>
            </div>
            <div className="text-center p-6">
              <div className="text-3xl mb-3">⚡</div>
              <h4 className="font-bold mb-2">Real-Time Streaming</h4>
              <p className="text-sm text-gray-600">Balance updates every second via MagicBlock</p>
            </div>
            <div className="text-center p-6">
              <div className="text-3xl mb-3">🕵️</div>
              <h4 className="font-bold mb-2">Private Transfers</h4>
              <p className="text-sm text-gray-600">Zero-knowledge withdrawals with ShadowWire</p>
            </div>
            <div className="text-center p-6">
              <div className="text-3xl mb-3">💰</div>
              <h4 className="font-bold mb-2">Auto Yield</h4>
              <p className="text-sm text-gray-600">5-10% APY on idle funds via Privacy Cash</p>
            </div>
          </div>

          {/* Stats */}
          {connected && (
            <div className="mt-12 bg-white rounded-2xl p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-[#FF6B35]">8rgaVvV6...</div>
                  <div className="text-sm text-gray-600 mt-1">Program ID (Devnet)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#FF6B35]">{publicKey?.toBase58().slice(0, 8)}...</div>
                  <div className="text-sm text-gray-600 mt-1">Your Wallet</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#FFD23F]">100%</div>
                  <div className="text-sm text-gray-600 mt-1">Privacy Guaranteed</div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
            <p className="text-sm">
              Built for Solana Privacy Hackathon 2026 • Powered by Inco, ShadowWire, MagicBlock & Range
            </p>
            <p className="text-xs mt-2">
              Simple payroll, private paydays, and a little extra cream cheese 🥯
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
