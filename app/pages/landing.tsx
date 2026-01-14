import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

// Animation hook for scroll-triggered reveals
function useScrollReveal() {
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return isVisible;
}

// Animated counter for stats
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function Landing() {
  const isVisible = useScrollReveal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Bagel - Privacy-First Payroll for Solana</title>
        <meta name="description" content="Run payroll with complete financial privacy. Real-time streaming payments, zero-knowledge transfers, and automated yield generation on Solana." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Open Graph */}
        <meta property="og:title" content="Bagel - Privacy-First Payroll for Solana" />
        <meta property="og:description" content="Run payroll with complete financial privacy. Real-time streaming, ZK transfers, automated yield." />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bagel - Privacy-First Payroll" />
        <meta name="twitter:description" content="Run payroll with complete financial privacy on Solana." />
      </Head>

      <div className="min-h-screen bg-white">
        {/* ============================================
            NAVIGATION
        ============================================ */}
        <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-bagel-orange rounded-full flex items-center justify-center transition-transform group-hover:scale-105">
                  <span className="text-white text-xl">🥯</span>
                </div>
                <span className="text-xl font-bold text-bagel-dark">Bagel</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-gray-600 hover:text-bagel-dark transition-colors text-sm font-medium">
                  Features
                </a>
                <a href="#how-it-works" className="text-gray-600 hover:text-bagel-dark transition-colors text-sm font-medium">
                  How it works
                </a>
                <a href="#architecture" className="text-gray-600 hover:text-bagel-dark transition-colors text-sm font-medium">
                  Architecture
                </a>
                <a href="https://github.com/ConejoCapital/Bagel" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-bagel-dark transition-colors text-sm font-medium">
                  GitHub
                </a>
              </div>

              {/* CTA Buttons */}
              <div className="hidden md:flex items-center gap-3">
                <Link href="/docs" className="text-sm font-medium text-gray-600 hover:text-bagel-dark transition-colors px-4 py-2">
                  Documentation
                </Link>
                <Link href="/" className="btn-primary text-sm">
                  Launch App
                </Link>
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6 text-bagel-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 border-t border-gray-100">
                <div className="flex flex-col gap-4">
                  <a href="#features" className="text-gray-600 hover:text-bagel-dark text-sm font-medium">Features</a>
                  <a href="#how-it-works" className="text-gray-600 hover:text-bagel-dark text-sm font-medium">How it works</a>
                  <a href="#architecture" className="text-gray-600 hover:text-bagel-dark text-sm font-medium">Architecture</a>
                  <a href="https://github.com/ConejoCapital/Bagel" className="text-gray-600 hover:text-bagel-dark text-sm font-medium">GitHub</a>
                  <Link href="/" className="btn-primary text-sm text-center">Launch App</Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* ============================================
            HERO SECTION
        ============================================ */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-bagel-cream/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Hero Copy */}
              <div className="animate-fadeIn">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-bagel-orange/10 text-bagel-orange text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-bagel-orange rounded-full mr-2 animate-pulse"></span>
                  Live on Solana Devnet
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-bagel-dark leading-tight mb-6">
                  Payroll that respects
                  <span className="text-bagel-orange"> financial privacy</span>
                </h1>

                <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl">
                  Run payroll on Solana with encrypted salaries, zero-knowledge transfers,
                  and automated yield generation. Your team's compensation stays private.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/" className="btn-primary text-center px-8 py-4 text-base">
                    Launch App
                  </Link>
                  <a
                    href="https://github.com/ConejoCapital/Bagel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-center px-8 py-4 text-base flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    View on GitHub
                  </a>
                </div>

                {/* Trust indicators */}
                <div className="flex items-center gap-6 mt-10 pt-8 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-bagel-dark">4,100+</div>
                    <div className="text-sm text-gray-500">Lines of code</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-bagel-dark">4</div>
                    <div className="text-sm text-gray-500">Privacy integrations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-bagel-dark">100%</div>
                    <div className="text-sm text-gray-500">Open source</div>
                  </div>
                </div>
              </div>

              {/* Hero Visual - Product Preview */}
              <div className="relative animate-fadeInUp">
                <div className="absolute inset-0 bg-gradient-to-r from-bagel-orange/20 to-bagel-sesame/20 rounded-3xl blur-3xl"></div>
                <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                  {/* Mock Dashboard Header */}
                  <div className="bg-bagel-cream px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-bagel-orange rounded-full flex items-center justify-center text-white text-sm">🥯</div>
                        <span className="font-semibold text-bagel-dark">Employee Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-sm text-gray-500">Live</span>
                      </div>
                    </div>
                  </div>

                  {/* Mock Streaming Balance */}
                  <div className="p-6">
                    <div className="text-sm text-gray-500 mb-2">Current Balance</div>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl font-bold text-bagel-dark">12.847391</span>
                      <span className="text-xl text-gray-400">SOL</span>
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Streaming
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-bagel-cream/50 rounded-xl p-4">
                        <div className="text-sm text-gray-500 mb-1">Rate</div>
                        <div className="font-semibold text-bagel-dark">0.0031 SOL/sec</div>
                      </div>
                      <div className="bg-bagel-cream/50 rounded-xl p-4">
                        <div className="text-sm text-gray-500 mb-1">Yield Bonus</div>
                        <div className="font-semibold text-bagel-orange">+0.42 SOL</div>
                      </div>
                    </div>

                    <button className="w-full bg-bagel-orange text-white py-3 rounded-xl font-semibold hover:bg-bagel-orange/90 transition-colors">
                      Withdraw Privately
                    </button>
                  </div>
                </div>

                {/* Floating privacy badge */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-bagel-dark">ZK Protected</div>
                      <div className="text-xs text-gray-500">Amount hidden</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            PROBLEM STATEMENT
        ============================================ */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-bagel-dark">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Traditional crypto payroll is a glass office
            </h2>
            <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
              When you pay salaries on-chain, everyone can see everything.
              Competitors learn your burn rate. Colleagues compare salaries.
              Financial privacy disappears.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
                <div className="text-3xl mb-3">👁️</div>
                <h4 className="font-semibold text-white mb-2">Visible Salaries</h4>
                <p className="text-sm text-gray-400">Every payment amount is public on the blockchain</p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
                <div className="text-3xl mb-3">📊</div>
                <h4 className="font-semibold text-white mb-2">Exposed Burn Rate</h4>
                <p className="text-sm text-gray-400">Competitors can calculate your runway</p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
                <div className="text-3xl mb-3">💸</div>
                <h4 className="font-semibold text-white mb-2">Idle Capital</h4>
                <p className="text-sm text-gray-400">Payroll funds sit earning nothing</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            FEATURES / PRODUCT OVERVIEW
        ============================================ */}
        <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div
              id="features-header"
              data-animate
              className={`text-center mb-16 transition-all duration-700 ${isVisible['features-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-4">
                Privacy built into every layer
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Four integrated privacy technologies ensure your payroll data stays confidential
                from storage to transfer to computation.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Arcium Card */}
              <div
                id="feature-arcium"
                data-animate
                className={`group bg-gradient-to-br from-bagel-cream to-white rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-500 ${isVisible['feature-arcium'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                <div className="w-14 h-14 bg-bagel-orange/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-bagel-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-bagel-dark mb-3">Encrypted Salary Storage</h3>
                <p className="text-gray-600 mb-4">
                  Salaries are encrypted using Arcium's MPC network before being stored on-chain.
                  Even validators cannot see the actual amounts.
                </p>
                <div className="flex items-center text-sm text-bagel-orange font-medium">
                  Powered by Arcium v0.5.1
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* ShadowWire Card */}
              <div
                id="feature-shadowwire"
                data-animate
                className={`group bg-gradient-to-br from-bagel-cream to-white rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-500 delay-100 ${isVisible['feature-shadowwire'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                <div className="w-14 h-14 bg-bagel-sesame/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-bagel-sesame" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-bagel-dark mb-3">Zero-Knowledge Transfers</h3>
                <p className="text-gray-600 mb-4">
                  Withdrawals use Bulletproof range proofs to validate transfers without revealing amounts.
                  The network verifies correctness, not values.
                </p>
                <div className="flex items-center text-sm text-bagel-orange font-medium">
                  Powered by ShadowWire
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* MagicBlock Card */}
              <div
                id="feature-magicblock"
                data-animate
                className={`group bg-gradient-to-br from-bagel-cream to-white rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-500 delay-200 ${isVisible['feature-magicblock'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-bagel-dark mb-3">Real-Time Streaming</h3>
                <p className="text-gray-600 mb-4">
                  Salaries stream per-second using MagicBlock's ephemeral rollups.
                  Employees see their balance grow in real-time with sub-second updates.
                </p>
                <div className="flex items-center text-sm text-bagel-orange font-medium">
                  Powered by MagicBlock ER
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Kamino Card */}
              <div
                id="feature-kamino"
                data-animate
                className={`group bg-gradient-to-br from-bagel-cream to-white rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-500 delay-300 ${isVisible['feature-kamino'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-bagel-dark mb-3">Automated Yield</h3>
                <p className="text-gray-600 mb-4">
                  Idle payroll funds earn 5-10% APY through Kamino vaults.
                  Yield is split 80/20 between employees and employers automatically.
                </p>
                <div className="flex items-center text-sm text-bagel-orange font-medium">
                  Powered by Kamino Finance
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            HOW IT WORKS
        ============================================ */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-bagel-cream/50">
          <div className="max-w-7xl mx-auto">
            <div
              id="how-header"
              data-animate
              className={`text-center mb-16 transition-all duration-700 ${isVisible['how-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-4">
                How Bagel works
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                A straightforward workflow for employers and employees
              </p>
            </div>

            {/* Steps */}
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: '01',
                  title: 'Create Payroll',
                  description: 'Employer creates a PayrollJar with encrypted salary rate and employee address.',
                  icon: '📝'
                },
                {
                  step: '02',
                  title: 'Deposit Funds',
                  description: 'Funds are deposited and automatically split: 90% to yield vault, 10% liquid.',
                  icon: '💰'
                },
                {
                  step: '03',
                  title: 'Stream in Real-Time',
                  description: 'Salary streams per-second. Employee watches balance grow continuously.',
                  icon: '⚡'
                },
                {
                  step: '04',
                  title: 'Withdraw Privately',
                  description: 'Employee withdraws with ZK proof. Transfer amount stays completely hidden.',
                  icon: '🔒'
                }
              ].map((item, index) => (
                <div
                  key={item.step}
                  id={`step-${item.step}`}
                  data-animate
                  className={`relative transition-all duration-700 ${isVisible[`step-${item.step}`] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Connector line */}
                  {index < 3 && (
                    <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-bagel-orange/30 to-transparent"></div>
                  )}

                  <div className="relative bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-4">{item.icon}</div>
                    <div className="text-xs font-bold text-bagel-orange mb-2">STEP {item.step}</div>
                    <h3 className="text-lg font-bold text-bagel-dark mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            KEY BENEFITS
        ============================================ */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-6">
                  Built for teams that value privacy
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Bagel provides real financial privacy without compromising on the features
                  modern teams need from payroll infrastructure.
                </p>

                <div className="space-y-6">
                  {[
                    {
                      title: 'Complete Confidentiality',
                      description: 'Salary amounts are never visible on-chain. Not to validators, not to explorers, not to anyone.',
                    },
                    {
                      title: 'Continuous Payments',
                      description: 'No more waiting for payday. Salaries stream per-second, accessible anytime.',
                    },
                    {
                      title: 'Passive Income',
                      description: 'Idle funds automatically earn yield. Employees get 80% of generated returns.',
                    },
                    {
                      title: 'Verifiable Security',
                      description: 'Open source code. Auditable privacy guarantees. No trust required.',
                    },
                  ].map((benefit, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-6 h-6 bg-bagel-orange/10 rounded-full flex items-center justify-center mt-1">
                        <svg className="w-4 h-4 text-bagel-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-bagel-dark mb-1">{benefit.title}</h4>
                        <p className="text-gray-600 text-sm">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats/Visual */}
              <div className="bg-gradient-to-br from-bagel-cream to-white rounded-3xl p-8 border border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="text-3xl font-bold text-bagel-orange mb-2">5-10%</div>
                    <div className="text-sm text-gray-600">APY on idle funds</div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="text-3xl font-bold text-bagel-orange mb-2">1 sec</div>
                    <div className="text-sm text-gray-600">Streaming granularity</div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="text-3xl font-bold text-bagel-orange mb-2">0 bytes</div>
                    <div className="text-sm text-gray-600">Salary data exposed</div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="text-3xl font-bold text-bagel-orange mb-2">80/20</div>
                    <div className="text-sm text-gray-600">Yield split to employees</div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-bagel-dark rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-bagel-orange rounded-full flex items-center justify-center text-white text-sm">🔒</div>
                    <span className="text-white font-medium">Privacy by Default</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Every operation in Bagel is private by default. No configuration needed.
                    No opt-in required. Privacy is the foundation, not a feature.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            ARCHITECTURE / TRUST
        ============================================ */}
        <section id="architecture" className="py-24 px-4 sm:px-6 lg:px-8 bg-bagel-dark">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Thoughtfully architected
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                A layered architecture that separates concerns and composes privacy primitives
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur rounded-3xl border border-white/10 p-8 md:p-12">
              {/* Architecture Diagram */}
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <div className="bg-bagel-orange/20 rounded-2xl p-6 mb-4">
                    <div className="text-2xl mb-2">🖥️</div>
                    <div className="text-white font-semibold">Client Layer</div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Next.js frontend with Solana wallet adapter.
                    Real-time UI updates without RPC spam.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-bagel-sesame/20 rounded-2xl p-6 mb-4">
                    <div className="text-2xl mb-2">⚙️</div>
                    <div className="text-white font-semibold">Program Layer</div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Anchor-based Solana program with 6 instructions.
                    PDA-based account model for deterministic addresses.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-500/20 rounded-2xl p-6 mb-4">
                    <div className="text-2xl mb-2">🔐</div>
                    <div className="text-white font-semibold">Privacy Layer</div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Four integrated privacy technologies.
                    Modular design allows upgrading individual components.
                  </p>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="border-t border-white/10 pt-8">
                <div className="text-center mb-6">
                  <span className="text-sm font-medium text-gray-400">TECHNOLOGY STACK</span>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  {['Solana', 'Anchor', 'Next.js', 'TypeScript', 'Tailwind', 'Arcium', 'ShadowWire', 'MagicBlock', 'Kamino'].map((tech) => (
                    <span key={tech} className="px-4 py-2 bg-white/10 rounded-full text-white text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            DEVELOPER EXPERIENCE
        ============================================ */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Code Preview */}
              <div className="order-2 lg:order-1">
                <div className="bg-bagel-dark rounded-2xl overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 bg-black/20">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-400 text-sm ml-2">bagel-client.ts</span>
                  </div>
                  <pre className="p-6 text-sm overflow-x-auto">
                    <code className="text-gray-300">
{`// Create a new payroll
const payroll = await createPayroll(
  connection,
  wallet,
  employeeAddress,
  salaryPerSecond  // Automatically encrypted
);

// Stream salary in real-time
const balance = calculateStreamedBalance(
  payroll.lastWithdraw,
  payroll.salaryPerSecond
);

// Withdraw with ZK privacy
const tx = await withdrawPrivately(
  connection,
  wallet,
  payroll  // Amount never exposed
);`}
                    </code>
                  </pre>
                </div>
              </div>

              {/* DX Copy */}
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-6">
                  Clean APIs for developers
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  We've invested in developer experience so you can integrate Bagel
                  without wrestling with complexity.
                </p>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-bagel-cream rounded-xl flex items-center justify-center">
                      <span className="text-xl">📦</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-bagel-dark mb-1">TypeScript-First</h4>
                      <p className="text-gray-600 text-sm">Full type definitions. IntelliSense support. Catch errors at compile time.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-bagel-cream rounded-xl flex items-center justify-center">
                      <span className="text-xl">📚</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-bagel-dark mb-1">Comprehensive Docs</h4>
                      <p className="text-gray-600 text-sm">16 documentation pages covering architecture, concepts, and API reference.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-bagel-cream rounded-xl flex items-center justify-center">
                      <span className="text-xl">🔓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-bagel-dark mb-1">Open Source</h4>
                      <p className="text-gray-600 text-sm">4,100+ lines of production code. MIT licensed. Fork, audit, contribute.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <Link href="/docs" className="btn-primary">
                    Read the Docs
                  </Link>
                  <a
                    href="https://github.com/ConejoCapital/Bagel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            SOCIAL PROOF / CREDIBILITY
        ============================================ */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-bagel-cream/30 border-y border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Built with industry-leading privacy infrastructure
              </span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
              <div className="text-center">
                <div className="text-2xl font-bold text-bagel-dark">Arcium</div>
                <div className="text-xs text-gray-500">MPC Network</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-bagel-dark">ShadowWire</div>
                <div className="text-xs text-gray-500">Bulletproofs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-bagel-dark">MagicBlock</div>
                <div className="text-xs text-gray-500">Ephemeral Rollups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-bagel-dark">Kamino</div>
                <div className="text-xs text-gray-500">DeFi Yield</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            FINAL CTA
        ============================================ */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-bagel-cream">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-6">
              Ready to run payroll privately?
            </h2>
            <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
              Join teams that value financial privacy. Start streaming salaries
              with encrypted storage, ZK transfers, and automated yield today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/" className="btn-primary px-10 py-4 text-lg">
                Launch App
              </Link>
              <Link href="/docs" className="btn-secondary px-10 py-4 text-lg">
                Read Documentation
              </Link>
            </div>

            <p className="text-sm text-gray-500">
              Currently live on Solana Devnet. Production deployment coming soon.
            </p>
          </div>
        </section>

        {/* ============================================
            FOOTER
        ============================================ */}
        <footer className="bg-bagel-dark py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              {/* Brand */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-bagel-orange rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">🥯</span>
                  </div>
                  <span className="text-xl font-bold text-white">Bagel</span>
                </div>
                <p className="text-gray-400 mb-6 max-w-sm">
                  Privacy-first payroll infrastructure for Solana.
                  Real-time streaming, zero-knowledge transfers, automated yield.
                </p>
                <p className="text-sm text-gray-500">
                  Built for Solana Privacy Hackathon 2026
                </p>
              </div>

              {/* Resources */}
              <div>
                <h4 className="text-white font-semibold mb-4">Resources</h4>
                <ul className="space-y-3">
                  <li><Link href="/docs" className="text-gray-400 hover:text-white transition-colors text-sm">Documentation</Link></li>
                  <li><a href="https://github.com/ConejoCapital/Bagel" className="text-gray-400 hover:text-white transition-colors text-sm">GitHub</a></li>
                  <li><a href="https://explorer.solana.com/address/8rgaVvV6m3SSaVJfJ2VNoBk67frTWbCS3WDBjrk7S6gU?cluster=devnet" className="text-gray-400 hover:text-white transition-colors text-sm">Solana Explorer</a></li>
                </ul>
              </div>

              {/* Connect */}
              <div>
                <h4 className="text-white font-semibold mb-4">Connect</h4>
                <ul className="space-y-3">
                  <li><a href="https://twitter.com/ConejoCapital" className="text-gray-400 hover:text-white transition-colors text-sm">Twitter</a></li>
                  <li><a href="https://github.com/ConejoCapital" className="text-gray-400 hover:text-white transition-colors text-sm">GitHub</a></li>
                </ul>
              </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} ConejoCapital. Open source under MIT license.
              </p>
              <p className="text-sm text-gray-500">
                Simple payroll, private paydays, and a little extra cream cheese 🥯
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
