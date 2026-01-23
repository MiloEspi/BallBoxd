// API helper: typed fetch wrapper with token auth, error handling, and core endpoints.
import type {
  FeedResponse,
  FeaturedPrimaryImage,
  FollowStateResponse,
  FriendsFeedResponse,
  MatchDetailResponse,
  PublicProfileRatingsResponse,
  ProfileActivityResponse,
  ProfileHighlightsResponse,
  ProfileMemoriesResponse,
  ProfileResponse,
  ProfileRatedResponse,
  ProfileStatsResponse,
  SearchResponse,
  Team,
  TeamMatchesResponse,
  TeamsResponse,
  UserMini,
} from './types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE_URL = DEMO_MODE
  ? ''
  : process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

type LoginResponse = {
  token: string;
};

type RegisterResponse = {
  token: string;
  user: {
    id: number;
    username: string;
  };
};

type MatchesQuery = {
  date?: string;
  from?: string;
  to?: string;
  tournament?: string | number;
  search?: string;
};

type SearchQuery = {
  q: string;
  types?: string[];
  league_id?: number | string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
};

type TeamMatchesQuery = {
  scope?: 'recent' | 'upcoming' | 'all';
  page?: number;
  page_size?: number;
};

type ApiErrorBody = {
  detail?: string;
  message?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  data?: ApiErrorBody;

  // Standardized API error with HTTP status and optional response payload.
  constructor(message: string, status: number, data?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Reads the auth token from localStorage on the client only.
const getAuthToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('auth_token');
};

// Builds a readable error message from a DRF-style error body.
const buildErrorMessage = (data?: ApiErrorBody) => {
  if (!data) {
    return 'Request failed';
  }
  if (data.detail) {
    return data.detail;
  }
  if (data.message) {
    return data.message;
  }
  if (data.non_field_errors?.length) {
    return data.non_field_errors.join(', ');
  }
  return JSON.stringify(data);
};

// Builds the full request URL based on demo mode and base URL.
const buildUrl = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (DEMO_MODE) {
    return `/api/v1${normalized}`;
  }
  const trimmedBase = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const [pathPart, query] = normalized.split('?');
  const withSlash = pathPart.endsWith('/') ? pathPart : `${pathPart}/`;
  const rebuilt = query ? `${withSlash}?${query}` : withSlash;
  return `${trimmedBase}${rebuilt}`;
};

