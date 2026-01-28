'use client';

import { useEffect, useState } from 'react';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import StadiumPhotoModal from '@/app/components/match/StadiumPhotoModal';
import { updateMatchMemory } from '@/app/lib/api';
import type { Rating } from '@/app/lib/types';

type MatchMemoryPanelProps = {
  matchId: number;
  rating: Rating | null;
  onRequireRating: () => void;
  onUpdated: () => void;
};

// Compact attendance control with optional stadium photo.
export default function MatchMemoryPanel({
  matchId,
  rating,
  onRequireRating,
  onUpdated,
}: MatchMemoryPanelProps) {
  const { t } = useLanguage();
  const [attended, setAttended] = useState(Boolean(rating?.attended));
  const [photo, setPhoto] = useState(rating?.stadium_photo_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    setAttended(Boolean(rating?.attended));
    setPhoto(rating?.stadium_photo_url ?? '');
  }, [rating?.attended, rating?.stadium_photo_url]);

  const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!rating) {
      onRequireRating();
      return;
    }
    const nextValue = event.target.checked;
    setAttended(nextValue);
    setError('');
    setSaving(true);
    try {
      await updateMatchMemory(matchId, { attended: nextValue });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveError'));
      setAttended(attended);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoClear = async () => {
    if (!rating) {
      onRequireRating();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateMatchMemory(matchId, { stadium_photo_url: '' });
      setPhoto('');
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between gap-4">
        <span className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
          {t('memory.attended')}
        </span>
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-300 focus:ring-emerald-300/40"
          checked={attended}
          onChange={handleToggle}
          disabled={saving}
        />
      </label>

      {attended && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {photo && (
              <button
                className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-slate-900/60"
                type="button"
                onClick={() => setPreviewOpen(true)}
              >
                <img
                  src={photo}
                  alt={t('memory.photoAlt')}
                  className="h-full w-full object-cover"
                />
              </button>
            )}
            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              type="button"
              onClick={() => setUploadOpen(true)}
              disabled={saving}
            >
              {photo ? t('memory.changePhoto') : t('memory.uploadPhoto')}
            </button>
          </div>
          {photo && (
            <button
              className="text-[10px] uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200"
              type="button"
              onClick={handlePhotoClear}
              disabled={saving}
            >
              {t('memory.remove')}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <StadiumPhotoModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onConfirm={async (value) => {
          if (!rating) {
            onRequireRating();
            return;
          }
          setSaving(true);
          setError('');
          try {
            await updateMatchMemory(matchId, {
              attended: true,
              stadium_photo_url: value,
            });
            setAttended(true);
            setPhoto(value);
            onUpdated();
          } catch (err) {
            setError(err instanceof Error ? err.message : t('common.saveError'));
          } finally {
            setSaving(false);
          }
        }}
      />

      {previewOpen && photo && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative max-h-[80vh] max-w-[80vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={photo}
              alt={t('memory.photoAlt')}
              className="h-full w-full rounded-2xl object-cover shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            />
            <button
              className="absolute -right-3 -top-3 rounded-full border border-white/20 bg-slate-900/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200"
              type="button"
              onClick={() => setPreviewOpen(false)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
