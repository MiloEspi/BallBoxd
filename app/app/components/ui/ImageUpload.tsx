'use client';

import { useRef, useState } from 'react';

import { processSquareImage } from '@/app/lib/image';

type ImageUploadProps = {
  label: string;
  value?: string | null;
  helper?: string;
  suggestions?: string[];
  minSize?: number;
  onChange: (nextValue: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  previewClassName?: string;
  onPendingChange?: (hasPending: boolean) => void;
};

// Square image upload with crop/resize and preview.
export default function ImageUpload({
  label,
  value,
  helper,
  suggestions,
  minSize = 500,
  onChange,
  onClear,
  disabled,
  previewClassName,
  onPendingChange,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const acceptedTypes = ['image/jpeg', 'image/png'];
  const previewSrc = value ?? '';

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
    if (!acceptedTypes.includes(file.type)) {
      setError('Please upload a JPG or PNG image.');
      event.target.value = '';
      return;
    }
    setError('');
    setProcessing(true);
    try {
      const nextValue = await processSquareImage(file, minSize);
      onChange(nextValue);
      onPendingChange?.(false);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Minimo')) {
        setError(`Image too small. Minimum size is ${minSize}x${minSize}.`);
      } else {
        setError(
          err instanceof Error ? err.message : 'No pudimos cargar la imagen.',
        );
      }
    } finally {
      setProcessing(false);
    }
    event.target.value = '';
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
            disabled={disabled || processing}
          >
            {processing ? 'Procesando...' : value ? 'Cambiar' : 'Subir'}
          </button>
        </div>
      </div>

      <div
        className={`relative aspect-square w-full max-w-[260px] max-h-[260px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 ${previewClassName ?? ''}`}
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-slate-500">
            1:1 - {minSize}px minimo
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="text-xs text-slate-500">
          {suggestions.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  );
}
