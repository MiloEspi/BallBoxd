// Shared API types for matches, ratings, feed, and profile responses.
export type UserMini = {
  id: number;
  username: string;
};

export type Team = {
  id: number;
  name: string;
  country: string;
};

export type Tournament = {
  id: number;
  name: string;
  country: string;
};

export type Rating = {
  id: number;
  user: UserMini;
  score: number;
  minutes_watched: string;
  review: string;
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
  home_score: number;
  away_score: number;
  avg_score?: number;
  rating_count?: number;
  my_rating?: Rating | null;
};

export type FeedResponse = {
  count: number;
  results: Match[];
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
};

export type ProfileResponse = {
  user: UserMini;
  stats: ProfileStats;
  recent_activity: RatingWithMatch[];
};
