import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAuthUser, getDemoStore, unauthorized } from '../../../../_demo';

type RouteContext<T> = {
  params: Promise<T>;
};

// Removes a match from featured list.
export async function DELETE(
  request: NextRequest,
  context: RouteContext<{ username: string; matchId: string }>,
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const { username, matchId } = await context.params;
  if (user.username !== username) {
    return NextResponse.json(
      { detail: 'You cannot edit this profile.' },
      { status: 403 },
    );
  }

  const matchIdValue = Number(matchId);
  if (Number.isNaN(matchIdValue)) {
    return NextResponse.json({ detail: 'Match not found.' }, { status: 404 });
  }

  const rating = store.ratings.find(
    (item) => item.userId === user.id && item.matchId === matchIdValue,
  );
  if (!rating) {
    return NextResponse.json({ detail: 'Match not found.' }, { status: 404 });
  }

  rating.featured_order = null;
  return NextResponse.json(null, { status: 204 });
}
