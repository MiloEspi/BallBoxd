import { NextResponse } from 'next/server';

import { getAuthUser, getDemoStore, toMatch, unauthorized } from '../_demo';

// Returns matches from followed teams for the authenticated user.
export async function GET(request: Request) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const followedTeamIds = new Set(
    store.teamFollows
      .filter((follow) => follow.userId === user.id)
      .map((follow) => follow.teamId),
  );

  const matches = store.matches
    .filter(
      (match) =>
        followedTeamIds.has(match.homeTeamId) ||
        followedTeamIds.has(match.awayTeamId),
    )
    .sort(
      (left, right) =>
        new Date(right.date_time).getTime() -
        new Date(left.date_time).getTime(),
    );

  const results = matches.map((match) => toMatch(store, match, user.id));

  return NextResponse.json({ count: results.length, results });
}
