'use client';

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import { isSameDay } from '@/app/lib/date-range';
import { getLocale } from '@/app/lib/i18n';
import SegmentedControl from '@/app/ui/segmented-control';

import LeagueSelect from '../ui/LeagueSelect';

type MatchesToolbarProps = {
  selectedDate: Date;
  today: Date;
  selectedLeague: string;
  selectedStatus: string;
  sortBy: string;
  leagueDropdownOptions: Array<{
    value: string;
    label: string;
    subtitle?: string;
  }>;
  onPrevDay: () => void;
  onNextDay: () => void;
  onOpenCalendar: () => void;
  onLeagueChange: (value: string) => void;
  onOpenManageLeagues: () => void;
  onStatusChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
};

const formatToolbarDate = (date: Date, locale: string) =>
  date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function MatchesToolbar({
  selectedDate,
  today,
  selectedLeague,
  selectedStatus,
  sortBy,
  leagueDropdownOptions,
  onPrevDay,
  onNextDay,
  onOpenCalendar,
  onLeagueChange,
  onOpenManageLeagues,
  onStatusChange,
  onSortChange,
  onClearFilters,
}: MatchesToolbarProps) {
  const { t, language } = useLanguage();
  const isToday = isSameDay(selectedDate, today);
  const dateLabel = formatToolbarDate(selectedDate, getLocale(language));

  return (
    <div className="relative z-30 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-[inset_0_0_25px_rgba(255,255,255,0.06)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
            onClick={onPrevDay}
            aria-label={t('date.yesterday')}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-2 text-sm font-semibold text-slate-100"
            onClick={onOpenCalendar}
            aria-label={t('matches.toolbar.today')}
          >
            <span className="min-w-[120px] text-center">{dateLabel}</span>
            {isToday && (
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                {t('matches.toolbar.today')}
              </span>
            )}
          </button>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
            onClick={onNextDay}
            aria-label={t('date.tomorrow')}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
            onClick={onOpenCalendar}
            aria-label={t('matches.toolbar.today')}
          >
            <CalendarIcon className="h-5 w-5" />
          </button>
        </div>

        <SegmentedControl
          options={[
            { value: 'ALL', label: t('matches.toolbar.status.all') },
            { value: 'LIVE', label: t('matches.toolbar.status.live') },
            { value: 'FINISHED', label: t('matches.toolbar.status.finished') },
            { value: 'PENDING', label: t('matches.toolbar.status.pending') },
          ]}
          value={selectedStatus}
          onChange={onStatusChange}
          ariaLabel={t('feed.filters.status')}
          size="sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <LeagueSelect
          label={t('matches.toolbar.league')}
          value={selectedLeague}
          options={leagueDropdownOptions}
          onChange={onLeagueChange}
          emptyLabel={t('leagues.empty')}
        />
        <button
          type="button"
          className="mb-[1px] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
          onClick={onOpenManageLeagues}
        >
          {t('matches.toolbar.manage')}
        </button>
        <div className="mb-[1px] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          <select
            className="bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 focus:outline-none"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label={t('matches.toolbar.sort')}
          >
            <option value="date_asc">{t('matches.toolbar.sort.soonest')}</option>
            <option value="date_desc">{t('matches.toolbar.sort.latest')}</option>
            <option value="rating_desc">
              {t('matches.toolbar.sort.ratingDesc')}
            </option>
            <option value="rating_asc">
              {t('matches.toolbar.sort.ratingAsc')}
            </option>
          </select>
        </div>
        <button
          type="button"
          className="mb-[1px] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
          onClick={onClearFilters}
        >
          {t('matches.toolbar.clear')}
        </button>
      </div>
    </div>
  );
}
