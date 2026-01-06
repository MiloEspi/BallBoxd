'use client';

type StateErrorProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

// Renders an error state with a single primary action.
export default function StateError({
  message,
  actionLabel,
  onAction,
}: StateErrorProps) {
  return (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
      <p>{message}</p>
      <button
        className="mt-3 rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-50 transition hover:border-red-300/60"
        type="button"
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}
