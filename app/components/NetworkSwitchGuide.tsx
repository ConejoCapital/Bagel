export default function NetworkSwitchGuide() {
  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 mb-6">
      <h3 className="text-xl font-bold text-yellow-900 mb-3 flex items-center">
        <span className="text-2xl mr-2">⚠️</span>
        Important: Switch Your Wallet to Devnet
      </h3>
      
      <div className="space-y-4 text-sm">
        <p className="text-yellow-800">
          Bagel is currently deployed on <strong>Solana Devnet</strong> for testing. 
          You need to switch your wallet to Devnet before creating transactions.
        </p>

        <div className="bg-white rounded-lg p-4">
          <h4 className="font-bold text-gray-900 mb-2">📱 For Phantom Wallet:</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Click the Phantom extension</li>
            <li>Click the gear icon (⚙️) for Settings</li>
            <li>Scroll down to "Developer Settings"</li>
            <li>Toggle "Testnet Mode" ON</li>
            <li>Select "Devnet" from the network dropdown</li>
            <li>Refresh this page</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg p-4">
          <h4 className="font-bold text-gray-900 mb-2">🌟 For Solflare Wallet:</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Click the Solflare extension</li>
            <li>Click on "Mainnet" at the top</li>
            <li>Select "Devnet" from the dropdown</li>
            <li>Refresh this page</li>
          </ol>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-bold text-blue-900 mb-2">💰 Need Devnet SOL?</h4>
          <p className="text-blue-800 mb-2">
            Get free devnet SOL for testing:
          </p>
          <a
            href="https://faucet.solana.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
          >
            Get Devnet SOL →
          </a>
        </div>

        <div className="bg-gray-100 rounded-lg p-4">
          <h4 className="font-bold text-gray-900 mb-2">🔍 Verify Network:</h4>
          <p className="text-gray-700">
            After switching, you should see a green banner at the top of the page saying 
            "✅ Connected to Devnet". If you still see a red warning, try refreshing the page.
          </p>
        </div>
      </div>
    </div>
  );
}
