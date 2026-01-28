'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import { fetchProfileRatedMatches } from '@/app/lib/api';
import { getLocale } from '@/app/lib/i18n';
import type { RatingWithMatch } from '@/app/lib/types';

type FeaturedMatchSelectorModalProps = {
  username: string;
  featuredMatches: RatingWithMatch[];
  maxCount: number;
  onClose: () => void;
  onConfirm: (matchId: number, replaceMatchId?: number) => Promise<void>;
};

const formatDate = (value: string, locale: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Selector modal for adding/replacing featured matches.
export default function FeaturedMatchSelectorModal({
  username,
  featuredMatches,
  maxCount,
  onClose,
  onConfirm,
}: FeaturedMatchSelectorModalProps) {
  const { t, language } = useLanguage();
  const locale = getLocale(language);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RatingWithMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [step, setStep] = useState<'select' | 'replace'>('select');

  const loadResults = async (value: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchProfileRatedMatches(username, value);
      setResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.memories.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadResults('');
  }, []);

  const handleSelect = async (matchId: number) => {
    if (featuredMatches.length < maxCount) {
      try {
        setActionError('');
        await onConfirm(matchId);
        onClose();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : t('common.saveError'),
        );
      }
      return;
    }
    setSelectedMatchId(matchId);
    setStep('replace');
  };

  const handleReplace = async (replaceMatchId: number) => {
    if (!selectedMatchId) {
      return;
    }
    try {
      setActionError('');
      await onConfirm(selectedMatchId, replaceMatchId);
      onClose();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t('common.saveError'),
      );
    }
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-slate-950/80 animate-[modal-backdrop_240ms_ease-out]"
      style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-[0_30px_80px_rgba(0,0,0,0.45)] animate-[modal-in_320ms_cubic-bezier(0.16,1,0.3,1)]">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t('profile.memories.selector.title')}
              </p>
              <h2 className="text-lg font-semibold text-white">
                {step === 'select'
                  ? t('profile.memories.selector.select')
                  : t('profile.memories.selector.replace')}
              </h2>
            </div>
            <button
              className="text-sm text-slate-500 transition hover:text-slate-200"
              type="button"
              onClick={onClose}
            >
              {t('common.close')}
            </button>
          </div>

          <div className="space-y-5 px-6 py-6">
            {step === 'select' && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    className="min-w-[240px] flex-1 rounded-full border border-slate-800 bg-slate-950/70 px-4 py-2 text-sm text-slate-100"
                    placeholder={t('profile.memories.selector.searchPlaceholder')}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <button
                    className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_10px_25px_rgba(255,255,255,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                    type="button"
                    onClick={() => loadResults(query)}
                    disabled={loading}
                  >
                    {t('profile.memories.selector.search')}
                  </button>
                </div>

                {loading && (
                  <div className="text-sm text-slate-400">
                    {t('profile.memories.selector.loading')}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                )}
                {actionError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {actionError}
                  </div>
                )}

                {!loading && results.length === 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                    {t('profile.memories.selector.empty')}
                  </div>
                )}

                <div className="grid gap-3">
                  {results.map((rating) => (
                    <button
                      key={rating.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left transition hover:border-slate-600"
                      type="button"
                      onClick={() => handleSelect(rating.match.id)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {rating.match.home_team.name} vs{' '}
                          {rating.match.away_team.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {rating.match.tournament.name} ·{' '}
                          {formatDate(rating.match.date_time, locale)}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                        {rating.score}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'replace' && (
              <>
                <p className="text-sm text-slate-400">
                  {t('profile.memories.selector.full', { count: maxCount })}
                </p>
                {actionError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {actionError}
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  {featuredMatches.map((rating) => (
                    <button
                      key={rating.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left transition hover:border-rose-400/60"
                      type="button"
                      onClick={() => handleReplace(rating.match.id)}
                    >
                      <p className="text-sm font-semibold text-white">
                        {rating.match.home_team.name} vs{' '}
                        {rating.match.away_team.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {rating.match.tournament.name} ·{' '}
                        {formatDate(rating.match.date_time, locale)}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
            {step === 'replace' ? (
              <button
                className="rounded-full border border-slate-700 px-5 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
                type="button"
                onClick={() => setStep('select')}
              >
                {t('profile.memories.selector.back')}
              </button>
            ) : (
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {t('profile.memories.selector.manual')}
              </span>
            )}
            <button
              className="rounded-full border border-slate-700 px-5 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
              type="button"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
