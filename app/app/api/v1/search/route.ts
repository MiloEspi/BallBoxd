import { NextResponse } from 'next/server';

import { getAuthUser, getDemoStore, toSearchMatch, toTeam, toTournament } from '../_demo';

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .trim();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(/\s+/)
    .filter(Boolean);

const splitVsQuery = (value: string) => {
  const normalized = normalizeText(value);
  const parts = normalized.split(/\s+(?:vs|v|-)\s+/);
  if (parts.length === 2) {
    const left = parts[0].split(/\s+/).filter(Boolean);
    const right = parts[1].split(/\s+/).filter(Boolean);
    if (left.length && right.length) {
      return [left, right] as const;
    }
  }
  return null;
};

const paginate = <T>(items: T[], page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export async function GET(request: Request) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';

  if (!q) {
    return NextResponse.json({ detail: 'q is required.' }, { status: 400 });
  }

  const rawTypes = url.searchParams.get('types');
  const types = rawTypes
    ? new Set(
        rawTypes
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      )
    : new Set(['teams', 'leagues', 'matches']);

  const leagueIdParam = url.searchParams.get('league_id');
  const leagueId = leagueIdParam && /^\d+$/.test(leagueIdParam) ? Number(leagueIdParam) : null;
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');
  const page = Math.max(Number(url.searchParams.get('page') ?? 1) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get('page_size') ?? 20) || 20, 1),
    50,
  );

  const tokens = tokenize(q);
  const vsTokens = splitVsQuery(q);
  if (tokens.length === 0 && !vsTokens) {
    return NextResponse.json({
      q,
      page,
      page_size: pageSize,
      total: 0,
      results: { teams: [], leagues: [], matches: [] },
    });
  }
  const results = { teams: [], leagues: [], matches: [] } as {
    teams: ReturnType<typeof toTeam>[];
    leagues: ReturnType<typeof toTournament>[];
    matches: ReturnType<typeof toSearchMatch>[];
  };
  let total = 0;

  if (types.has('teams')) {
    let teams = store.teams.filter((team) =>
      tokens.every((token) => normalizeText(team.name).includes(token)),
    );
    if (leagueId) {
      const leagueTeams = new Set(
        store.matches
          .filter((match) => match.tournamentId === leagueId)
          .flatMap((match) => [match.homeTeamId, match.awayTeamId]),
      );
      teams = teams.filter((team) => leagueTeams.has(team.id));
    }
    teams = teams.sort((a, b) => a.name.localeCompare(b.name));
    total += teams.length;
    results.teams = paginate(teams, page, pageSize).map((team) =>
      toTeam(store, team.id),
    );
  }

  if (types.has('leagues')) {
    let leagues = store.tournaments.filter((tournament) =>
      tokens.every((token) =>
        normalizeText(`${tournament.name} ${tournament.country}`).includes(token),
      ),
    );
    leagues = leagues.sort((a, b) => a.name.localeCompare(b.name));
    total += leagues.length;
    results.leagues = paginate(leagues, page, pageSize).map((league) =>
      toTournament(store, league.id),
    );
  }

  if (types.has('matches')) {
    let matches = store.matches;
    if (leagueId) {
      matches = matches.filter((match) => match.tournamentId === leagueId);
    }
    if (dateFrom) {
      const parsed = new Date(dateFrom);
      if (!Number.isNaN(parsed.getTime())) {
        matches = matches.filter(
          (match) => new Date(match.date_time).getTime() >= parsed.getTime(),
        );
      }
    }
    if (dateTo) {
      const parsed = new Date(dateTo);
      if (!Number.isNaN(parsed.getTime())) {
        matches = matches.filter(
          (match) => new Date(match.date_time).getTime() <= parsed.getTime(),
        );
      }
    }

    if (vsTokens) {
      const [left, right] = vsTokens;
      matches = matches.filter((match) => {
        const home = normalizeText(
          store.teams.find((team) => team.id === match.homeTeamId)?.name ?? '',
        );
        const away = normalizeText(
          store.teams.find((team) => team.id === match.awayTeamId)?.name ?? '',
        );
        const homeMatch =
          left.every((token) => home.includes(token)) &&
          right.every((token) => away.includes(token));
        const awayMatch =
          right.every((token) => home.includes(token)) &&
          left.every((token) => away.includes(token));
        return homeMatch || awayMatch;
      });
    } else {
      matches = matches.filter((match) => {
        const home = normalizeText(
          store.teams.find((team) => team.id === match.homeTeamId)?.name ?? '',
        );
        const away = normalizeText(
          store.teams.find((team) => team.id === match.awayTeamId)?.name ?? '',
        );
        return tokens.every(
          (token) => home.includes(token) || away.includes(token),
        );
      });
    }

    matches = matches.sort(
      (left, right) =>
        new Date(right.date_time).getTime() - new Date(left.date_time).getTime(),
    );
    total += matches.length;
    results.matches = paginate(matches, page, pageSize).map((match) =>
      toSearchMatch(store, match, user?.id),
    );
  }

  return NextResponse.json({
    q,
    page,
    page_size: pageSize,
    total,
    results,
  });
}
