import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  House,
  PaperPlaneTilt,
  Wallet,
  ArrowLeft,
  CheckCircle,
  Warning,
  CircleNotch,
  ArrowSquareOut,
  CurrencyDollar,
  LockSimple,
  LockSimpleOpen,
  User,
  Copy,
  Info,
  Eye,
} from '@phosphor-icons/react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { decrypt } from '@inco/solana-sdk/attested-decrypt';
import {
  confidentialTransfer,
  resolveUserTokenAccount,
  getConfidentialBalance,
  USDBAGEL_MINT,
} from '../lib/bagel-client';

// Extract handle from IncoAccount data (u128 little-endian at offset 72)
function extractHandle(data: Buffer): bigint {
  const bytes = data.slice(72, 88);
  let result = BigInt(0);
  for (let i = 15; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  return result;
}

const WalletButton = dynamic(() => import('../components/WalletButton'), {
  ssr: false,
});

export default function SendPage() {
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const { connection } = useConnection();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txid, setTxid] = useState('');
  const [copied, setCopied] = useState(false);

  // Balance state
  const [encryptedHandle, setEncryptedHandle] = useState<bigint | null>(null);
  const [decryptedBalance, setDecryptedBalance] = useState<number | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Load balance on mount
  useEffect(() => {
    async function loadBalance() {
      if (!publicKey || !connected) {
        setEncryptedHandle(null);
        setDecryptedBalance(null);
        return;
      }

      setBalanceLoading(true);
      try {
        const tokenAccount = await resolveUserTokenAccount(connection, publicKey, USDBAGEL_MINT);
        if (tokenAccount) {
          const accountInfo = await connection.getAccountInfo(tokenAccount);
          if (accountInfo?.data) {
            const handle = extractHandle(accountInfo.data as Buffer);
            if (handle !== BigInt(0)) {
              setEncryptedHandle(handle);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load balance:', err);
      } finally {
        setBalanceLoading(false);
      }
    }
    loadBalance();
  }, [publicKey, connected, connection, txid]); // Reload after transfer

  // Decrypt balance
  const handleDecrypt = useCallback(async () => {
    if (!publicKey || !wallet.signMessage || !encryptedHandle) return;

    setDecrypting(true);
    try {
      const result = await decrypt([encryptedHandle.toString()], {
        address: publicKey,
        signMessage: wallet.signMessage,
      });

      if (result.plaintexts && result.plaintexts.length > 0) {
        const decryptedValue = Number(BigInt(result.plaintexts[0])) / 1_000_000_000;
        setDecryptedBalance(decryptedValue);
      }
    } catch (err: any) {
      console.error('Decrypt failed:', err);
      setError(err.message || 'Failed to decrypt balance');
    } finally {
      setDecrypting(false);
    }
  }, [publicKey, wallet.signMessage, encryptedHandle]);

  const handleSend = useCallback(async () => {
    if (!publicKey || !wallet.signTransaction) {
      setError('Please connect your wallet');
      return;
    }

    if (!recipient || recipient.length < 32) {
      setError('Please enter a valid wallet address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setTxid('');

      // Resolve sender's token account (PDA first, then localStorage fallback)
      const senderTokenAccount = await resolveUserTokenAccount(connection, publicKey, USDBAGEL_MINT);
      if (!senderTokenAccount) {
        throw new Error('No token account found. Please mint USDBagel tokens first from the Dashboard.');
      }

      console.log('💸 Initiating confidential transfer...');
      // confidentialTransfer now handles PDA derivation for recipient internally
      const signature = await confidentialTransfer(
        connection,
        wallet,
        recipient,
        parseFloat(amount),
        senderTokenAccount
      );

      setTxid(signature);
      console.log('✅ Transfer successful:', signature);
    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || 'Failed to send transfer');
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, publicKey, recipient, amount]);

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setRecipient('');
    setAmount('');
    setError('');
    setTxid('');
  };

  return (
    <>
      <Head>
        <title>Send - Bagel</title>
        <meta name="description" content="Send confidential token transfers" />
      </Head>

      <div className="min-h-screen bg-[#F7F7F2]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥯</span>
                <h1 className="text-xl font-bold text-bagel-dark">Send Payment</h1>
              </div>
            </div>
            <WalletButton />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!connected ? (
            <div className="bg-white rounded p-8 text-center">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-bagel-dark mb-2">Connect Your Wallet</h2>
              <p className="text-sm text-gray-600">Connect your wallet to send confidential transfers</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Send Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded p-6 border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-bagel-cream rounded flex items-center justify-center">
                    <PaperPlaneTilt className="w-5 h-5 text-bagel-orange" weight="fill" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-bagel-dark">Send Confidential Transfer</h2>
                    <p className="text-sm text-gray-500">FHE-encrypted token transfer</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* From Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="w-8 h-8 bg-bagel-orange/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-bagel-orange" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-bagel-dark">Your Wallet</div>
                        <div className="text-xs text-gray-500 font-mono truncate">{publicKey?.toBase58()}</div>
                      </div>
                      <button
                        onClick={copyAddress}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                    {/* Balance Display */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Available:</span>
                        {balanceLoading ? (
                          <CircleNotch className="w-3 h-3 animate-spin text-gray-400" />
                        ) : decryptedBalance !== null ? (
                          <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                            <LockSimpleOpen className="w-3 h-3" />
                            {decryptedBalance.toFixed(2)} USDBagel
                          </span>
                        ) : encryptedHandle ? (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <LockSimple className="w-3 h-3" />
                            ****
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No balance</span>
                        )}
                      </div>
                      {encryptedHandle && decryptedBalance === null && (
                        <button
                          onClick={handleDecrypt}
                          disabled={decrypting}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-bagel-orange bg-bagel-cream rounded hover:bg-bagel-orange/20 transition-colors disabled:opacity-50"
                        >
                          {decrypting ? (
                            <CircleNotch className="w-3 h-3 animate-spin" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                          {decrypting ? 'Decrypting...' : 'Show Balance'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* To Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="Enter recipient wallet address"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20 font-mono"
                      disabled={loading || !!txid}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recipient must have minted USDBagel tokens to receive transfers
                    </p>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <div className="relative">
                      <CurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-10 pr-28 py-3 bg-gray-50 border border-gray-200 rounded text-lg font-semibold focus:outline-none focus:border-bagel-orange focus:ring-1 focus:ring-bagel-orange/20"
                        disabled={loading || !!txid}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-bagel-cream rounded flex items-center gap-1">
                        <span className="text-sm">🥯</span>
                        <span className="text-xs font-semibold text-bagel-orange">USDBagel</span>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Info */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-bagel-orange/10 rounded flex items-center justify-center">
                        <LockSimple className="w-4 h-4 text-bagel-orange" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-bagel-dark">Confidential Transfer</div>
                        <div className="text-[10px] text-gray-500">Amount encrypted with FHE on Inco Network</div>
                      </div>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded">
                      <Warning className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" weight="fill" />
                      <div>
                        <div className="text-sm font-medium text-red-800">Error</div>
                        <div className="text-xs text-red-700">{error}</div>
                      </div>
                    </div>
                  )}

                  {/* Success */}
                  {txid && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" weight="fill" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-green-800">Transfer Sent!</div>
                        <div className="text-xs text-green-700 mt-1">
                          {amount} USDBagel sent to {recipient.slice(0, 8)}...{recipient.slice(-4)}
                        </div>
                        <div className="text-xs text-green-700 break-all mt-1 font-mono">{txid}</div>
                        <a
                          href={`https://orbmarkets.io/tx/${txid}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 mt-2 font-medium"
                        >
                          View on Explorer <ArrowSquareOut className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    {txid ? (
                      <button
                        onClick={resetForm}
                        className="flex-1 px-4 py-3 bg-bagel-orange text-white rounded text-sm font-medium"
                      >
                        Send Another
                      </button>
                    ) : (
                      <>
                        <Link
                          href="/dashboard"
                          className="flex-1 px-4 py-3 border border-gray-200 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
                        >
                          Cancel
                        </Link>
                        <motion.button
                          whileHover={{ scale: loading ? 1 : 1.01 }}
                          whileTap={{ scale: loading ? 1 : 0.99 }}
                          onClick={handleSend}
                          disabled={loading || !recipient || !amount}
                          className="flex-1 px-4 py-3 bg-bagel-orange text-white rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <CircleNotch className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                              Send Transfer
                            </>
                          )}
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-bagel-cream/50 rounded p-5 border border-bagel-orange/20"
              >
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-bagel-orange flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-bagel-dark mb-2">How Confidential Transfers Work</h3>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Amount is encrypted using Fully Homomorphic Encryption (FHE)</li>
                      <li>• Only sender and recipient can see the actual amount</li>
                      <li>• On-chain, the amount appears as encrypted ciphertext</li>
                      <li>• Powered by Inco Network's confidential computing</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
            <p className="text-xs">Bagel Privacy Payroll - Confidential Transfers on Solana</p>
          </div>
        </footer>
      </div>
    </>
  );
}
