'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(isLoggedIn() ? '/chat' : '/login');
  }, [router]);
  return null;
}
