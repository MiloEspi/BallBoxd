import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  getAuthUser,
  getDemoStore,
  getMatchById,
  getMatchStats,
  toMatch,
  toRating,
} from '../../_demo';

type RouteContext<T> = {
  params: Promise<T>;
};

// Returns match details with stats and contextual ratings.
export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  const store = getDemoStore();
  const { id } = await context.params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) {
    return NextResponse.json({ detail: 'Match not found.' }, { status: 404 });
  }

  const match = getMatchById(store, matchId);
  if (!match) {
    return NextResponse.json({ detail: 'Match not found.' }, { status: 404 });
  }

  const stats = getMatchStats(store, matchId);
  const user = getAuthUser(request);
  const myRating = user
    ? store.ratings.find(
        (rating) => rating.userId === user.id && rating.matchId === matchId,
      )
    : null;

  const featuredReviews = stats.ratings
    .filter((rating) => rating.review)
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    )
    .slice(0, 3)
    .map((rating) => toRating(store, rating));

  let followedRatings: ReturnType<typeof toRating>[] = [];
  if (user) {
    const followingIds = new Set(
      store.userFollows
        .filter((follow) => follow.followerId === user.id)
        .map((follow) => follow.followingId),
    );
    followedRatings = stats.ratings
      .filter((rating) => followingIds.has(rating.userId))
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime(),
      )
      .slice(0, 10)
      .map((rating) => toRating(store, rating));
  }

  return NextResponse.json({
    match: toMatch(store, match),
    avg_score: stats.avgScore,
    rating_count: stats.ratingCount,
    full_watched_pct: stats.fullWatchedPct,
    featured_reviews: featuredReviews,
    followed_ratings: followedRatings,
    my_rating: myRating ? toRating(store, myRating) : null,
  });
}
