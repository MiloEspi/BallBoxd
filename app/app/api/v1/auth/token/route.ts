import { NextResponse } from 'next/server';

import { createToken, getDemoStore } from '../../_demo';

// Issues a demo token for valid username/password credentials.
export async function POST(request: Request) {
  const store = getDemoStore();
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password) {
    return NextResponse.json(
      { detail: 'Username and password required.' },
      { status: 400 },
    );
  }

  const user = store.users.find((item) => item.username === username);
  if (!user || user.password !== password) {
    return NextResponse.json({ detail: 'Invalid credentials.' }, { status: 400 });
  }

  const token = createToken();
  store.tokens.set(token, user.id);
  return NextResponse.json({ token });
}
