'use client';

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
};

export default function PaginationControls({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationControlsProps) {
  const safeTotal = Math.max(1, totalPages);
  const isFirst = page <= 1;
  const isLast = page >= safeTotal;
  const start =
    totalItems !== undefined && pageSize
      ? Math.min(totalItems, (page - 1) * pageSize + 1)
      : null;
  const end =
    totalItems !== undefined && pageSize
      ? Math.min(totalItems, page * pageSize)
      : null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={isFirst}
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Prev
      </button>
      <span className="text-slate-300">
        Page {page} / {safeTotal}
      </span>
      {start !== null && end !== null && (
        <span className="text-slate-500">
          {start}-{end} of {totalItems}
        </span>
      )}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(safeTotal, page + 1))}
        disabled={isLast}
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
