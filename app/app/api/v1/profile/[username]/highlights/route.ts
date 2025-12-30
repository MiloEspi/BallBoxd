import { NextResponse } from 'next/server';

import {
  filterRatingsByRange,
  getAuthUser,
  getDemoStore,
  getRangeStart,
  toRatingWithMatch,
  toUserMini,
  unauthorized,
} from '../../../_demo';

// Returns top and low rated matches for the range.
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
