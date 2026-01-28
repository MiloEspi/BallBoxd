'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import { processSquareImage } from '@/app/lib/image';

type StadiumPhotoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => Promise<void>;
};

const MIN_SIZE = 500;

// Modal for uploading the stadium photo (2-step confirm).
export default function StadiumPhotoModal({
  isOpen,
  onClose,
  onConfirm,
}: StadiumPhotoModalProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError(t('image.upload.formatError'));
      event.target.value = '';
      return;
    }
    setError('');
    setProcessing(true);
    try {
      const nextValue = await processSquareImage(file, MIN_SIZE);
      setPending(nextValue);
      setPendingName(file.name);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Minimo')) {
        setError(t('image.upload.tooSmall', { size: MIN_SIZE }));
      } else {
        setError(err instanceof Error ? err.message : t('image.upload.error'));
      }
    } finally {
      setProcessing(false);
      event.target.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!pending) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onConfirm(pending);
      setPending(null);
      setPendingName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setPending(null);
    setPendingName('');
  };

  if (!isOpen) {
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
        <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-[0_30px_80px_rgba(0,0,0,0.45)] max-h-[85vh]">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t('stadium.title')}
              </p>
              <h2 className="text-base font-semibold text-white">
                {t('stadium.subtitle')}
              </h2>
            </div>
            <button
              className="text-xs uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200"
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              title={t('common.close')}
            >
              X
            </button>
          </div>

          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-5 py-5">
            <p className="text-sm text-slate-400">{t('stadium.description')}</p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-full border border-slate-700 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                type="button"
                onClick={handlePick}
                disabled={processing || saving}
              >
                {processing ? t('stadium.processing') : t('stadium.selectFile')}
              </button>
              <span className="text-xs text-slate-500">
                {t('stadium.fileHint', { size: MIN_SIZE })}
              </span>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
              {pending ? (
                <img
                  src={pending}
                  alt={t('stadium.preview')}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-slate-500">
                  {t('stadium.noPreview')}
                </div>
              )}
            </div>

            {pending && (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">
                  {t('stadium.preview')}
                  {pendingName ? ` - ${pendingName}` : ''}
                </span>
                <button
                  className="text-[10px] uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200"
                  type="button"
                  onClick={handleDiscard}
                >
                  {t('stadium.discard')}
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
            <button
              className="rounded-full border border-slate-700 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
            <button
              className="rounded-full bg-emerald-300 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              onClick={handleConfirm}
              disabled={!pending || saving}
            >
              {saving ? t('stadium.saving') : t('stadium.confirm')}
            </button>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>,
    document.body,
  );
}
