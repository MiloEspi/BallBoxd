import { NextResponse } from 'next/server';

import { getAuthUser, getDemoStore } from '../_demo';

// Returns the list of teams, optionally marking those followed by the user.
export async function GET(request: Request) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  const followed = new Set(
    store.teamFollows
      .filter((follow) => follow.userId === user?.id)
      .map((follow) => follow.teamId),
  );

  const teams = store.teams.map((team) => ({
    id: team.id,
    name: team.name,
    country: team.country,
    is_following: followed.has(team.id),
  }));

  return NextResponse.json({ count: teams.length, results: teams });
}
