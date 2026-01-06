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

// Returns memory details for the authenticated user.
export async function GET(
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
    return NextResponse.json({ detail: 'Rating not found.' }, { status: 404 });
  }

  return NextResponse.json(toRating(store, rating));
}

// Updates attendance and memory fields for the authenticated user.
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
    return NextResponse.json({ detail: 'Rating not found.' }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    attended?: boolean;
    stadium_photo_url?: string | null;
    representative_photo_url?: string | null;
    featured_note?: string | null;
    featured_primary_image?: 'representative' | 'stadium';
  };

  if (typeof payload.attended === 'boolean') {
    rating.attended = payload.attended;
  }
  if (typeof payload.stadium_photo_url === 'string') {
    rating.stadium_photo_url = payload.stadium_photo_url;
  }
  if (payload.stadium_photo_url === null) {
    rating.stadium_photo_url = '';
  }
  if (typeof payload.representative_photo_url === 'string') {
    rating.representative_photo_url = payload.representative_photo_url;
  }
  if (payload.representative_photo_url === null) {
    rating.representative_photo_url = '';
  }
  if (typeof payload.featured_note === 'string') {
    rating.featured_note = payload.featured_note.slice(0, 240);
  }
  if (payload.featured_note === null) {
    rating.featured_note = '';
  }
  if (
    payload.featured_primary_image === 'representative' ||
    payload.featured_primary_image === 'stadium'
  ) {
    rating.featured_primary_image = payload.featured_primary_image;
  }
  if (rating.featured_primary_image === 'stadium' && !rating.stadium_photo_url) {
    rating.featured_primary_image = 'representative';
  }

  return NextResponse.json(toRating(store, rating));
}
