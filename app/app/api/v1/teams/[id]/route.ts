import { NextResponse } from 'next/server';

import { getDemoStore, toTeam } from '../../_demo';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Returns team details by id.
export async function GET(_request: Request, context: RouteContext) {
  const store = getDemoStore();
  const { id } = await context.params;
  const teamId = Number(id);
  if (Number.isNaN(teamId)) {
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  }

  const team = store.teams.find((item) => item.id === teamId);
  if (!team) {
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  }

  return NextResponse.json(toTeam(store, team.id));
}
