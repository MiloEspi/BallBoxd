import { NextResponse } from 'next/server';

import {
  getAuthUser,
  getDemoStore,
  roundToTwo,
  toRatingWithMatch,
  toUserMini,
  unauthorized,
} from '../../_demo';

// Returns profile overview with stats and recent activity.
export async function GET(
  request: Request,
  { params }: { params: { username: string } },
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const profileUser = store.users.find(
    (item) => item.username === params.username,
  );
  if (!profileUser) {
    return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  }

  const ratings = store.ratings
    .filter((rating) => rating.userId === profileUser.id)
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );

  const totalRatings = ratings.length;
  const avgScore = totalRatings
    ? roundToTwo(
        ratings.reduce((sum, rating) => sum + rating.score, 0) / totalRatings,
      )
    : 0;
  const fullCount = ratings.filter(
    (rating) => rating.minutes_watched === 'FULL',
  ).length;
  const fullyWatchedPct = totalRatings
    ? roundToTwo((fullCount / totalRatings) * 100)
    : 0;

  return NextResponse.json({
    user: toUserMini(profileUser),
    stats: {
      total_ratings: totalRatings,
      avg_score: avgScore,
      teams_followed: store.teamFollows.filter(
        (follow) => follow.userId === profileUser.id,
      ).length,
      followers: store.userFollows.filter(
        (follow) => follow.followingId === profileUser.id,
      ).length,
      following: store.userFollows.filter(
        (follow) => follow.followerId === profileUser.id,
      ).length,
      fully_watched_pct: fullyWatchedPct,
    },
    recent_activity: ratings.slice(0, 10).map((rating) =>
      toRatingWithMatch(store, rating),
    ),
  });
}
