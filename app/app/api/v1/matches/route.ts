import { NextResponse } from 'next/server';

import { getAuthUser, getDemoStore, toMatch } from '../_demo';

type MatchFilters = {
  date?: string | null;
  from?: string | null;
  to?: string | null;
  tournament?: string | null;
  search?: string | null;
};

// Parses a date string into a Date instance.
const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Checks if two Date objects are on the same calendar day.
const isSameDay = (left: Date, right: Date) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

// Filters matches by search params (date, range, tournament, search).
const filterMatches = (
  filters: MatchFilters,
  matches: ReturnType<typeof getDemoStore>['matches'],
  store: ReturnType<typeof getDemoStore>,
) => {
  const date = parseDate(filters.date);
  const from = parseDate(filters.from);
  const to = parseDate(filters.to);
  const tournament = filters.tournament?.toLowerCase().trim();
  const search = filters.search?.toLowerCase().trim();

  return matches.filter((match) => {
    const matchDate = new Date(match.date_time);

    if (date && !isSameDay(matchDate, date)) {
      return false;
    }

    if (from && matchDate < from) {
      return false;
    }

    if (to && matchDate > to) {
      return false;
    }

    if (tournament) {
      const tournamentMatch = store.tournaments.find(
        (item) => item.id === match.tournamentId,
      );
      const tournamentName = tournamentMatch?.name.toLowerCase() ?? '';
      const tournamentId = String(match.tournamentId);
      if (tournament !== tournamentId && tournamentName !== tournament) {
        return false;
      }
    }

    if (search) {
      const home = store.teams.find((team) => team.id === match.homeTeamId);
      const away = store.teams.find((team) => team.id === match.awayTeamId);
      const tournamentMatch = store.tournaments.find(
        (item) => item.id === match.tournamentId,
      );
      const haystack = [
        home?.name ?? '',
        away?.name ?? '',
        tournamentMatch?.name ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    return true;
  });
};

// Returns a catalog of matches with optional filters.
export async function GET(request: Request) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  const url = new URL(request.url);

  const filters: MatchFilters = {
    date: url.searchParams.get('date'),
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
    tournament: url.searchParams.get('tournament'),
    search: url.searchParams.get('search'),
  };

  const filtered = filterMatches(filters, store.matches, store).sort(
    (left, right) =>
      new Date(right.date_time).getTime() -
      new Date(left.date_time).getTime(),
  );

  const results = filtered.map((match) =>
    toMatch(store, match, user?.id),
  );

  return NextResponse.json({ count: results.length, results });
}
