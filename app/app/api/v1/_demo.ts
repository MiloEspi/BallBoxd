import { NextResponse } from 'next/server';

export type DemoUser = {
  id: number;
  username: string;
  email: string;
  password: string;
};

type DemoTeam = {
  id: number;
  name: string;
  country: string;
  city?: string | null;
  stadium?: string | null;
  logo_url?: string | null;
};

type DemoTournament = {
  id: number;
  name: string;
  country: string;
  season?: string | null;
  logo_url?: string | null;
};

type DemoMatch = {
  id: number;
  tournamentId: number;
  homeTeamId: number;
  awayTeamId: number;
  date_time: string;
  home_score: number;
  away_score: number;
};

type DemoRating = {
  id: number;
  userId: number;
  matchId: number;
  score: number;
  minutes_watched: string;
  review: string;
  attended: boolean;
  stadium_photo_url?: string | null;
  representative_photo_url?: string | null;
  featured_note?: string | null;
  featured_order?: number | null;
  featured_primary_image?: 'representative' | 'stadium';
  created_at: string;
};

type DemoTeamFollow = {
  userId: number;
  teamId: number;
};

type DemoUserFollow = {
  followerId: number;
  followingId: number;
};

type DemoStore = {
  users: DemoUser[];
  teams: DemoTeam[];
  tournaments: DemoTournament[];
  matches: DemoMatch[];
  ratings: DemoRating[];
  teamFollows: DemoTeamFollow[];
  userFollows: DemoUserFollow[];
  tokens: Map<string, number>;
  nextIds: {
    user: number;
    rating: number;
  };
};

type TeamDistributionItem = {
  label: string;
  team: DemoTeam | null;
  count: number;
  pct: number;
};

type LeagueRankingItem = {
  tournament: DemoTournament;
  count: number;
  pct: number;
};

type GlobalStore = typeof globalThis & {
  __ballboxdDemoStore?: DemoStore;
};

const globalStore = globalThis as GlobalStore;

// Builds a date ISO string offset by a number of days.
const dateWithOffset = (base: Date, days: number, hours: number) => {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  next.setUTCHours(next.getUTCHours() + hours);
  return next.toISOString();
};

