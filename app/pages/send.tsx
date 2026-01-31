import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Redirect to dashboard with transfer modal open
export default function SendPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard?transfer=true');
  }, [router]);

  return null;
}
