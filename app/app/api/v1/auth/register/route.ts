import { NextResponse } from 'next/server';

import { createToken, getDemoStore, toUserMini } from '../../_demo';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Registers a demo user and returns an auth token.
export async function POST(request: Request) {
  if (DEMO_MODE) {
    return NextResponse.json(
      { detail: 'Register disabled in demo. Use seed accounts.' },
      { status: 403 },
    );
  }

  const store = getDemoStore();
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    email?: string;
    password?: string;
  };
  const username = body.username?.trim();
  const email = body.email?.trim();
  const password = body.password;

  if (!username || !email || !password) {
    return NextResponse.json(
      { detail: 'Username, email, and password required.' },
      { status: 400 },
    );
  }

  const exists = store.users.some((item) => item.username === username);
  if (exists) {
    return NextResponse.json(
      { detail: 'Username already exists.' },
      { status: 400 },
    );
  }

  const user = {
    id: store.nextIds.user,
    username,
    email,
    password,
  };
  store.nextIds.user += 1;
  store.users.push(user);

  const token = createToken();
  store.tokens.set(token, user.id);

  return NextResponse.json({ token, user: toUserMini(user) }, { status: 201 });
}