// Core fetch wrapper: merges headers, adds auth when needed, parses JSON.
async function request<T>(
  path: string,
  options: RequestInit,
  withAuth: boolean = false,
): Promise<T> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (options.headers) {
    const provided = new Headers(options.headers);
    provided.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (withAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Token ${token}`);
    }
  }

  const res = await fetch(buildUrl(path), {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let data: ApiErrorBody | undefined;
    try {
      data = (await res.json()) as ApiErrorBody;
    } catch {
      data = undefined;
    }
    throw new ApiError(buildErrorMessage(data), res.status, data);
  }

  if (res.status === 204) {
    return null as T;
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null as T;
  }

  try {
    return (await res.json()) as T;
  } catch {
    return null as T;
  }
}

// Helper for authenticated requests (token header).
export function authRequest<T>(path: string, options: RequestInit) {
  return request<T>(path, options, true);
}

// Token login endpoint.
export function login(username: string, password: string) {
  return request<LoginResponse>('/auth/token', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// Register endpoint (returns token + user).
export function register(username: string, email: string, password: string) {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

// Feed endpoint for matches from followed teams.
export function fetchFeed() {
  return authRequest<FeedResponse>('/feed', {
    method: 'GET',
  });
}

// Friends activity feed endpoint.
export function fetchFriendsFeed(page: number = 1, pageSize: number = 20) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  return authRequest<FriendsFeedResponse>(`/feed/friends?${params.toString()}`, {
    method: 'GET',
  });
}

// Returns the authenticated user.
export function fetchMe() {
  return authRequest<UserMini>('/me', {
    method: 'GET',
  });
}

// Matches catalog endpoint with optional filters.
export function fetchMatches(filters: MatchesQuery = {}) {
  const params = new URLSearchParams();
  if (filters.date) {
    params.set('date', filters.date);
  }
  if (filters.from) {
    params.set('from', filters.from);
  }
  if (filters.to) {
    params.set('to', filters.to);
  }
  if (filters.tournament) {
    params.set('tournament', String(filters.tournament));
  }
  if (filters.search) {
    params.set('search', filters.search);
  }
  const query = params.toString();
  const path = query ? `/matches?${query}` : '/matches';
  return authRequest<FeedResponse>(path, {
    method: 'GET',
  });
}

// Match detail endpoint with stats and reviews.
export function fetchMatchDetail(matchId: number) {
  return authRequest<MatchDetailResponse>(`/matches/${matchId}`, {
    method: 'GET',
  });
}

// Profile endpoint for a username.
export function fetchProfile(username: string) {
  return authRequest<ProfileResponse>(`/profile/${username}`, {
    method: 'GET',
  });
}

// Public profile endpoint (stats + paginated ratings).
export function fetchPublicProfile(
  username: string,
  page: number = 1,
  pageSize: number = 10,
) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  return authRequest<PublicProfileRatingsResponse>(
    `/users/${username}/public?${params.toString()}`,
    {
      method: 'GET',
    },
  );
}

// Profile stats tab endpoint.
export function fetchProfileStats(username: string, range: string) {
  return authRequest<ProfileStatsResponse>(
    `/profile/${username}/stats?range=${encodeURIComponent(range)}`,
    {
      method: 'GET',
    },
  );
}

// Profile activity tab endpoint with optional range.
export function fetchProfileActivity(username: string, range: string) {
  return authRequest<ProfileActivityResponse>(
    `/profile/${username}/activity?range=${encodeURIComponent(range)}`,
    {
      method: 'GET',
    },
  );
}

// Profile highlights tab endpoint with optional range.
export function fetchProfileHighlights(username: string, range: string) {
  return authRequest<ProfileHighlightsResponse>(
    `/profile/${username}/highlights?range=${encodeURIComponent(range)}`,
    {
      method: 'GET',
    },
  );
}

// Profile memories (Mis partidos) endpoint.
export function fetchProfileMemories(username: string) {
  return authRequest<ProfileMemoriesResponse>(`/profile/${username}/memories`, {
    method: 'GET',
  });
}

// Profile rated matches for the selector modal.
export function fetchProfileRatedMatches(username: string, q: string = '') {
  const params = new URLSearchParams();
  if (q) {
    params.set('q', q);
  }
  const path = params.toString()
    ? `/profile/${username}/ratings?${params.toString()}`
    : `/profile/${username}/ratings`;
  return authRequest<ProfileRatedResponse>(path, {
    method: 'GET',
  });
}

// Profile followed teams list.
export function fetchProfileFollowedTeams(username: string) {
  return authRequest<TeamsResponse>(`/profile/${username}/teams`, {
    method: 'GET',
  });
}

// Teams catalog endpoint with follow status when authenticated.
export function fetchTeams() {
  return authRequest<TeamsResponse>('/teams', {
    method: 'GET',
  });
}

// Global search endpoint for teams, leagues, and matches.
export function fetchSearch(query: SearchQuery) {
  const params = new URLSearchParams();
  params.set('q', query.q);
  if (query.types?.length) {
    params.set('types', query.types.join(','));
  }
  if (query.league_id !== undefined) {
    params.set('league_id', String(query.league_id));
  }
  if (query.date_from) {
    params.set('date_from', query.date_from);
  }
  if (query.date_to) {
    params.set('date_to', query.date_to);
  }
  if (query.page) {
    params.set('page', String(query.page));
  }
  if (query.page_size) {
    params.set('page_size', String(query.page_size));
  }
  return authRequest<SearchResponse>(`/search?${params.toString()}`, {
    method: 'GET',
  });
}

// Team detail endpoint.
export function fetchTeamDetail(teamId: number) {
  return authRequest<Team>(`/teams/${teamId}`, {
    method: 'GET',
  });
}

// Team matches endpoint.
export function fetchTeamMatches(teamId: number, query: TeamMatchesQuery = {}) {
  const params = new URLSearchParams();
  if (query.scope) {
    params.set('scope', query.scope);
  }
  if (query.page) {
    params.set('page', String(query.page));
  }
  if (query.page_size) {
    params.set('page_size', String(query.page_size));
  }
  const path = params.toString()
    ? `/teams/${teamId}/matches?${params.toString()}`
    : `/teams/${teamId}/matches`;
  return authRequest<TeamMatchesResponse>(path, {
    method: 'GET',
  });
}

type RatePayload = {
  score: number;
  minutes_watched: string;
  review: string;
};

type MatchMemoryPayload = {
  attended?: boolean;
  stadium_photo_url?: string;
  representative_photo_url?: string;
  featured_note?: string;
  featured_primary_image?: FeaturedPrimaryImage;
};

// Create or update a rating for a match.
export function rateMatch(
  matchId: number,
  payload: RatePayload,
  method: 'POST' | 'PATCH',
) {
  return authRequest(`/matches/${matchId}/rate`, {
    method,
    body: JSON.stringify(payload),
  });
}

// Updates attendance/memory details for a match rating.
export function updateMatchMemory(matchId: number, payload: MatchMemoryPayload) {
  return authRequest(`/matches/${matchId}/memory`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Adds or replaces a featured match.
export function addProfileMemory(
  username: string,
  matchId: number,
  replaceMatchId?: number,
) {
  return authRequest<ProfileMemoriesResponse>(`/profile/${username}/memories`, {
    method: 'POST',
    body: JSON.stringify({
      match_id: matchId,
      replace_match_id: replaceMatchId,
    }),
  });
}

// Reorders featured matches by match id list.
export function reorderProfileMemories(username: string, order: number[]) {
  return authRequest<ProfileMemoriesResponse>(`/profile/${username}/memories`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

// Updates featured match metadata (note/image/primary image).
export function updateProfileMemory(
  username: string,
  matchId: number,
  payload: MatchMemoryPayload,
) {
  return authRequest<ProfileMemoriesResponse>(`/profile/${username}/memories`, {
    method: 'PATCH',
    body: JSON.stringify({ match_id: matchId, ...payload }),
  });
}

// Removes a featured match.
export function removeProfileMemory(username: string, matchId: number) {
  return authRequest(`/profile/${username}/memories/${matchId}`, {
    method: 'DELETE',
  });
}

// Follow/unfollow team endpoints.
export function followTeam(teamId: number) {
  return authRequest(`/teams/${teamId}/follow`, {
    method: 'POST',
  });
}

export function unfollowTeam(teamId: number) {
  return authRequest(`/teams/${teamId}/follow`, {
    method: 'DELETE',
  });
}

// Follow/unfollow user endpoints by username.
export function followUser(username: string) {
  return authRequest<FollowStateResponse>(`/users/${username}/follow`, {
    method: 'POST',
  });
}

export function unfollowUser(username: string) {
  return authRequest<FollowStateResponse>(`/users/${username}/follow`, {
    method: 'DELETE',
  });
}
