'use client';

import MatchCardCompact from '@/app/components/match/MatchCardCompact';
import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import type { MatchResult } from '@/app/lib/types';

type MatchResultCardProps = {
  match: MatchResult;
};

export default function MatchResultCard({ match }: MatchResultCardProps) {
  const { t } = useLanguage();

  const footer =
    match.my_rating !== null ? (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="uppercase tracking-[0.2em]">{t('match.yourRating')}</span>
        <span className="text-slate-200">{match.my_rating}</span>
      </div>
    ) : null;

  return <MatchCardCompact match={match} footer={footer} />;
}
