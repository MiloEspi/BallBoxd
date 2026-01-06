'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.replace('/feed');
    }
  }, [router]);

  return null;
}
