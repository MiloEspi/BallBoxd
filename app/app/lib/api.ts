// API helper: typed fetch wrapper with token auth, error handling, and core endpoints.
import type {
  FeedResponse,
  MatchDetailResponse,
  ProfileResponse,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

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

  const res = await fetch(`${API_BASE_URL}${path}`, {
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

  return (await res.json()) as T;
}

// Helper for authenticated requests (token header).
export function authRequest<T>(path: string, options: RequestInit) {
  return request<T>(path, options, true);
}

// Token login endpoint.
export function login(username: string, password: string) {
  return request<LoginResponse>('/api/v1/auth/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// Register endpoint (returns token + user).
export function register(username: string, email: string, password: string) {
  return request<RegisterResponse>('/api/v1/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

// Feed endpoint for matches from followed teams.
export function fetchFeed() {
  return authRequest<FeedResponse>('/api/v1/feed/', {
    method: 'GET',
  });
}

// Match detail endpoint with stats and reviews.
export function fetchMatchDetail(matchId: number) {
  return authRequest<MatchDetailResponse>(`/api/v1/matches/${matchId}/`, {
    method: 'GET',
  });
}

// Profile endpoint for a username.
export function fetchProfile(username: string) {
  return authRequest<ProfileResponse>(`/api/v1/profile/${username}/`, {
    method: 'GET',
  });
}

type RatePayload = {
  score: number;
  minutes_watched: string;
  review: string;
};

// Create or update a rating for a match.
export function rateMatch(
  matchId: number,
  payload: RatePayload,
  method: 'POST' | 'PATCH',
) {
  return authRequest(`/api/v1/matches/${matchId}/rate/`, {
    method,
    body: JSON.stringify(payload),
  });
}
