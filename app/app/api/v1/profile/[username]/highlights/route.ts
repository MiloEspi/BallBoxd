import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  filterRatingsByRange,
  getAuthUser,
  getDemoStore,
  getRangeStart,
  toRatingWithMatch,
  toUserMini,
  unauthorized,
} from '../../../_demo';

type RouteContext<T> = {
  params: Promise<T>;
};

// Returns top and low rated matches for the range.
export async function GET(
  request: NextRequest,
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

  const url = new URL(request.url);
  const range = url.searchParams.get('range') ?? 'month';
  const rangeStart = getRangeStart(range);

  const scoped = filterRatingsByRange(
    store.ratings.filter((rating) => rating.userId === profileUser.id),
    rangeStart,
  );

  const topRated = [...scoped]
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((rating) => toRatingWithMatch(store, rating));

  const lowRated = [...scoped]
    .sort((left, right) => left.score - right.score)
    .slice(0, 5)
    .map((rating) => toRatingWithMatch(store, rating));

  return NextResponse.json({
    user: toUserMini(profileUser),
    range,
    top_rated: topRated,
    low_rated: lowRated,
  });
}
