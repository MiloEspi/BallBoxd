'use client';

type StateEmptyProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

// Renders a reusable empty state with optional primary action.
export default function StateEmpty({
  title,
  description,
  actionLabel,
  onAction,
}: StateEmptyProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
      <p className="text-base font-semibold text-white">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          className="mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:bg-white/10"
          type="button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
