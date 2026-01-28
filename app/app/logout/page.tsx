'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useLanguage } from '@/app/components/i18n/LanguageProvider';

export default function LogoutPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    router.replace('/');
  }, [router]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold text-white">
        {t('logout.title')}
      </h1>
      <p className="text-sm text-slate-400">
        {t('logout.message')}
      </p>
      <Link
        href="/"
        className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
      >
        {t('logout.cta')}
      </Link>
    </div>
  );
}
