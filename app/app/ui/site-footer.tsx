'use client';

import Link from 'next/link';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';

export default function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-800/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-xs font-semibold text-slate-300">
              BB
            </div>
            <div>
              <p className="text-sm font-semibold text-white">BallBoxd</p>
              <p className="text-xs text-slate-400">
                {t('home.subtitle')}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {t('footer.address')}
          </p>
        </div>

        <div className="grid gap-8 text-sm text-slate-400 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {t('nav.panel')}
            </p>
            <Link href="/home" className="block hover:text-slate-200">
              {t('nav.home')}
            </Link>
            <Link href="/matches" className="block hover:text-slate-200">
              {t('nav.matches')}
            </Link>
            <Link href="/login" className="block hover:text-slate-200">
              {t('nav.login')}
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {t('footer.social.title')}
            </p>
            <span className="block text-slate-500">
              {t('footer.social.instagram')}
            </span>
            <span className="block text-slate-500">
              {t('footer.social.twitter')}
            </span>
            <span className="block text-slate-500">
              {t('footer.social.tiktok')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
