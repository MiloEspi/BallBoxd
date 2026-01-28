'use client';

import Link from 'next/link';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import LandingRedirect from './landing-redirect';

export default function Page() {
  const { t } = useLanguage();
  const features = [
    {
      title: t('marketing.feature1.title'),
      copy: t('marketing.feature1.copy'),
    },
    {
      title: t('marketing.feature2.title'),
      copy: t('marketing.feature2.copy'),
    },
    {
      title: t('marketing.feature3.title'),
      copy: t('marketing.feature3.copy'),
    },
  ];

  return (
    <>
      <LandingRedirect />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            BallBoxd
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            {t('marketing.title')}
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            {t('marketing.subtitle')}
          </p>
        </header>

        <section className="flex flex-wrap gap-4">
          <Link
            href="/home"
            className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            {t('marketing.cta.enterHome')}
          </Link>
          <Link
            href="/matches/placeholder"
            className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
          >
            {t('marketing.cta.viewMatch')}
          </Link>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
            >
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{item.copy}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
