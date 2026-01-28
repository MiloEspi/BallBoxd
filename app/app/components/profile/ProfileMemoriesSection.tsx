'use client';

import { useEffect, useMemo, useState } from 'react';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import FeaturedMatchCard from '@/app/components/profile/FeaturedMatchCard';
import FeaturedMatchEditorModal from '@/app/components/profile/FeaturedMatchEditorModal';
import FeaturedMatchSelectorModal from '@/app/components/profile/FeaturedMatchSelectorModal';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import StateError from '@/app/components/ui/StateError';
import {
  addProfileMemory,
  fetchMe,
  fetchProfileMemories,
  removeProfileMemory,
  reorderProfileMemories,
} from '@/app/lib/api';
import type { ProfileMemoriesResponse, RatingWithMatch } from '@/app/lib/types';

type ProfileMemoriesSectionProps = {
  username: string;
};

// Featured matches section for profile identity.
export default function ProfileMemoriesSection({
  username,
}: ProfileMemoriesSectionProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<ProfileMemoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [editing, setEditing] = useState<RatingWithMatch | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [pendingEditMatchId, setPendingEditMatchId] = useState<number | null>(
    null,
  );

  const featuredMatches = useMemo(
    () =>
      (data?.results ?? []).slice().sort((a, b) => {
        const left = a.featured_order ?? 0;
        const right = b.featured_order ?? 0;
        return left - right;
      }),
    [data],
  );

  const loadMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchProfileMemories(username);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.memories.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadOwner = async () => {
    try {
      const me = await fetchMe();
      setIsOwner(me.username === username);
    } catch {
      setIsOwner(false);
    }
  };

  useEffect(() => {
    if (!username) {
      return;
    }
    loadMemories();
    loadOwner();
  }, [username]);

  useEffect(() => {
    if (!pendingEditMatchId || !data) {
      return;
    }
    const next = data.results.find(
      (item) => item.match.id === pendingEditMatchId,
    );
    if (next) {
      setEditing(next);
      setPendingEditMatchId(null);
      setEditorOpen(true);
    } else {
      setPendingEditMatchId(null);
    }
  }, [data, pendingEditMatchId]);

  const handleAdd = async (matchId: number, replaceMatchId?: number) => {
    const response = await addProfileMemory(username, matchId, replaceMatchId);
    setData(response);
    setPendingEditMatchId(matchId);
    setEditorOpen(true);
  };

  const handleRemove = async (matchId: number) => {
    try {
      await removeProfileMemory(username, matchId);
      await loadMemories();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.memories.removeError'));
    }
  };

  const handleDragStart =
    (matchId: number) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!isOwner) {
        return;
      }
      setDraggingId(matchId);
      event.dataTransfer.effectAllowed = 'move';
    };

  const handleDragOver =
    (matchId: number) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!isOwner) {
        return;
      }
      event.preventDefault();
      setDragOverId(matchId);
      event.dataTransfer.dropEffect = 'move';
    };

  const handleDrop =
    (matchId: number) => async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!isOwner || draggingId === null) {
        return;
      }
      const current = featuredMatches;
      const fromIndex = current.findIndex(
        (item) => item.match.id === draggingId,
      );
      const toIndex = current.findIndex((item) => item.match.id === matchId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setData((prev) => (prev ? { ...prev, results: next } : prev));
      setDraggingId(null);
      setDragOverId(null);
      setReordering(true);
      try {
        const response = await reorderProfileMemories(
          username,
          next.map((item) => item.match.id),
        );
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('profile.memories.reorderError'));
        await loadMemories();
      } finally {
        setReordering(false);
      }
    };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const title = isOwner ? t('profile.memories.titleOwner') : t('profile.memories.title');
  const description = isOwner ? t('profile.memories.descOwner') : t('profile.memories.desc');

  if (loading) {
    return (
      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {title}
          </p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={`memories-skeleton-${index}`} className="h-48" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <StateError
          message={error}
          actionLabel={t('common.retry')}
          onAction={loadMemories}
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {title}
          </p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        {isOwner && (
          <button
            className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_12px_25px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-200"
            type="button"
            onClick={() => setShowSelector(true)}
            disabled={reordering}
          >
            {t('profile.memories.add')}
          </button>
        )}
      </div>

      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => {
          const rating = featuredMatches[index] ?? null;
          if (rating) {
            return (
              <FeaturedMatchCard
                key={rating.id}
                rating={rating}
                isOwner={isOwner}
                isDragging={draggingId === rating.match.id}
                isDragOver={dragOverId === rating.match.id}
                onEdit={(next) => {
                  setEditing(next);
                  setEditorOpen(true);
                }}
                onRemove={handleRemove}
                onDragStart={handleDragStart(rating.match.id)}
                onDragOver={handleDragOver(rating.match.id)}
                onDrop={handleDrop(rating.match.id)}
                onDragEnd={handleDragEnd}
              />
            );
          }
          return (
            <div
              key={`memories-slot-${index}`}
              className="flex flex-col overflow-hidden rounded-3xl border border-dashed border-slate-800 bg-slate-950/40"
            >
              <div className="h-14 border-b border-dashed border-slate-800/80" />
              <div className="flex aspect-square items-center justify-center text-center text-[10px] uppercase tracking-[0.3em] text-slate-500">
                {isOwner ? (
                  <button
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/30"
                    type="button"
                    onClick={() => setShowSelector(true)}
                  >
                    {t('profile.memories.addMatch')}
                  </button>
                ) : (
                  <span>{t('profile.memories.empty')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showSelector && (
        <FeaturedMatchSelectorModal
          username={username}
          featuredMatches={featuredMatches}
          maxCount={data?.max_count ?? 4}
          onClose={() => setShowSelector(false)}
          onConfirm={handleAdd}
        />
      )}

      {editing && (
        <FeaturedMatchEditorModal
          username={username}
          rating={editing}
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSaved={loadMemories}
        />
      )}
    </section>
  );
}
