import { NextResponse } from 'next/server';

import { getAuthUser, getDemoStore, toTeam, unauthorized } from '../../../_demo';

type RouteContext<T> = {
  params: Promise<T>;
};

// Returns the list of teams followed by the profile user.
export async function GET(
  request: Request,
  context: RouteContext<{ username: string }>,
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const { username } = await context.params;
  const profileUser = store.users.find((item) => item.username === username);
  if (!profileUser) {
    return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  }

  const followedIds = new Set(
    store.teamFollows
      .filter((follow) => follow.userId === profileUser.id)
      .map((follow) => follow.teamId),
  );
  const teams = store.teams
    .filter((team) => followedIds.has(team.id))
    .map((team) => toTeam(store, team.id));

  return NextResponse.json({ count: teams.length, results: teams });
}
