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

// Returns profile activity list for a given range.
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
  )
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    )
    .slice(0, 10)
    .map((rating) => toRatingWithMatch(store, rating));

  return NextResponse.json({
    user: toUserMini(profileUser),
    range,
    results: ratings,
  });
}
