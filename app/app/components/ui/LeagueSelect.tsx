'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type LeagueOption = {
  value: string;
  label: string;
  subtitle?: string;
};

type LeagueSelectProps = {
  label: string;
  value: string;
  options: LeagueOption[];
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function LeagueSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select league',
}: LeagueSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) =>
      `${option.label} ${option.subtitle ?? ''}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-[220px]">
      <label className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">
        {label}
      </label>
      <button
        type="button"
        className="mt-2 flex w-full items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-xs text-slate-400">{open ? '^' : 'v'}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <input
            className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 outline-none focus:border-white/30"
            placeholder="Search league..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-3 max-h-60 space-y-1 overflow-y-auto pr-1 text-sm text-slate-200">
            {filtered.length === 0 && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                No leagues found.
              </div>
            )}
            {filtered.map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                  {option.subtitle && (
                    <span className="text-[11px] text-slate-400">
                      {option.subtitle}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