// Creates the demo store with seeded data.
const createDemoStore = (): DemoStore => {
  const users: DemoUser[] = [
    {
      id: 1,
      username: 'camilo',
      email: 'camilo@ballboxd.test',
      password: '12345678',
    },
    {
      id: 2,
      username: 'alice',
      email: 'alice@ballboxd.test',
      password: '12345678',
    },
    {
      id: 3,
      username: 'bob',
      email: 'bob@ballboxd.test',
      password: '12345678',
    },
  ];

  const tournaments: DemoTournament[] = [
    { id: 1, name: 'Premier League', country: 'England' },
    { id: 2, name: 'La Liga', country: 'Spain' },
  ];

  const teams: DemoTeam[] = [
    { id: 1, name: 'Manchester City', country: 'England' },
    { id: 2, name: 'Liverpool', country: 'England' },
    { id: 3, name: 'Arsenal', country: 'England' },
    { id: 4, name: 'Chelsea', country: 'England' },
    { id: 5, name: 'Real Madrid', country: 'Spain' },
    { id: 6, name: 'Barcelona', country: 'Spain' },
    { id: 7, name: 'Atletico Madrid', country: 'Spain' },
    { id: 8, name: 'Sevilla', country: 'Spain' },
  ];

  const baseDate = new Date('2025-01-05T18:00:00Z');
  const matches: DemoMatch[] = [
    {
      id: 1,
      tournamentId: 1,
      homeTeamId: 1,
      awayTeamId: 2,
      date_time: dateWithOffset(baseDate, 0, 0),
      home_score: 2,
      away_score: 1,
    },
    {
      id: 2,
      tournamentId: 1,
      homeTeamId: 3,
      awayTeamId: 4,
      date_time: dateWithOffset(baseDate, -1, 0),
      home_score: 1,
      away_score: 1,
    },
    {
      id: 3,
      tournamentId: 2,
      homeTeamId: 5,
      awayTeamId: 6,
      date_time: dateWithOffset(baseDate, -2, 0),
      home_score: 3,
      away_score: 2,
    },
    {
      id: 4,
      tournamentId: 2,
      homeTeamId: 7,
      awayTeamId: 8,
      date_time: dateWithOffset(baseDate, -3, 0),
      home_score: 0,
      away_score: 1,
    },
    {
      id: 5,
      tournamentId: 1,
      homeTeamId: 2,
      awayTeamId: 3,
      date_time: dateWithOffset(baseDate, -4, 0),
      home_score: 2,
      away_score: 2,
    },
    {
      id: 6,
      tournamentId: 2,
      homeTeamId: 5,
      awayTeamId: 7,
      date_time: dateWithOffset(baseDate, -5, 0),
      home_score: 1,
      away_score: 0,
    },
  ];

  const ratings: DemoRating[] = [
    {
      id: 1,
      userId: 1,
      matchId: 1,
      score: 85,
      minutes_watched: 'FULL',
      review: 'Intense game with a brilliant second half.',
      attended: true,
      stadium_photo_url: '/hero-mobile.png',
      representative_photo_url: '/hero-desktop.png',
      featured_note: 'Fue el primer partido con mi viejo.',
      featured_order: 1,
      featured_primary_image: 'representative',
      created_at: dateWithOffset(baseDate, 0, 2),
    },
    {
      id: 2,
      userId: 2,
      matchId: 1,
      score: 78,
      minutes_watched: 'ALMOST_ALL',
      review: 'Great tempo, could have been a draw.',
      attended: false,
      stadium_photo_url: '',
      representative_photo_url: '',
      featured_note: '',
      featured_order: null,
      featured_primary_image: 'representative',
      created_at: dateWithOffset(baseDate, 0, 3),
    },
    {
      id: 3,
      userId: 3,
      matchId: 1,
      score: 90,
      minutes_watched: 'FULL',
      review: '',
      attended: false,
      stadium_photo_url: '',
      representative_photo_url: '',
      featured_note: '',
      featured_order: null,
      featured_primary_image: 'representative',
      created_at: dateWithOffset(baseDate, 0, 4),
    },
    {
      id: 4,
      userId: 1,
      matchId: 3,
      score: 92,
      minutes_watched: 'FULL',
      review: 'Clasico delivered, wild ending.',
      attended: true,
      stadium_photo_url: '/hero-desktop.png',
      representative_photo_url: '/hero-mobile.png',
      featured_note: 'Noche eterna en el Bernabeu.',
      featured_order: 2,
      featured_primary_image: 'stadium',
      created_at: dateWithOffset(baseDate, -2, 2),
    },
    {
      id: 5,
      userId: 2,
      matchId: 3,
      score: 88,
      minutes_watched: 'ONE_HALF',
      review: '',
      attended: false,
      stadium_photo_url: '',
      representative_photo_url: '',
      featured_note: '',
      featured_order: null,
      featured_primary_image: 'representative',
      created_at: dateWithOffset(baseDate, -2, 3),
    },
    {
      id: 6,
      userId: 3,
      matchId: 2,
      score: 70,
      minutes_watched: 'LT_30',
      review: 'Slow start, improved late on.',
      attended: false,
      stadium_photo_url: '',
      representative_photo_url: '',
      featured_note: '',
      featured_order: null,
      featured_primary_image: 'representative',
      created_at: dateWithOffset(baseDate, -1, 2),
    },
    {
      id: 7,
      userId: 1,
      matchId: 5,
      score: 76,
      minutes_watched: 'ALMOST_ALL',
      review: 'Back and forth, fun finish.',
      attended: false,
      stadium_photo_url: '',
      representative_photo_url: '/hero-mobile.png',
      featured_note: 'Termino 2-2 y nos abrazamos.',
      featured_order: 3,
      featured_primary_image: 'representative',
      created_at: dateWithOffset(baseDate, -4, 1),
    },
    {
      id: 8,
      userId: 2,
      matchId: 4,
      score: 66,
      minutes_watched: 'FULL',
      review: 'Tactical, not much flair.',
      attended: false,
      stadium_photo_url: '',
      representative_photo_url: '',
      featured_note: '',
      featured_order: null,
      featured_primary_image: 'representative',
      created_at: dateWithOffset(baseDate, -3, 2),
    },
    {
      id: 9,
      userId: 3,
      matchId: 6,
      score: 81,
      minutes_watched: 'FULL',
      review: 'Solid defensive display.',
      attended: false,
      stadium_photo_url: '',
      representative_photo_url: '',
      featured_note: '',
      featured_order: null,
      featured_primary_image: 'representative',
      created_at: dateWithOffset(baseDate, -5, 2),
    },
  ];

  const teamFollows: DemoTeamFollow[] = [
    { userId: 1, teamId: 1 },
    { userId: 1, teamId: 5 },
    { userId: 1, teamId: 6 },
    { userId: 2, teamId: 2 },
    { userId: 2, teamId: 3 },
    { userId: 3, teamId: 5 },
  ];

  const userFollows: DemoUserFollow[] = [
    { followerId: 1, followingId: 2 },
    { followerId: 1, followingId: 3 },
    { followerId: 2, followingId: 1 },
  ];

  return {
    users,
    teams,
    tournaments,
    matches,
    ratings,
    teamFollows,
    userFollows,
    tokens: new Map(),
    nextIds: {
      user: users.length + 1,
      rating: ratings.length + 1,
    },
  };
};

