'use client';

import { useEffect, useRef, useState } from 'react';

import { updateMatchMemory } from '@/app/lib/api';
import { processSquareImage } from '@/app/lib/image';
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [attended, setAttended] = useState(Boolean(rating?.attended));
  const [photo, setPhoto] = useState(rating?.stadium_photo_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

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
      setError(err instanceof Error ? err.message : 'No pudimos guardar.');
      setAttended(attended);
    } finally {
      setSaving(false);
    }
  };

  const handlePickFile = () => {
    if (!saving) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!rating) {
      onRequireRating();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const nextValue = await processSquareImage(file, 800);
      await updateMatchMemory(matchId, {
        attended: true,
        stadium_photo_url: nextValue,
      });
      setAttended(true);
      setPhoto(nextValue);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar.');
    } finally {
      setSaving(false);
      event.target.value = '';
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
      setError(err instanceof Error ? err.message : 'No pudimos guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between gap-4">
        <span className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
          Estuve en la cancha
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
                  alt="Foto desde la cancha"
                  className="h-full w-full object-cover"
                />
              </button>
            )}
            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              type="button"
              onClick={handlePickFile}
              disabled={saving}
            >
              {photo ? 'Cambiar archivo' : 'Subir archivo'}
            </button>
          </div>
          {photo && (
            <button
              className="text-[10px] uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200"
              type="button"
              onClick={handlePhotoClear}
              disabled={saving}
            >
              Quitar
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={saving}
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
              alt="Foto desde la cancha"
              className="h-full w-full rounded-2xl object-cover shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            />
            <button
              className="absolute -right-3 -top-3 rounded-full border border-white/20 bg-slate-900/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200"
              type="button"
              onClick={() => setPreviewOpen(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
