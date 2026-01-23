import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAuthUser, getDemoStore, unauthorized } from '../../../_demo';

type DemoStore = ReturnType<typeof getDemoStore>;

type RouteContext<T> = {
  params: Promise<T>;
};

const buildCounts = (store: DemoStore, targetId: number) => {
  const followers = store.userFollows.filter(
    (follow) => follow.followingId === targetId,
  ).length;
  const following = store.userFollows.filter(
    (follow) => follow.followerId === targetId,
  ).length;
  return { followers, following };
};

// Follows another user by username for demo mode.
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
  const target = store.users.find((item) => item.username === username);
  if (!target) {
    return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  }
  if (user.id === target.id) {
    return NextResponse.json(
      { detail: 'Cannot follow yourself.' },
      { status: 400 },
    );
  }

  const exists = store.userFollows.some(
    (follow) =>
      follow.followerId === user.id && follow.followingId === target.id,
  );
  if (!exists) {
    store.userFollows.push({ followerId: user.id, followingId: target.id });
  }

  return NextResponse.json({
    is_following: true,
    ...buildCounts(store, target.id),
  });
}

// Unfollows another user by username for demo mode.
export async function DELETE(
  request: NextRequest,
  context: RouteContext<{ username: string }>,
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const { username } = await context.params;
  const target = store.users.find((item) => item.username === username);
  if (!target) {
    return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  }
  if (user.id === target.id) {
    return NextResponse.json(
      { detail: 'Cannot unfollow yourself.' },
      { status: 400 },
    );
  }

  store.userFollows = store.userFollows.filter(
    (follow) =>
      !(follow.followerId === user.id && follow.followingId === target.id),
  );

  return NextResponse.json({
    is_following: false,
    ...buildCounts(store, target.id),
  });
}
