'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import ImageUpload from '@/app/components/ui/ImageUpload';
import { updateProfileMemory } from '@/app/lib/api';
import type { RatingWithMatch } from '@/app/lib/types';

type FeaturedMatchEditorModalProps = {
  username: string;
  rating: RatingWithMatch;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

// Modal editor for featured match memory details.
export default function FeaturedMatchEditorModal({
  username,
  rating,
  isOpen,
  onClose,
  onSaved,
}: FeaturedMatchEditorModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState(rating.featured_note ?? '');
  const [representative, setRepresentative] = useState(
    rating.representative_photo_url ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasPending, setHasPending] = useState(false);

  const handleSave = async () => {
    setError('');
    if (!representative) {
      setError(t('profile.memories.editor.required'));
      return;
    }
    if (hasPending) {
      setError(t('profile.memories.editor.pending'));
      return;
    }
    setSaving(true);
    try {
      await updateProfileMemory(username, rating.match.id, {
        featured_note: note.trim(),
        representative_photo_url: representative,
        featured_primary_image: 'representative',
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveError'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNote(rating.featured_note ?? '');
    setRepresentative(rating.representative_photo_url ?? '');
    setError('');
    setHasPending(false);
  }, [rating.match.id]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) {
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
      <div className="relative flex min-h-screen items-start justify-center px-4 py-8">
        <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-[0_30px_80px_rgba(0,0,0,0.45)] animate-[modal-in_320ms_cubic-bezier(0.16,1,0.3,1)] max-h-[85vh]">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t('profile.memories.selector.title')}
              </p>
              <h2 className="text-lg font-semibold text-white">
                {rating.match.home_team.name} vs {rating.match.away_team.name}
              </h2>
            </div>
            <button
              className="text-sm text-slate-500 transition hover:text-slate-200"
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              title={t('common.close')}
            >
              X
            </button>
          </div>

          <div className="flex-1 min-h-0 space-y-5 overflow-y-auto px-6 py-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t('profile.memories.editor.prompt')}
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                maxLength={240}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t('profile.memories.editor.placeholder')}
              />
              <div className="text-right text-xs text-slate-500">
                {note.length}/240
              </div>
            </div>

            <ImageUpload
              label={t('profile.memories.editor.imageLabel')}
              helper={t('profile.memories.editor.imageHelper')}
              suggestions={[
                t('profile.memories.editor.suggestion1'),
                t('profile.memories.editor.suggestion2'),
              ]}
              value={representative}
              onChange={(value) => {
                setRepresentative(value);
              }}
              onClear={() => {
                setRepresentative('');
              }}
              minSize={500}
              previewClassName="max-w-[260px] max-h-[260px]"
              onPendingChange={setHasPending}
              disabled={saving}
            />

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
            <button
              className="rounded-full border border-slate-700 px-5 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              {t('profile.memories.editor.cancel')}
            </button>
            <button
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_12px_25px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              onClick={handleSave}
              disabled={saving || hasPending}
            >
              {saving ? t('profile.memories.editor.saving') : t('profile.memories.editor.save')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
