import { NextResponse } from 'next/server';

import { getAuthUser, getDemoStore, toMatch } from '../../../_demo';

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

  const getDayStart = (value: string) => {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };

  const sortRecent = (left: { date_time: string }, right: { date_time: string }) => {
    const leftDay = getDayStart(left.date_time);
    const rightDay = getDayStart(right.date_time);
    if (leftDay !== rightDay) {
      return rightDay - leftDay;
    }
    return new Date(left.date_time).getTime() - new Date(right.date_time).getTime();
  };

  const sortUpcoming = (
    left: { date_time: string },
    right: { date_time: string },
  ) => new Date(left.date_time).getTime() - new Date(right.date_time).getTime();

  if (scope === 'upcoming') {
    matches = matches.sort(sortUpcoming);
  } else if (scope === 'recent') {
    matches = matches.sort(sortRecent);
  } else {
    const upcoming = matches
      .filter((match) => new Date(match.date_time).getTime() >= now)
      .sort(sortUpcoming);
    const past = matches
      .filter((match) => new Date(match.date_time).getTime() < now)
      .sort(sortRecent);
    matches = [...upcoming, ...past];
  }

  const total = matches.length;
  const start = (page - 1) * pageSize;
  const results = matches
    .slice(start, start + pageSize)
    .map((match) => toMatch(store, match, user?.id));

  return NextResponse.json({
    page,
    page_size: pageSize,
    total,
    results,
  });
}
