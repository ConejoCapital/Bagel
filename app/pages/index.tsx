import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Shield,
  Zap,
  DollarSign,
  Eye,
  TrendingUp,
  Wallet,
  ArrowRight,
  Menu,
  X,
  Github,
  ExternalLink,
  CheckCircle2,
  Code2,
  FileText,
  Unlock,
  ChevronRight,
} from 'lucide-react';
import { BagelLoader } from '../components/ui/holo-pulse-loader';
import ScrollMorphHero from '../components/ui/scroll-morph-hero';

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Show loader initially
  if (isLoading) {
    return <BagelLoader text="Initializing" size="lg" />;
  }

  return (
    <>
      <Head>
        <title>Bagel - Privacy-First Payroll for Solana</title>
        <meta name="description" content="Run payroll with complete financial privacy. Real-time streaming payments, FHE encrypted transfers, and automated yield generation on Solana." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="Bagel - Privacy-First Payroll for Solana" />
        <meta property="og:description" content="Run payroll with complete financial privacy. Real-time streaming, FHE encrypted transfers, automated yield." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bagel - Privacy-First Payroll" />
        <meta name="twitter:description" content="Run payroll with complete financial privacy on Solana." />
      </Head>

      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen bg-[#F7F7F2]"
        >
          {/* ============================================
              SCROLL MORPH HERO - FIRST THING USERS SEE
          ============================================ */}
          <section className="relative h-[85vh] min-h-[600px]">
            <ScrollMorphHero />
          </section>

          {/* ============================================
              NAVIGATION - Fixed on top
          ============================================ */}
          <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="fixed top-0 left-0 right-0 bg-[#F7F7F2]/95 backdrop-blur-sm border-b border-gray-100 z-50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 10 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 bg-bagel-orange rounded-full flex items-center justify-center"
                  >
                    <span className="text-white text-xl">🥯</span>
                  </motion.div>
                  <span className="text-xl font-bold text-bagel-dark">Bagel</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                  {['Features', 'How it works', 'Architecture'].map((item, i) => (
                    <motion.a
                      key={item}
                      href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      whileHover={{ y: -2 }}
                      className="text-gray-600 hover:text-bagel-dark transition-colors text-sm font-medium"
                    >
                      {item}
                    </motion.a>
                  ))}
                  <motion.a
                    href="https://github.com/ConejoCapital/Bagel"
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ y: -2 }}
                    className="text-gray-600 hover:text-bagel-dark transition-colors text-sm font-medium flex items-center gap-1"
                  >
                    <Github size={16} />
                    GitHub
                  </motion.a>
                </div>

                {/* CTA Buttons */}
                <div className="hidden md:flex items-center gap-3">
                  <a href="https://docs-bagel.vercel.app/docs/intro" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-600 hover:text-bagel-dark transition-colors px-4 py-2">
                    Documentation
                  </a>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link href="/dashboard" className="btn-primary text-sm flex items-center gap-2">
                      Launch App
                      <ArrowRight size={16} />
                    </Link>
                  </motion.div>
                </div>

                {/* Mobile menu button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="md:hidden p-2"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="w-6 h-6 text-bagel-dark" />
                  ) : (
                    <Menu className="w-6 h-6 text-bagel-dark" />
                  )}
                </motion.button>
              </div>

              {/* Mobile Navigation */}
              <AnimatePresence>
                {mobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:hidden py-4 border-t border-gray-100 overflow-hidden"
                  >
                    <div className="flex flex-col gap-4">
                      <a href="#features" className="text-gray-600 hover:text-bagel-dark text-sm font-medium">Features</a>
                      <a href="#how-it-works" className="text-gray-600 hover:text-bagel-dark text-sm font-medium">How it works</a>
                      <a href="#architecture" className="text-gray-600 hover:text-bagel-dark text-sm font-medium">Architecture</a>
                      <a href="https://github.com/ConejoCapital/Bagel" className="text-gray-600 hover:text-bagel-dark text-sm font-medium flex items-center gap-1">
                        <Github size={16} /> GitHub
                      </a>
                      <Link href="/dashboard" className="btn-primary text-sm text-center">Launch App</Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.nav>

          {/* ============================================
              HERO SECTION
          ============================================ */}
          <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-[#F7F7F2]">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Hero Copy */}
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  <motion.div
                    variants={fadeInUp}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-bagel-orange/10 text-bagel-orange text-sm font-medium mb-6"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 bg-bagel-orange rounded-full mr-2"
                    />
                    Live on Solana Devnet
                  </motion.div>

                  <motion.h1
                    variants={fadeInUp}
                    className="text-4xl sm:text-5xl lg:text-6xl font-bold text-bagel-dark leading-tight mb-6"
                  >
                    Payroll that respects
                    <span className="text-bagel-orange"> financial privacy</span>
                  </motion.h1>

                  <motion.p
                    variants={fadeInUp}
                    className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl"
                  >
                    Run payroll on Solana with encrypted salaries, FHE confidential transfers,
                    and automated yield generation. Your team's compensation stays private.
                  </motion.p>

                  <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
                    <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                      <Link href="/dashboard" className="btn-primary text-center px-8 py-4 text-base flex items-center justify-center gap-2">
                        Launch App
                        <ArrowRight size={18} />
                      </Link>
                    </motion.div>
                    <motion.a
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      href="https://github.com/ConejoCapital/Bagel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-center px-8 py-4 text-base flex items-center justify-center gap-2"
                    >
                      <Github size={18} />
                      View on GitHub
                    </motion.a>
                  </motion.div>

                  {/* Trust indicators */}
                  <motion.div
                    variants={fadeInUp}
                    className="flex items-center gap-6 mt-10 pt-8 border-t border-gray-200"
                  >
                    {[
                      { value: '4,100+', label: 'Lines of code' },
                      { value: '4', label: 'Privacy integrations' },
                      { value: '100%', label: 'Open source' },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="text-center"
                      >
                        <div className="text-2xl font-bold text-bagel-dark">{stat.value}</div>
                        <div className="text-sm text-gray-500">{stat.label}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>

                {/* Hero Visual - Product Preview */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-bagel-orange/20 to-bagel-sesame/20 rounded-lg blur-3xl" />
                  <motion.div
                    whileHover={{ y: -5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="relative bg-white rounded-md shadow-2xl overflow-hidden border border-gray-100"
                  >
                    {/* Mock Dashboard Header */}
                    <div className="bg-bagel-cream px-6 py-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-bagel-orange rounded-full flex items-center justify-center text-white text-sm">🥯</div>
                          <span className="font-semibold text-bagel-dark">Employee Dashboard</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-2 h-2 bg-green-500 rounded-full"
                          />
                          <span className="text-sm text-gray-500">Live</span>
                        </div>
                      </div>
                    </div>

                    {/* Mock Streaming Balance */}
                    <div className="p-6">
                      <div className="text-sm text-gray-500 mb-2">Current Balance</div>
                      <div className="flex items-baseline gap-2 mb-6">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-4xl font-bold text-bagel-dark"
                        >
                          12.847391
                        </motion.span>
                        <span className="text-xl text-gray-400">SOL</span>
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <motion.span
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-1.5 h-1.5 bg-green-500 rounded-full"
                          />
                          Streaming
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-bagel-cream/50 rounded p-4">
                          <div className="text-sm text-gray-500 mb-1">Rate</div>
                          <div className="font-semibold text-bagel-dark">0.0031 SOL/sec</div>
                        </div>
                        <div className="bg-bagel-cream/50 rounded p-4">
                          <div className="text-sm text-gray-500 mb-1">Yield Bonus</div>
                          <div className="font-semibold text-bagel-orange">+0.42 SOL</div>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-bagel-orange text-white py-3 rounded font-semibold flex items-center justify-center gap-2"
                      >
                        <Shield size={18} />
                        Withdraw Privately
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Floating privacy badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    className="absolute -bottom-4 -left-4 bg-white rounded shadow-lg p-4 border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-bagel-dark">FHE Protected</div>
                        <div className="text-xs text-gray-500">Amount hidden</div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ============================================
              PROBLEM STATEMENT
          ============================================ */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-bagel-cream/50">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-6"
              >
                Traditional crypto payroll is a glass office
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto"
              >
                When you pay salaries on-chain, everyone can see everything.
                Competitors learn your burn rate. Colleagues compare salaries.
                Financial privacy disappears.
              </motion.p>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: Eye, title: 'Visible Salaries', desc: 'Every payment amount is public on the blockchain' },
                  { icon: TrendingUp, title: 'Exposed Burn Rate', desc: 'Competitors can calculate your runway' },
                  { icon: Wallet, title: 'Idle Capital', desc: 'Payroll funds sit earning nothing' },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-white rounded-md p-6 border border-gray-100 shadow-sm"
                  >
                    <item.icon className="w-8 h-8 text-bagel-orange mb-3 mx-auto" />
                    <h4 className="font-semibold text-bagel-dark mb-2">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================
              FEATURES
          ============================================ */}
          <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F7F2]">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-4">
                  Privacy built into every layer
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Four integrated privacy technologies ensure your payroll data stays confidential
                  from storage to transfer to computation.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-8">
                {[
                  {
                    icon: Lock,
                    title: 'Encrypted Salary Storage',
                    desc: "Salaries are encrypted using Inco Lightning FHE before being stored on-chain. Even validators cannot see the actual amounts.",
                    powered: 'Inco Lightning',
                    color: 'bg-bagel-orange/10',
                    iconColor: 'text-bagel-orange'
                  },
                  {
                    icon: Shield,
                    title: 'Confidential Transfers',
                    desc: 'Transfers use Inco FHE to keep amounts encrypted end-to-end. Only authorized parties can decrypt and view the actual values.',
                    powered: 'Inco FHE',
                    color: 'bg-bagel-sesame/20',
                    iconColor: 'text-bagel-sesame'
                  },
                  {
                    icon: Zap,
                    title: 'Real-Time Streaming',
                    desc: "Salaries stream per-second using MagicBlock's ephemeral rollups. Employees see their balance grow in real-time with sub-second updates.",
                    powered: 'MagicBlock ER',
                    color: 'bg-blue-100',
                    iconColor: 'text-blue-600'
                  },
                  {
                    icon: DollarSign,
                    title: 'Automated Yield',
                    desc: 'Idle payroll funds can be delegated to yield-generating strategies. Yield is split between employees and employers automatically.',
                    powered: 'Yield Strategies',
                    color: 'bg-green-100',
                    iconColor: 'text-green-600'
                  },
                ].map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="group bg-gradient-to-br from-bagel-cream to-white rounded-md p-8 border border-gray-100 hover:shadow-xl transition-all duration-300"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`w-14 h-14 ${feature.color} rounded-md flex items-center justify-center mb-6`}
                    >
                      <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                    </motion.div>
                    <h3 className="text-xl font-bold text-bagel-dark mb-3">{feature.title}</h3>
                    <p className="text-gray-600 mb-4">{feature.desc}</p>
                    <div className="flex items-center text-sm text-bagel-orange font-medium">
                      Powered by {feature.powered}
                      <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================
              HOW IT WORKS
          ============================================ */}
          <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-bagel-cream/50">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-4">
                  How Bagel works
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  A straightforward workflow for employers and employees
                </p>
              </motion.div>

              <div className="grid md:grid-cols-4 gap-8">
                {[
                  { step: '01', title: 'Create Payroll', desc: 'Employer registers a business and adds employees with encrypted salary rates.', icon: '📝' },
                  { step: '02', title: 'Deposit Funds', desc: 'Funds are deposited and automatically split: 90% to yield vault, 10% liquid.', icon: '💰' },
                  { step: '03', title: 'Stream in Real-Time', desc: 'Salary streams per-second. Employee watches balance grow continuously.', icon: '⚡' },
                  { step: '04', title: 'Withdraw Privately', desc: 'Employee withdraws with FHE decryption. Transfer amount stays completely hidden.', icon: '🔒' },
                ].map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="relative"
                  >
                    {i < 3 && (
                      <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-bagel-orange/30 to-transparent" />
                    )}
                    <motion.div
                      whileHover={{ y: -5 }}
                      className="relative bg-white rounded-md p-6 border border-gray-100 hover:shadow-lg transition-shadow"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 10 }}
                        className="text-4xl mb-4"
                      >
                        {item.icon}
                      </motion.div>
                      <div className="text-xs font-bold text-bagel-orange mb-2">STEP {item.step}</div>
                      <h3 className="text-lg font-bold text-bagel-dark mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================
              KEY BENEFITS
          ============================================ */}
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F7F2]">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-6">
                    Built for teams that value privacy
                  </h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Bagel provides real financial privacy without compromising on the features
                    modern teams need from payroll infrastructure.
                  </p>

                  <div className="space-y-6">
                    {[
                      { title: 'Complete Confidentiality', desc: 'Salary amounts are never visible on-chain. Not to validators, not to explorers, not to anyone.' },
                      { title: 'Continuous Payments', desc: 'No more waiting for payday. Salaries stream per-second, accessible anytime.' },
                      { title: 'Passive Income', desc: 'Idle funds automatically earn yield. Employees get 80% of generated returns.' },
                      { title: 'Verifiable Security', desc: 'Open source code. Auditable privacy guarantees. No trust required.' },
                    ].map((benefit, i) => (
                      <motion.div
                        key={benefit.title}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-4"
                      >
                        <div className="flex-shrink-0 w-6 h-6 bg-bagel-orange/10 rounded-full flex items-center justify-center mt-1">
                          <CheckCircle2 className="w-4 h-4 text-bagel-orange" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-bagel-dark mb-1">{benefit.title}</h4>
                          <p className="text-gray-600 text-sm">{benefit.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-bagel-cream to-white rounded-lg p-8 border border-gray-100"
                >
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { value: '5-10%', label: 'APY on idle funds' },
                      { value: '1 sec', label: 'Streaming granularity' },
                      { value: '0 bytes', label: 'Salary data exposed' },
                      { value: '80/20', label: 'Yield split to employees' },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white rounded-md p-6 shadow-sm"
                      >
                        <div className="text-3xl font-bold text-bagel-orange mb-2">{stat.value}</div>
                        <div className="text-sm text-gray-600">{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="mt-8 p-6 bg-bagel-orange/10 rounded-md border border-bagel-orange/20"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-bagel-orange rounded-full flex items-center justify-center">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-bagel-dark font-medium">Privacy by Default</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Every operation in Bagel is private by default. No configuration needed.
                      No opt-in required. Privacy is the foundation, not a feature.
                    </p>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ============================================
              ARCHITECTURE
          ============================================ */}
          <section id="architecture" className="py-24 px-4 sm:px-6 lg:px-8 bg-bagel-cream/50">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-4">
                  Thoughtfully architected
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  A layered architecture that separates concerns and composes privacy primitives
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg border border-gray-100 p-8 md:p-12 shadow-sm"
              >
                <div className="grid md:grid-cols-3 gap-8 mb-12">
                  {[
                    { icon: '🖥️', title: 'Client Layer', desc: 'Next.js frontend with Solana wallet adapter. Real-time UI updates without RPC spam.', color: 'bg-bagel-orange/10' },
                    { icon: '⚙️', title: 'Program Layer', desc: 'Anchor-based Solana program with 6 instructions. PDA-based account model for deterministic addresses.', color: 'bg-bagel-sesame/10' },
                    { icon: '🔐', title: 'Privacy Layer', desc: 'Four integrated privacy technologies. Modular design allows upgrading individual components.', color: 'bg-blue-50' },
                  ].map((layer, i) => (
                    <motion.div
                      key={layer.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="text-center"
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className={`${layer.color} rounded-md p-6 mb-4 border border-gray-100`}
                      >
                        <div className="text-2xl mb-2">{layer.icon}</div>
                        <div className="text-bagel-dark font-semibold">{layer.title}</div>
                      </motion.div>
                      <p className="text-gray-600 text-sm">{layer.desc}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-8">
                  <div className="text-center mb-6">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Technology Stack</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    {['Solana', 'Anchor', 'Next.js', 'TypeScript', 'Tailwind', 'Inco Lightning', 'ShadowWire', 'MagicBlock', 'Range'].map((tech, i) => (
                      <motion.span
                        key={tech}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.1 }}
                        className="px-4 py-2 bg-bagel-cream rounded-full text-bagel-dark text-sm border border-gray-200"
                      >
                        {tech}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ============================================
              DEVELOPER EXPERIENCE
          ============================================ */}
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F7F2]">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                {/* Code Preview */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="order-2 lg:order-1"
                >
                  <div className="bg-white rounded-md overflow-hidden shadow-xl border border-gray-200">
                    <div className="flex items-center gap-2 px-4 py-3 bg-bagel-cream border-b border-gray-100">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                      <span className="text-gray-500 text-sm ml-2">bagel-client.ts</span>
                    </div>
                    <pre className="p-6 text-sm overflow-x-auto bg-gray-50">
                      <code className="text-gray-700">
{`// Encrypt salary with Inco FHE
const { ciphertext } = await incoClient.encryptSalary(
  BigInt(salaryPerSecond)  // Amount never visible on-chain
);

// Transfer confidential tokens
await transferConfidential(
  connection,
  sourceAccount,
  destinationAccount,
  ciphertext,  // Encrypted amount
  wallet
);

// Decrypt balance (requires wallet signature)
const balance = await incoClient.decryptSalary(
  encryptedHandle,
  wallet  // Only authorized users can decrypt
);`}
                      </code>
                    </pre>
                  </div>
                </motion.div>

                {/* DX Copy */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="order-1 lg:order-2"
                >
                  <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-6">
                    Clean APIs for developers
                  </h2>
                  <p className="text-lg text-gray-600 mb-8">
                    We've invested in developer experience so you can integrate Bagel
                    without wrestling with complexity.
                  </p>

                  <div className="space-y-6">
                    {[
                      { icon: Code2, title: 'TypeScript-First', desc: 'Full type definitions. IntelliSense support. Catch errors at compile time.' },
                      { icon: FileText, title: 'Comprehensive Docs', desc: '16 documentation pages covering architecture, concepts, and API reference.' },
                      { icon: Unlock, title: 'Open Source', desc: '4,100+ lines of production code. MIT licensed. Fork, audit, contribute.' },
                    ].map((item, i) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-4"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-bagel-cream rounded flex items-center justify-center">
                          <item.icon className="w-5 h-5 text-bagel-orange" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-bagel-dark mb-1">{item.title}</h4>
                          <p className="text-gray-600 text-sm">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-8 flex gap-4">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <a href="https://docs-bagel.vercel.app/docs/intro" target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
                        <FileText size={18} />
                        Read the Docs
                      </a>
                    </motion.div>
                    <motion.a
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      href="https://github.com/ConejoCapital/Bagel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Github size={18} />
                      GitHub
                    </motion.a>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ============================================
              SOCIAL PROOF
          ============================================ */}
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-bagel-cream/30 border-y border-gray-100">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Built with industry-leading privacy infrastructure
                </span>
              </motion.div>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                {[
                  { name: 'Inco Lightning', type: 'FHE Encryption' },
                  { name: 'ShadowWire', type: 'Bulletproofs' },
                  { name: 'MagicBlock', type: 'Ephemeral Rollups' },
                  { name: 'Helius', type: 'RPC & APIs' },
                  { name: 'Solana Explorer', type: 'Transaction Visibility' },
                  { name: 'Yield Strategies', type: 'DeFi Integration' },
                ].map((partner, i) => (
                  <motion.div
                    key={partner.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="text-center"
                  >
                    <div className="text-2xl font-bold text-bagel-dark">{partner.name}</div>
                    <div className="text-xs text-gray-500">{partner.type}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================
              FINAL CTA
          ============================================ */}
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-bagel-cream">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-bagel-dark mb-6">
                Ready to run payroll privately?
              </h2>
              <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
                Join teams that value financial privacy. Start streaming salaries
                with encrypted storage, FHE transfers, and automated yield today.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/dashboard" className="btn-primary px-10 py-4 text-lg flex items-center justify-center gap-2">
                    Launch App
                    <ArrowRight size={20} />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <a href="https://docs-bagel.vercel.app/docs/intro" target="_blank" rel="noopener noreferrer" className="btn-secondary px-10 py-4 text-lg flex items-center justify-center gap-2">
                    <FileText size={20} />
                    Read Documentation
                  </a>
                </motion.div>
              </div>

              <p className="text-sm text-gray-500">
                Currently live on Solana Devnet. Production deployment coming soon.
              </p>
            </motion.div>
          </section>

          {/* ============================================
              FOOTER
          ============================================ */}
          <footer className="bg-bagel-cream py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-4 gap-12 mb-12">
                {/* Brand */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <motion.div
                      whileHover={{ rotate: 20 }}
                      className="w-10 h-10 bg-bagel-orange rounded-full flex items-center justify-center"
                    >
                      <span className="text-white text-xl">🥯</span>
                    </motion.div>
                    <span className="text-xl font-bold text-bagel-dark">Bagel</span>
                  </div>
                  <p className="text-gray-600 mb-6 max-w-sm">
                    Privacy-first payroll infrastructure for Solana.
                    Real-time streaming, FHE confidential transfers, automated yield.
                  </p>
                  <p className="text-sm text-gray-500">
                    Built for Solana Privacy Hackathon 2026
                  </p>
                </div>

                {/* Resources */}
                <div>
                  <h4 className="text-bagel-dark font-semibold mb-4">Resources</h4>
                  <ul className="space-y-3">
                    <li><a href="https://docs-bagel.vercel.app/docs/intro" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-bagel-orange transition-colors text-sm">Documentation</a></li>
                    <li><a href="https://github.com/ConejoCapital/Bagel" className="text-gray-600 hover:text-bagel-orange transition-colors text-sm flex items-center gap-1"><Github size={14} /> GitHub</a></li>
                    <li><a href="https://orbmarkets.io/address/J45uxvT26szuQcmxvs5NRgtAMornKM9Ga9WaQ58bKUNE?cluster=devnet" className="text-gray-600 hover:text-bagel-orange transition-colors text-sm flex items-center gap-1"><ExternalLink size={14} /> OrbMarkets</a></li>
                  </ul>
                </div>

                {/* Connect */}
                <div>
                  <h4 className="text-bagel-dark font-semibold mb-4">Connect</h4>
                  <ul className="space-y-3">
                    <li><a href="https://twitter.com/ConejoCapital" className="text-gray-600 hover:text-bagel-orange transition-colors text-sm">Twitter</a></li>
                    <li><a href="https://github.com/ConejoCapital" className="text-gray-600 hover:text-bagel-orange transition-colors text-sm flex items-center gap-1"><Github size={14} /> GitHub</a></li>
                  </ul>
                </div>

                {/* Team */}
                <div>
                  <h4 className="text-bagel-dark font-semibold mb-4">Team</h4>
                  <ul className="space-y-3">
                    <li>
                      <span className="text-gray-600 text-sm">Tomi — </span>
                      <a href="https://x.com/Tomi204_" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-bagel-orange transition-colors text-sm">X</a>
                      <span className="text-gray-500 text-sm"> · </span>
                      <a href="https://github.com/tomi204" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-bagel-orange transition-colors text-sm flex items-center gap-1 inline-flex"><Github size={14} /> GitHub</a>
                    </li>
                    <li>
                      <span className="text-gray-600 text-sm">Bunny — </span>
                      <a href="https://x.com/ConejoCapital" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-bagel-orange transition-colors text-sm">X</a>
                      <span className="text-gray-500 text-sm"> · </span>
                      <a href="https://github.com/ConejoCapital" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-bagel-orange transition-colors text-sm flex items-center gap-1 inline-flex"><Github size={14} /> GitHub</a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Bottom */}
              <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-500">
                  &copy; {new Date().getFullYear()} ConejoCapital. Open source under MIT license.
                </p>
                <p className="text-sm text-gray-500">
                  Simple payroll, private paydays, and a little extra cream cheese 🥯
                </p>
              </div>
            </div>
          </footer>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
