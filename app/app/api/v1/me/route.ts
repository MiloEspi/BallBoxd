import { NextResponse } from 'next/server';

import { getAuthUser, toUserMini, unauthorized } from '../_demo';

// Returns the authenticated demo user.
export async function GET(request: Request) {
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }
  return NextResponse.json(toUserMini(user));
}
