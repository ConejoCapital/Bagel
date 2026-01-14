import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';

export default function NetworkWarning() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isDevnet, setIsDevnet] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        // Check if we're connected to devnet by looking at genesis hash
        const genesisHash = await connection.getGenesisHash();
        
        // Devnet genesis hash
        const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
        
        setIsDevnet(genesisHash === DEVNET_GENESIS);
        setChecking(false);
      } catch (error) {
        console.error('Error checking network:', error);
        setChecking(false);
      }
    };

    if (wallet.connected) {
      checkNetwork();
    }
  }, [connection, wallet.connected]);

  if (!wallet.connected || checking) return null;

  if (!isDevnet) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <p className="font-bold text-lg">Wrong Network Detected!</p>
              <p className="text-sm">
                You're on <strong>Mainnet</strong> but Bagel is currently deployed on <strong>Devnet</strong>.
                Transactions will fail!
              </p>
            </div>
          </div>
          <div className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-sm">
            Switch to Devnet in your wallet settings
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white p-2 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2">
        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
        <p className="text-sm font-medium">
          ✅ Connected to Devnet - You're good to go!
        </p>
      </div>
    </div>
  );
}
