import { NextResponse } from 'next/server';

import { getAuthUser, getDemoStore, unauthorized } from '../../../_demo';

// Follows a team for the authenticated user.
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const teamId = Number(params.id);
  if (Number.isNaN(teamId)) {
    return NextResponse.json({ detail: 'Team not found.' }, { status: 404 });
  }
  const team = store.teams.find((item) => item.id === teamId);
  if (!team) {
    return NextResponse.json({ detail: 'Team not found.' }, { status: 404 });
  }

  const exists = store.teamFollows.some(
    (follow) => follow.userId === user.id && follow.teamId === teamId,
  );
  if (!exists) {
    store.teamFollows.push({ userId: user.id, teamId });
  }

  return NextResponse.json({}, { status: 201 });
}

// Unfollows a team for the authenticated user.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const teamId = Number(params.id);
  if (Number.isNaN(teamId)) {
    return NextResponse.json({ detail: 'Team not found.' }, { status: 404 });
  }
  store.teamFollows = store.teamFollows.filter(
    (follow) => !(follow.userId === user.id && follow.teamId === teamId),
  );

  return new NextResponse(null, { status: 204 });
}
