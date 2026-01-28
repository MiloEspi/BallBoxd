'use client';

import { useEffect, useMemo, useState } from 'react';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import { isSameDay, startOfDay } from '@/app/lib/date-range';
import { getLocale } from '@/app/lib/i18n';

type CalendarModalProps = {
  open: boolean;
  selected: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
};

const weekdayLabelsByLanguage = (language: 'en' | 'es') =>
  language === 'es' ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const getMonthStart = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), 1);

const getMonthEnd = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0);

// 0..6 where 0 = Monday
const getWeekdayIndex = (value: Date) => (value.getDay() + 6) % 7;

export default function CalendarModal({
  open,
  selected,
  onSelect,
  onClose,
}: CalendarModalProps) {
  const { t, language } = useLanguage();
  const locale = getLocale(language);
  const [month, setMonth] = useState(() => getMonthStart(selected));

  useEffect(() => {
    if (!open) {
      return;
    }
    setMonth(getMonthStart(selected));
  }, [open, selected]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const days = useMemo(() => {
    const monthStart = getMonthStart(month);
    const monthEnd = getMonthEnd(month);
    const leading = getWeekdayIndex(monthStart);
    const totalDays = monthEnd.getDate();
    return {
      monthStart,
      monthEnd,
      leading,
      totalDays,
    };
  }, [month]);

  if (!open) {
    return null;
  }

  const monthLabel = month.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
  const weekdayLabels = weekdayLabelsByLanguage(language);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('calendar.selectDate')}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
            aria-label={t('calendar.prevMonth')}
          >
            {'<'}
          </button>
          <div className="min-w-0 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
              {t('calendar.title')}
            </div>
            <div className="truncate text-base font-semibold text-white">
              {monthLabel}
            </div>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
            aria-label={t('calendar.nextMonth')}
          >
            {'>'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          {weekdayLabels.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {Array.from({ length: days.leading }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}
          {Array.from({ length: days.totalDays }, (_, index) => {
            const dayNumber = index + 1;
            const date = new Date(
              days.monthStart.getFullYear(),
              days.monthStart.getMonth(),
              dayNumber,
            );
            const isSelected = isSameDay(date, selected);
            const isToday = isSameDay(date, today);
            return (
              <button
                key={dayNumber}
                type="button"
                className={`h-10 rounded-xl border text-sm font-semibold transition ${
                  isSelected
                    ? 'border-white/30 bg-white/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                } ${isToday ? 'ring-1 ring-emerald-300/50' : ''}`}
                onClick={() => {
                  onSelect(startOfDay(date));
                  onClose();
                }}
              >
                {dayNumber}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
            onClick={() => {
              onSelect(today);
              onClose();
            }}
          >
            {t('calendar.today')}
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-slate-200"
            onClick={onClose}
          >
            {t('calendar.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
