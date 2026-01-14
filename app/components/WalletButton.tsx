import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="wallet-adapter-button wallet-adapter-button-trigger">
        Loading...
      </button>
    );
  }

  return <WalletMultiButton />;
}
