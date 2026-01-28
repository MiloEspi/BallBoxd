'use client';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';

export default function LanguageToggle({
  className,
}: {
  className?: string;
}) {
  const { language, setLanguage, t } = useLanguage();
  const next = language === 'en' ? 'es' : 'en';

  return (
    <button
      type="button"
      className={[
        'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => setLanguage(next)}
      aria-label={t('nav.language')}
    >
      {language.toUpperCase()}
    </button>
  );
}
