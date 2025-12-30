import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  getAuthUser,
  getDemoStore,
  getMatchById,
  toRating,
  unauthorized,
} from '../../../_demo';

type RouteContext<T> = {
  params: Promise<T>;
};

type RatePayload = {
  score?: number;
  minutes_watched?: string;
  review?: string;
};

// Creates a rating for the authenticated user.
export async function POST(
  request: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) {
    return NextResponse.json({ detail: 'Match not found.' }, { status: 404 });
  }
  const match = getMatchById(store, matchId);
  if (!match) {
    return NextResponse.json({ detail: 'Match not found.' }, { status: 404 });
  }

  const existing = store.ratings.find(
    (rating) => rating.userId === user.id && rating.matchId === matchId,
  );
  if (existing) {
    return NextResponse.json(
      { detail: 'Rating already exists.' },
      { status: 409 },
    );
  }

  const payload = (await request.json().catch(() => ({}))) as RatePayload;
  if (
    typeof payload.score !== 'number' ||
    typeof payload.minutes_watched !== 'string'
  ) {
    return NextResponse.json(
      { detail: 'Score and minutes_watched are required.' },
      { status: 400 },
    );
  }

  const rating = {
    id: store.nextIds.rating,
    userId: user.id,
    matchId,
    score: payload.score,
    minutes_watched: payload.minutes_watched,
    review: payload.review ?? '',
    created_at: new Date().toISOString(),
  };
  store.nextIds.rating += 1;
  store.ratings.push(rating);

  return NextResponse.json(toRating(store, rating), { status: 201 });
}

// Updates a rating for the authenticated user.
export async function PATCH(
  request: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) {
    return NextResponse.json({ detail: 'Match not found.' }, { status: 404 });
  }
  const match = getMatchById(store, matchId);
  if (!match) {
    return NextResponse.json({ detail: 'Match not found.' }, { status: 404 });
  }

  const rating = store.ratings.find(
    (item) => item.userId === user.id && item.matchId === matchId,
  );
  if (!rating) {
    return NextResponse.json(
      { detail: 'Rating not found.' },
      { status: 404 },
    );
  }

  const payload = (await request.json().catch(() => ({}))) as RatePayload;
  if (typeof payload.score === 'number') {
    rating.score = payload.score;
  }
  if (typeof payload.minutes_watched === 'string') {
    rating.minutes_watched = payload.minutes_watched;
  }
  if (typeof payload.review === 'string') {
    rating.review = payload.review;
  }

  return NextResponse.json(toRating(store, rating));
}
