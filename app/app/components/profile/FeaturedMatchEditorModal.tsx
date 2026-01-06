'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import ImageUpload from '@/app/components/ui/ImageUpload';
import { updateProfileMemory } from '@/app/lib/api';
import type { FeaturedPrimaryImage, RatingWithMatch } from '@/app/lib/types';

type FeaturedMatchEditorModalProps = {
  username: string;
  rating: RatingWithMatch;
  onClose: () => void;
  onSaved: () => void;
};

// Modal editor for featured match memory details.
export default function FeaturedMatchEditorModal({
  username,
  rating,
  onClose,
  onSaved,
}: FeaturedMatchEditorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState(rating.featured_note ?? '');
  const [representative, setRepresentative] = useState(
    rating.representative_photo_url ?? '',
  );
  const [primary, setPrimary] = useState<FeaturedPrimaryImage>(
    rating.featured_primary_image ?? 'representative',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasStadium = Boolean(rating.attended && rating.stadium_photo_url);
  const hasRepresentative = Boolean(representative);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await updateProfileMemory(username, rating.match.id, {
        featured_note: note.trim(),
        representative_photo_url: representative,
        featured_primary_image: primary,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-[0_30px_80px_rgba(0,0,0,0.45)] animate-[modal-in_320ms_cubic-bezier(0.16,1,0.3,1)]">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Mis partidos
              </p>
              <h2 className="text-lg font-semibold text-white">
                {rating.match.home_team.name} vs {rating.match.away_team.name}
              </h2>
            </div>
            <button
              className="text-sm text-slate-500 transition hover:text-slate-200"
              type="button"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Por que este partido es especial para vos
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                maxLength={240}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Opcional. Podes dejarlo vacio."
              />
              <div className="text-right text-xs text-slate-500">
                {note.length}/240
              </div>
            </div>

            <ImageUpload
              label="Imagen representativa"
              helper="Usa una imagen iconica del partido."
              value={representative}
              onChange={(value) => {
                setRepresentative(value);
                if (!hasRepresentative) {
                  setPrimary('representative');
                }
              }}
              onClear={() => {
                setRepresentative('');
                if (hasStadium) {
                  setPrimary('stadium');
                }
              }}
              disabled={saving}
            />

            {hasStadium && hasRepresentative && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Imagen principal
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['representative', 'stadium'] as FeaturedPrimaryImage[]).map(
                    (value) => (
                      <button
                        key={value}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                          primary === value
                            ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
                            : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600'
                        }`}
                        type="button"
                        onClick={() => setPrimary(value)}
                      >
                        <span>
                          {value === 'representative'
                            ? 'Representativa'
                            : 'Desde la cancha'}
                        </span>
                        {primary === value && (
                          <span className="text-xs uppercase tracking-[0.2em]">
                            Principal
                          </span>
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

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
              Cancelar
            </button>
            <button
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_12px_25px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
