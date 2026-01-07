'use client';

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { isSameDay } from '@/app/lib/date-range';
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

const formatToolbarDate = (date: Date) =>
  date.toLocaleDateString('es-ES', {
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
  const isToday = isSameDay(selectedDate, today);
  const dateLabel = formatToolbarDate(selectedDate);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-[inset_0_0_25px_rgba(255,255,255,0.06)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
            onClick={onPrevDay}
            aria-label="Día anterior"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-2 text-sm font-semibold text-slate-100"
            onClick={onOpenCalendar}
            aria-label="Abrir calendario"
          >
            <span className="min-w-[120px] text-center">{dateLabel}</span>
            {isToday && (
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                Hoy
              </span>
            )}
          </button>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
            onClick={onNextDay}
            aria-label="Día siguiente"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
            onClick={onOpenCalendar}
            aria-label="Abrir calendario"
          >
            <CalendarIcon className="h-5 w-5" />
          </button>
        </div>

        <SegmentedControl
          options={[
            { value: 'ALL', label: 'Todo' },
            { value: 'LIVE', label: 'Live' },
            { value: 'FINISHED', label: 'Finished' },
            { value: 'PENDING', label: 'Upcoming' },
          ]}
          value={selectedStatus}
          onChange={onStatusChange}
          ariaLabel="Estado del partido"
          size="sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <LeagueSelect
          label="League"
          value={selectedLeague}
          options={leagueDropdownOptions}
          onChange={onLeagueChange}
        />
        <button
          type="button"
          className="mb-[1px] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
          onClick={onOpenManageLeagues}
        >
          Manage leagues
        </button>
        <div className="mb-[1px] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          <select
            className="bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 focus:outline-none"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label="Ordenar partidos"
          >
            <option value="date_asc">Soonest</option>
            <option value="date_desc">Latest</option>
            <option value="rating_desc">Rating desc</option>
            <option value="rating_asc">Rating asc</option>
          </select>
        </div>
        <button
          type="button"
          className="mb-[1px] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
