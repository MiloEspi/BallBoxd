'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import ImageUpload from '@/app/components/ui/ImageUpload';

type ProfileAvatarModalProps = {
  isOpen: boolean;
  value: string;
  onClose: () => void;
  onSave: (nextValue: string) => void;
};

// Modal editor for the profile avatar image.
export default function ProfileAvatarModal({
  isOpen,
  value,
  onClose,
  onSave,
}: ProfileAvatarModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [avatar, setAvatar] = useState(value);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setAvatar(value);
    setError('');
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, value, onClose]);

  const handleSave = () => {
    setError('');
    if (!avatar) {
      setError(t('profile.avatar.required'));
      return;
    }
    onSave(avatar);
    onClose();
  };

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
        <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-[0_30px_80px_rgba(0,0,0,0.45)] max-h-[80vh]">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t('profile.avatar.title')}
              </p>
              <h2 className="text-base font-semibold text-white">
                {t('profile.avatar.subtitle')}
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
            <ImageUpload
              label={t('profile.avatar.subtitle')}
              helper={t('profile.avatar.helper')}
              suggestions={[
                t('profile.avatar.suggestion1'),
                t('profile.avatar.suggestion2'),
              ]}
              value={avatar}
              onChange={setAvatar}
              onClear={() => setAvatar('')}
              minSize={300}
              previewClassName="max-w-[200px] max-h-[200px]"
              onPendingChange={() => {}}
            />

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
            >
              {t('common.cancel')}
            </button>
            <button
              className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_12px_25px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              onClick={handleSave}
            >
              {t('profile.avatar.save')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
