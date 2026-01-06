'use client';

import { useEffect, useMemo, useState } from 'react';

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
  updateProfileMemory,
} from '@/app/lib/api';
import type { ProfileMemoriesResponse, RatingWithMatch } from '@/app/lib/types';

type ProfileMemoriesSectionProps = {
  username: string;
};

// Featured matches section for profile identity.
export default function ProfileMemoriesSection({
  username,
}: ProfileMemoriesSectionProps) {
  const [data, setData] = useState<ProfileMemoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [editing, setEditing] = useState<RatingWithMatch | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const featuredMatches = useMemo(
    () => (data?.results ?? []).slice().sort((a, b) => {
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
      setError(err instanceof Error ? err.message : 'No pudimos cargar.');
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

  const handleAdd = async (matchId: number, replaceMatchId?: number) => {
    const response = await addProfileMemory(username, matchId, replaceMatchId);
    setData(response);
  };

  const handleRemove = async (matchId: number) => {
    try {
      await removeProfileMemory(username, matchId);
      await loadMemories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos eliminar.');
    }
  };

  const handleSwapPrimary = async (
    matchId: number,
    nextPrimary: 'representative' | 'stadium',
  ) => {
    try {
      const response = await updateProfileMemory(username, matchId, {
        featured_primary_image: nextPrimary,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar.');
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
      setData((prev) =>
        prev ? { ...prev, results: next } : prev,
      );
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
        setError(err instanceof Error ? err.message : 'No pudimos reordenar.');
        await loadMemories();
      } finally {
        setReordering(false);
      }
    };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Mis partidos
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Partidos que me marcaron
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={`memories-skeleton-${index}`} className="h-80" />
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
          actionLabel="Reintentar"
          onAction={loadMemories}
        />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Mis partidos
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Partidos que me marcaron
          </p>
        </div>
        {isOwner && (
          <button
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_12px_25px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-200"
            type="button"
            onClick={() => setShowSelector(true)}
            disabled={reordering}
          >
            Agregar a Mis partidos
          </button>
        )}
      </div>

      {featuredMatches.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          {isOwner
            ? 'Todavia no elegiste partidos destacados.'
            : 'Este perfil aun no tiene partidos destacados.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {featuredMatches.map((rating) => (
            <FeaturedMatchCard
              key={rating.id}
              rating={rating}
              isOwner={isOwner}
              isDragging={draggingId === rating.match.id}
              isDragOver={dragOverId === rating.match.id}
              onEdit={setEditing}
              onRemove={handleRemove}
              onSwapPrimary={handleSwapPrimary}
              onDragStart={handleDragStart(rating.match.id)}
              onDragOver={handleDragOver(rating.match.id)}
              onDrop={handleDrop(rating.match.id)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}

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
          onClose={() => setEditing(null)}
          onSaved={loadMemories}
        />
      )}
    </section>
  );
}