// Returns the singleton demo store instance.
export const getDemoStore = () => {
  if (!globalStore.__ballboxdDemoStore) {
    globalStore.__ballboxdDemoStore = createDemoStore();
  }
  return globalStore.__ballboxdDemoStore;
};

// Creates a new token string for demo auth.
export const createToken = () => {
  return `demo_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

// Extracts the auth token from the request headers.
export const getTokenFromRequest = (request: Request) => {
  const header = request.headers.get('authorization') ?? '';
  const [type, token] = header.split(' ');
  if (type !== 'Token' || !token) {
    return null;
  }
  return token.trim();
};

// Finds the user associated with a request token.
export const getAuthUser = (request: Request) => {
  const store = getDemoStore();
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }
  const userId = store.tokens.get(token);
  if (!userId) {
    return null;
  }
  return store.users.find((user) => user.id === userId) ?? null;
};

// Returns a 401 JSON response for missing auth.
export const unauthorized = () => {
  return NextResponse.json(
    { detail: 'Authentication credentials were not provided.' },
    { status: 401 },
  );
};

// Builds a minimal user payload for API responses.
export const toUserMini = (user: DemoUser) => {
  return { id: user.id, username: user.username };
};

// Builds a tournament payload for API responses.
export const toTournament = (store: DemoStore, tournamentId: number) => {
  const tournament = store.tournaments.find(
    (item) => item.id === tournamentId,
  );
  if (!tournament) {
    return null;
  }
  return {
    id: tournament.id,
    name: tournament.name,
    country: tournament.country,
    season: tournament.season ?? null,
    logo_url: tournament.logo_url ?? null,
  };
};

// Builds a team payload for API responses.
export const toTeam = (store: DemoStore, teamId: number) => {
  const team = store.teams.find((item) => item.id === teamId);
  if (!team) {
    return null;
  }
  return {
    id: team.id,
    name: team.name,
    country: team.country,
    city: team.city ?? null,
    stadium: team.stadium ?? null,
    logo_url: team.logo_url ?? null,
  };
};

// Computes average rating and count for a match.
const getMatchAverages = (store: DemoStore, matchId: number) => {
  const ratings = store.ratings.filter((rating) => rating.matchId === matchId);
  const ratingCount = ratings.length;
  const weights: Record<string, number> = {
    LT_30: 0.25,
    ONE_HALF: 0.5,
    ALMOST_ALL: 0.75,
    FULL: 1,
  };
  let weightedSum = 0;
  let weightTotal = 0;
  ratings.forEach((rating) => {
    const weight = weights[rating.minutes_watched] ?? 1;
    weightedSum += rating.score * weight;
    weightTotal += weight;
  });
  const avgScore = weightTotal ? roundToTwo(weightedSum / weightTotal) : 0;
  return { avgScore, ratingCount };
};

// Builds a match payload with nested team and tournament data.
export const toMatch = (
  store: DemoStore,
  match: DemoMatch,
  userId?: number,
) => {
  const stats = getMatchAverages(store, match.id);
  const base = {
    id: match.id,
    tournament: toTournament(store, match.tournamentId),
    home_team: toTeam(store, match.homeTeamId),
    away_team: toTeam(store, match.awayTeamId),
    date_time: match.date_time,
    home_score: match.home_score,
    away_score: match.away_score,
    avg_score: stats.avgScore,
    rating_count: stats.ratingCount,
  };

  if (!userId) {
    return base;
  }

  const myRating = store.ratings.find(
    (rating) => rating.userId === userId && rating.matchId === match.id,
  );

  return {
    ...base,
    my_rating: myRating ? toRating(store, myRating) : null,
  };
};

// Builds a match payload for search results.
export const toSearchMatch = (
  store: DemoStore,
  match: DemoMatch,
  userId?: number,
) => {
  const stats = getMatchAverages(store, match.id);
  const myRating = userId
    ? store.ratings.find(
        (rating) => rating.userId === userId && rating.matchId === match.id,
      )
    : null;
  const kickoff = new Date(match.date_time);
  const status = kickoff.getTime() >= Date.now() ? 'upcoming' : 'finished';

  return {
    id: match.id,
    kickoff_at: match.date_time,
    league: toTournament(store, match.tournamentId),
    home: toTeam(store, match.homeTeamId),
    away: toTeam(store, match.awayTeamId),
    status,
    score: {
      home: match.home_score,
      away: match.away_score,
    },
    avg_rating: stats.avgScore,
    my_rating: myRating ? myRating.score : null,
  };
};

// Builds a rating payload with nested user data.
export const toRating = (store: DemoStore, rating: DemoRating) => {
  const user = store.users.find((item) => item.id === rating.userId);
  return {
    id: rating.id,
    user: user ? toUserMini(user) : null,
    score: rating.score,
    minutes_watched: rating.minutes_watched,
    review: rating.review,
    attended: rating.attended,
    stadium_photo_url: rating.stadium_photo_url ?? '',
    representative_photo_url: rating.representative_photo_url ?? '',
    featured_note: rating.featured_note ?? '',
    featured_order: rating.featured_order ?? null,
    featured_primary_image: rating.featured_primary_image ?? 'representative',
    created_at: rating.created_at,
  };
};

// Builds a rating payload with nested match data.
export const toRatingWithMatch = (store: DemoStore, rating: DemoRating) => {
  const match = getMatchById(store, rating.matchId);
  return {
    ...toRating(store, rating),
    match: match ? toMatch(store, match) : null,
  };
};

// Finds a match by id in the demo store.
export const getMatchById = (store: DemoStore, matchId: number) => {
  return store.matches.find((match) => match.id === matchId);
};

// Computes avg score, rating count, and full watched percent for a match.
export const getMatchStats = (store: DemoStore, matchId: number) => {
  const ratings = store.ratings.filter((rating) => rating.matchId === matchId);
  const ratingCount = ratings.length;
  const weights: Record<string, number> = {
    LT_30: 0.25,
    ONE_HALF: 0.5,
    ALMOST_ALL: 0.75,
    FULL: 1,
  };
  let weightedSum = 0;
  let weightTotal = 0;
  ratings.forEach((rating) => {
    const weight = weights[rating.minutes_watched] ?? 1;
    weightedSum += rating.score * weight;
    weightTotal += weight;
  });
  const avgScore = weightTotal ? roundToTwo(weightedSum / weightTotal) : 0;
  const fullCount = ratings.filter(
    (rating) => rating.minutes_watched === 'FULL',
  ).length;
  const fullWatchedPct = ratingCount
    ? roundToTwo((fullCount / ratingCount) * 100)
    : 0;
  return {
    avgScore,
    ratingCount,
    fullWatchedPct,
    ratings,
  };
};

// Rounds a number to two decimals.
export const roundToTwo = (value: number) => {
  return Math.round(value * 100) / 100;
};

// Resolves a range start date based on a range key.
export const getRangeStart = (rangeKey: string | null) => {
  if (!rangeKey) {
    return null;
  }
  const now = new Date();
  const copy = new Date(now);
  if (rangeKey === 'week') {
    copy.setDate(copy.getDate() - 7);
    return copy;
  }
  if (rangeKey === 'month') {
    copy.setDate(copy.getDate() - 30);
    return copy;
  }
  if (rangeKey === 'year') {
    copy.setDate(copy.getDate() - 365);
    return copy;
  }
  return null;
};

// Filters ratings by created_at using a start date.
export const filterRatingsByRange = (
  ratings: DemoRating[],
  rangeStart: Date | null,
) => {
  if (!rangeStart) {
    return ratings;
  }
  return ratings.filter(
    (rating) => new Date(rating.created_at).getTime() >= rangeStart.getTime(),
  );
};

// Builds team distribution data for profile stats.
export const buildTeamDistribution = (
  store: DemoStore,
  ratings: DemoRating[],
  maxTeams: number,
): TeamDistributionItem[] => {
  const teamCounts = new Map<number, number>();
  ratings.forEach((rating) => {
    const match = store.matches.find((item) => item.id === rating.matchId);
    if (!match) {
      return;
    }
    teamCounts.set(
      match.homeTeamId,
      (teamCounts.get(match.homeTeamId) ?? 0) + 1,
    );
    teamCounts.set(
      match.awayTeamId,
      (teamCounts.get(match.awayTeamId) ?? 0) + 1,
    );
  });

  const entries = Array.from(teamCounts.entries()).sort((a, b) => b[1] - a[1]);
  const totalMentions = entries.reduce((sum, [, count]) => sum + count, 0);
  const topEntries = entries.slice(0, maxTeams);
  const othersCount = entries.slice(maxTeams).reduce((sum, [, count]) => sum + count, 0);

  const distribution = topEntries.map(([teamId, count]) => {
    const team = store.teams.find((item) => item.id === teamId) ?? null;
    return {
      label: team ? team.name : 'Unknown',
      team,
      count,
      pct: totalMentions ? roundToTwo((count / totalMentions) * 100) : 0,
    };
  });

  if (othersCount) {
    distribution.push({
      label: 'Others',
      team: null,
      count: othersCount,
      pct: totalMentions ? roundToTwo((othersCount / totalMentions) * 100) : 0,
    });
  }

  return distribution;
};

// Builds league ranking data for profile stats.
export const buildLeagueRanking = (
  store: DemoStore,
  ratings: DemoRating[],
): LeagueRankingItem[] => {
  const leagueCounts = new Map<number, number>();
  ratings.forEach((rating) => {
    const match = store.matches.find((item) => item.id === rating.matchId);
    if (!match) {
      return;
    }
    leagueCounts.set(
      match.tournamentId,
      (leagueCounts.get(match.tournamentId) ?? 0) + 1,
    );
  });

  const entries = Array.from(leagueCounts.entries()).sort((a, b) => b[1] - a[1]);
  const totalMentions = entries.reduce((sum, [, count]) => sum + count, 0);

  return entries.slice(0, 5).reduce<LeagueRankingItem[]>((acc, [id, count]) => {
    const tournament = store.tournaments.find((item) => item.id === id);
    if (!tournament) {
      return acc;
    }
    acc.push({
      tournament,
      count,
      pct: totalMentions ? roundToTwo((count / totalMentions) * 100) : 0,
    });
    return acc;
  }, []);
};
