import { NextResponse } from 'next/server';

import {
  buildLeagueRanking,
  buildTeamDistribution,
  filterRatingsByRange,
  getAuthUser,
  getDemoStore,
  getRangeStart,
  roundToTwo,
  toUserMini,
  unauthorized,
} from '../../../_demo';

// Returns aggregated profile stats with distributions.
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

  const url = new URL(request.url);
  const range = url.searchParams.get('range') ?? 'month';
  const rangeStart = getRangeStart(range);

  const ratings = filterRatingsByRange(
    store.ratings.filter((rating) => rating.userId === profileUser.id),
    rangeStart,
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
    range,
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
    team_distribution: buildTeamDistribution(store, ratings, 5),
    league_top: buildLeagueRanking(store, ratings),
  });
}
