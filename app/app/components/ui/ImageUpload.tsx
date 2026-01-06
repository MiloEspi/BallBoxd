'use client';

import { useRef, useState } from 'react';

import { processSquareImage } from '@/app/lib/image';

type ImageUploadProps = {
  label: string;
  value?: string | null;
  helper?: string;
  onChange: (nextValue: string) => void;
  onClear?: () => void;
  disabled?: boolean;
};

// Square image upload with crop/resize and preview.
export default function ImageUpload({
  label,
  value,
  helper,
  onChange,
  onClear,
  disabled,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePick = () => {
    if (!disabled) {
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
    setError('');
    setLoading(true);
    try {
      const nextValue = await processSquareImage(file, 800);
      onChange(nextValue);
      event.target.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar la imagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {label}
          </p>
          {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
        </div>
        <div className="flex items-center gap-2">
          {value && onClear && (
            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
              type="button"
              onClick={onClear}
              disabled={disabled}
            >
              Quitar
            </button>
          )}
          <button
            className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_10px_25px_rgba(255,255,255,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
            type="button"
            onClick={handlePick}
            disabled={disabled || loading}
          >
            {loading ? 'Procesando...' : value ? 'Cambiar' : 'Subir'}
          </button>
        </div>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-slate-500">
            1:1 - 800px minimo
          </div>
        )}
      </div>

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
        disabled={disabled}
      />
    </div>
  );
}
