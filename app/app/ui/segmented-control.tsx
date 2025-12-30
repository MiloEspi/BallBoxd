'use client';

import clsx from 'clsx';

type SegmentedOption = {
  value: string;
  label: string;
};

type SegmentedControlProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
};

// Reusable segmented selector with a liquid-glass highlight.
export default function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      className="relative grid rounded-full border border-white/10 bg-white/5 p-1 shadow-[inset_0_0_25px_rgba(255,255,255,0.06)] backdrop-blur-xl"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <div
        className="pointer-events-none absolute inset-y-1 left-1 rounded-full border border-white/20 bg-white/10 shadow-[0_8px_25px_rgba(0,0,0,0.25)] transition duration-300"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.7),_transparent_70%)] opacity-70" />
      </div>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={clsx(
              'relative z-10 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
              isActive
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
