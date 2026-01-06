'use client';

import { useEffect, useState } from 'react';

import ImageUpload from '@/app/components/ui/ImageUpload';
import { updateMatchMemory } from '@/app/lib/api';
import type { Rating } from '@/app/lib/types';

type MatchMemoryPanelProps = {
  matchId: number;
  rating: Rating | null;
  onRequireRating: () => void;
  onUpdated: () => void;
};

// Per-match memory panel for attendance and photo.
export default function MatchMemoryPanel({
  matchId,
  rating,
  onRequireRating,
  onUpdated,
}: MatchMemoryPanelProps) {
  const [attended, setAttended] = useState(Boolean(rating?.attended));
  const [photo, setPhoto] = useState(rating?.stadium_photo_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAttended(Boolean(rating?.attended));
    setPhoto(rating?.stadium_photo_url ?? '');
  }, [rating?.attended, rating?.stadium_photo_url]);

  const toggleAttended = async () => {
    if (!rating) {
      onRequireRating();
      return;
    }
    setError('');
    const nextValue = !attended;
    setAttended(nextValue);
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

  const handlePhotoChange = async (value: string) => {
    if (!rating) {
      onRequireRating();
      return;
    }
    setError('');
    setSaving(true);
    setPhoto(value);
    try {
      await updateMatchMemory(matchId, {
        attended: true,
        stadium_photo_url: value,
      });
      setAttended(true);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoClear = async () => {
    if (!rating) {
      onRequireRating();
      return;
    }
    setError('');
    setSaving(true);
    setPhoto('');
    try {
      await updateMatchMemory(matchId, {
        stadium_photo_url: '',
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Estuve en la cancha
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Marca si fuiste y suma una foto desde la tribuna.
          </p>
        </div>
        <button
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
            attended
              ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
              : 'border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
          type="button"
          onClick={toggleAttended}
          disabled={saving}
        >
          {attended ? 'Si, estuve ahi' : 'No estuve'}
        </button>
      </div>

      {attended && (
        <ImageUpload
          label="Foto desde mi lugar"
          helper="Solo una imagen, formato cuadrado."
          value={photo}
          onChange={handlePhotoChange}
          onClear={photo ? handlePhotoClear : undefined}
          disabled={saving}
        />
      )}

      {!rating && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          Para activar esta opcion primero valora el partido.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
    </section>
  );
}
