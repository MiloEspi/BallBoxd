// Shared API types for matches, ratings, feed, and profile responses.
export type UserMini = {
  id: number;
  username: string;
};

export type FeaturedPrimaryImage = 'representative' | 'stadium';

export type Team = {
  id: number;
  name: string;
  country: string;
  is_following?: boolean;
  city?: string | null;
  stadium?: string | null;
  logo_url?: string | null;
};

export type TeamSummary = {
  id: number;
  name: string;
  country?: string;
  logo_url?: string | null;
};

export type Tournament = {
  id: number;
  name: string;
  country: string;
  season?: string | null;
  code?: string | null;
  logo_url?: string | null;
};

export type Rating = {
  id: number;
  user: UserMini;
  score: number;
  minutes_watched: string;
  review: string;
  attended?: boolean;
  stadium_photo_url?: string | null;
  representative_photo_url?: string | null;
  featured_note?: string;
  featured_order?: number | null;
  featured_primary_image?: FeaturedPrimaryImage;
  created_at: string;
};

export type RatingWithMatch = Rating & {
  match: Match;
};

export type Match = {
  id: number;
  tournament: Tournament;
  home_team: Team;
  away_team: Team;
  date_time: string;
  status?: string | null;
  venue?: string | null;
  home_score: number;
  away_score: number;
  avg_score?: number;
  rating_count?: number;
  my_rating?: Rating | null;
};

export type League = {
  id: number;
  name: string;
  country: string;
  season?: string | null;
  logo_url?: string | null;
};

export type MatchResult = {
  id: number;
  kickoff_at: string;
  league: League;
  home: TeamSummary;
  away: TeamSummary;
  status: string;
  score: {
    home: number | null;
    away: number | null;
  };
  avg_rating: number;
  my_rating: number | null;
};

export type SearchResults = {
  teams: Team[];
  leagues: League[];
  matches: MatchResult[];
};

export type SearchResponse = {
  q: string;
  page: number;
  page_size: number;
  total: number;
  results: SearchResults;
};

export type TeamMatchesResponse = {
  page: number;
  page_size: number;
  total: number;
  results: MatchResult[];
};

export type FeedResponse = {
  count: number;
  results: Match[];
};

export type TeamsResponse = {
  count: number;
  results: Team[];
};

export type MatchDetailResponse = {
  match: Match;
  avg_score: number;
  rating_count: number;
  full_watched_pct: number;
  featured_reviews: Rating[];
  followed_ratings: Rating[];
  my_rating: Rating | null;
};

export type ProfileStats = {
  total_ratings: number;
  avg_score: number;
  teams_followed: number;
  followers: number;
  following: number;
  fully_watched_pct: number;
};

export type TeamDistributionItem = {
  label: string;
  team: Team | null;
  count: number;
  pct: number;
};

export type LeagueRankingItem = {
  tournament: Tournament;
  count: number;
  pct: number;
};

export type ProfileResponse = {
  user: UserMini;
  stats: ProfileStats;
  recent_activity: RatingWithMatch[];
};

export type ProfileStatsResponse = {
  user: UserMini;
  range: string;
  stats: ProfileStats;
  team_distribution: TeamDistributionItem[];
  league_top: LeagueRankingItem[];
};

export type ProfileActivityResponse = {
  user: UserMini;
  range: string;
  results: RatingWithMatch[];
};

export type ProfileHighlightsResponse = {
  user: UserMini;
  range: string;
  top_rated: RatingWithMatch[];
  low_rated: RatingWithMatch[];
};

export type ProfileMemoriesResponse = {
  user: UserMini;
  max_count: number;
  results: RatingWithMatch[];
};

export type ProfileRatedResponse = {
  user: UserMini;
  results: RatingWithMatch[];
};
