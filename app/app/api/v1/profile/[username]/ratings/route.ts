import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  getAuthUser,
  getDemoStore,
  getMatchById,
  toRatingWithMatch,
  toUserMini,
  unauthorized,
} from '../../../_demo';

type RouteContext<T> = {
  params: Promise<T>;
};

// Returns rated matches for the current user (with optional search).
export async function GET(
  request: NextRequest,
  context: RouteContext<{ username: string }>,
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const { username } = await context.params;
  if (user.username !== username) {
    return NextResponse.json(
      { detail: 'You cannot access these ratings.' },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

  const ratings = store.ratings.filter((rating) => rating.userId === user.id);
  const filtered = q
    ? ratings.filter((rating) => {
        const match = getMatchById(store, rating.matchId);
        if (!match) {
          return false;
        }
        const tournament = store.tournaments.find(
          (item) => item.id === match.tournamentId,
        );
        const home = store.teams.find((item) => item.id === match.homeTeamId);
        const away = store.teams.find((item) => item.id === match.awayTeamId);
        const haystack = [
          tournament?.name,
          home?.name,
          away?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : ratings;

  return NextResponse.json({
    user: toUserMini(user),
    results: filtered
      .slice()
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime(),
      )
      .map((rating) => toRatingWithMatch(store, rating)),
  });
}
