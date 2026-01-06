import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  getAuthUser,
  getDemoStore,
  toRatingWithMatch,
  toUserMini,
  unauthorized,
} from '../../../_demo';

type RouteContext<T> = {
  params: Promise<T>;
};

const MAX_FEATURED = 4;

const getFeaturedRatings = (store: ReturnType<typeof getDemoStore>, userId: number) => {
  return store.ratings
    .filter((rating) => rating.userId === userId && rating.featured_order)
    .sort((left, right) => (left.featured_order ?? 0) - (right.featured_order ?? 0));
};

// Returns the featured matches for a profile.
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

  const featured = getFeaturedRatings(store, profileUser.id).map((rating) =>
    toRatingWithMatch(store, rating),
  );

  return NextResponse.json({
    user: toUserMini(profileUser),
    max_count: MAX_FEATURED,
    results: featured,
  });
}

// Adds a match to featured, optionally replacing an existing one.
export async function POST(
  request: NextRequest,
  context: RouteContext<{ username: string }>,
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const { username } = await context.params;
  if (user.username !== username) {
    return NextResponse.json(
      { detail: 'You cannot edit this profile.' },
      { status: 403 },
    );
  }

  const payload = (await request.json().catch(() => ({}))) as {
    match_id?: number;
    replace_match_id?: number;
  };
  if (!payload.match_id || Number.isNaN(Number(payload.match_id))) {
    return NextResponse.json({ detail: 'match_id is required.' }, { status: 400 });
  }

  const matchId = Number(payload.match_id);
  const rating = store.ratings.find(
    (item) => item.userId === user.id && item.matchId === matchId,
  );
  if (!rating) {
    return NextResponse.json(
      { detail: 'You need to rate this match first.' },
      { status: 400 },
    );
  }

  if (rating.featured_order) {
    return GET(request, context);
  }

  const featured = getFeaturedRatings(store, user.id);
  if (featured.length >= MAX_FEATURED && !payload.replace_match_id) {
    return NextResponse.json(
      {
        detail: 'Featured list is full.',
        current: featured.map((item) => item.matchId),
      },
      { status: 409 },
    );
  }

  let targetOrder = 1;
  if (payload.replace_match_id) {
    const replace = featured.find(
      (item) => item.matchId === Number(payload.replace_match_id),
    );
    if (!replace || !replace.featured_order) {
      return NextResponse.json(
        { detail: 'replace_match_id is not featured.' },
        { status: 400 },
      );
    }
    targetOrder = replace.featured_order;
    replace.featured_order = null;
  } else {
    const taken = new Set(featured.map((item) => item.featured_order));
    for (let value = 1; value <= MAX_FEATURED; value += 1) {
      if (!taken.has(value)) {
        targetOrder = value;
        break;
      }
    }
  }

  rating.featured_order = targetOrder;
  return GET(request, context);
}

// Reorders or updates featured matches.
export async function PATCH(
  request: NextRequest,
  context: RouteContext<{ username: string }>,
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const { username } = await context.params;
  if (user.username !== username) {
    return NextResponse.json(
      { detail: 'You cannot edit this profile.' },
      { status: 403 },
    );
  }

  const payload = (await request.json().catch(() => ({}))) as {
    order?: number[];
    match_id?: number;
    featured_note?: string | null;
    representative_photo_url?: string | null;
    featured_primary_image?: 'representative' | 'stadium';
  };

  if (Array.isArray(payload.order)) {
    const orderList = payload.order.map((item) => Number(item)).filter(Number.isFinite);
    const featured = getFeaturedRatings(store, user.id);
    const currentIds = featured.map((item) => item.matchId).sort();
    const nextIds = [...orderList].sort();
    if (new Set(orderList).size !== orderList.length) {
      return NextResponse.json(
        { detail: 'Order list contains duplicates.' },
        { status: 400 },
      );
    }
    if (currentIds.length !== nextIds.length) {
      return NextResponse.json(
        { detail: 'Order list must match featured matches.' },
        { status: 400 },
      );
    }
    const sameSet = currentIds.every((item, index) => item === nextIds[index]);
    if (!sameSet) {
      return NextResponse.json(
        { detail: 'Order list must match featured matches.' },
        { status: 400 },
      );
    }
    featured.forEach((rating) => {
      rating.featured_order = null;
    });
    orderList.forEach((matchId, index) => {
      const rating = store.ratings.find(
        (item) => item.userId === user.id && item.matchId === matchId,
      );
      if (rating) {
        rating.featured_order = index + 1;
      }
    });
    return GET(request, context);
  }

  if (payload.match_id && Number.isFinite(Number(payload.match_id))) {
    const matchId = Number(payload.match_id);
    const rating = store.ratings.find(
      (item) => item.userId === user.id && item.matchId === matchId,
    );
    if (!rating || !rating.featured_order) {
      return NextResponse.json(
        { detail: 'Match is not featured.' },
        { status: 400 },
      );
    }

    if (typeof payload.featured_note === 'string') {
      rating.featured_note = payload.featured_note.slice(0, 240);
    }
    if (payload.featured_note === null) {
      rating.featured_note = '';
    }
    if (typeof payload.representative_photo_url === 'string') {
      rating.representative_photo_url = payload.representative_photo_url;
    }
    if (payload.representative_photo_url === null) {
      rating.representative_photo_url = '';
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
    return GET(request, context);
  }

  return NextResponse.json(
    { detail: 'No valid update payload provided.' },
    { status: 400 },
  );
}
