import { NextResponse } from 'next/server';

import { getAuthUser, getDemoStore, unauthorized } from '../../../_demo';

// Follows another user for the authenticated user.
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const targetId = Number(params.id);
  if (Number.isNaN(targetId)) {
    return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  }
  if (user.id === targetId) {
    return NextResponse.json(
      { detail: 'Cannot follow yourself.' },
      { status: 400 },
    );
  }

  const target = store.users.find((item) => item.id === targetId);
  if (!target) {
    return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  }

  const exists = store.userFollows.some(
    (follow) =>
      follow.followerId === user.id && follow.followingId === targetId,
  );
  if (!exists) {
    store.userFollows.push({ followerId: user.id, followingId: targetId });
  }

  return NextResponse.json({}, { status: 201 });
}

// Unfollows another user for the authenticated user.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const targetId = Number(params.id);
  if (Number.isNaN(targetId)) {
    return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  }
  store.userFollows = store.userFollows.filter(
    (follow) =>
      !(follow.followerId === user.id && follow.followingId === targetId),
  );

  return new NextResponse(null, { status: 204 });
}
