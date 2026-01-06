import { NextResponse } from 'next/server';

import { getAuthUser, getDemoStore, toSearchMatch } from '../../../_demo';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Returns matches for a team with optional scope.
export async function GET(request: Request, context: RouteContext) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  const { id } = await context.params;
  const teamId = Number(id);
  if (Number.isNaN(teamId)) {
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  }
  const teamExists = store.teams.some((team) => team.id === teamId);
  if (!teamExists) {
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') ?? 'all';
  const page = Math.max(Number(url.searchParams.get('page') ?? 1) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get('page_size') ?? 20) || 20, 1),
    50,
  );

  const now = Date.now();
  let matches = store.matches.filter(
    (match) => match.homeTeamId === teamId || match.awayTeamId === teamId,
  );
  if (scope === 'recent') {
    matches = matches.filter(
      (match) => new Date(match.date_time).getTime() < now,
    );
  }
  if (scope === 'upcoming') {
    matches = matches.filter(
      (match) => new Date(match.date_time).getTime() >= now,
    );
  }

  matches = matches.sort(
    (left, right) =>
      new Date(right.date_time).getTime() - new Date(left.date_time).getTime(),
  );

  const total = matches.length;
  const start = (page - 1) * pageSize;
  const results = matches.slice(start, start + pageSize).map((match) =>
    toSearchMatch(store, match, user?.id),
  );

  return NextResponse.json({
    page,
    page_size: pageSize,
    total,
    results,
  });
}
