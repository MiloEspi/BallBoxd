import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  getAuthUser,
  getDemoStore,
  toRatingWithMatch,
  toUserMini,
} from '../../../_demo';

type RouteContext<T> = {
  params: Promise<T>;
};

// Returns public profile stats and ratings list for demo mode.
export async function GET(
  request: NextRequest,
  context: RouteContext<{ username: string }>,
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  const { username } = await context.params;

  const target = store.users.find((item) => item.username === username);
  if (!target) {
    return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  }

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get('page') ?? 1) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get('page_size') ?? 10) || 10, 1),
    50,
  );

  const ratings = store.ratings
    .filter((rating) => rating.userId === target.id)
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );

  const start = (page - 1) * pageSize;
  const pageRatings = ratings.slice(start, start + pageSize);

  const totalScore = ratings.reduce((sum, rating) => sum + rating.score, 0);
  const avgScore = ratings.length ? totalScore / ratings.length : 0;
  const fullCount = ratings.filter(
    (rating) => rating.minutes_watched === 'FULL',
  ).length;
  const fullyWatchedPct = ratings.length
    ? Math.round((fullCount / ratings.length) * 10000) / 100
    : 0;

  const teamsFollowed = store.teamFollows.filter(
    (follow) => follow.userId === target.id,
  ).length;
  const followers = store.userFollows.filter(
    (follow) => follow.followingId === target.id,
  ).length;
  const following = store.userFollows.filter(
    (follow) => follow.followerId === target.id,
  ).length;

  const isFollowing = user
    ? store.userFollows.some(
        (follow) =>
          follow.followerId === user.id && follow.followingId === target.id,
      )
    : false;

  return NextResponse.json({
    user: toUserMini(target),
    is_following: isFollowing,
    stats: {
      total_ratings: ratings.length,
      avg_score: Math.round(avgScore * 100) / 100,
      teams_followed: teamsFollowed,
      followers,
      following,
      fully_watched_pct: fullyWatchedPct,
    },
    page,
    page_size: pageSize,
    total: ratings.length,
    ratings: pageRatings.map((rating) => toRatingWithMatch(store, rating)),
  });
}
