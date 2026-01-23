import { NextResponse } from 'next/server';

import {
  getAuthUser,
  getDemoStore,
  toTeam,
  toUserMini,
  unauthorized,
} from '../../_demo';

type DemoStore = ReturnType<typeof getDemoStore>;
type DemoMatch = {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  date_time: string;
};

const getMatchTitle = (store: DemoStore, match: DemoMatch) => {
  const home = store.teams.find((team) => team.id === match.homeTeamId);
  const away = store.teams.find((team) => team.id === match.awayTeamId);
  return `${home?.name ?? 'Home'} vs ${away?.name ?? 'Away'}`;
};

// Returns friend activity feed for demo mode.
export async function GET(request: Request) {
  const store = getDemoStore();
  const user = getAuthUser(request);
  if (!user) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get('page') ?? 1) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get('page_size') ?? 20) || 20, 1),
    50,
  );

  const followingIds = new Set(
    store.userFollows
      .filter((follow) => follow.followerId === user.id)
      .map((follow) => follow.followingId),
  );

  const ratings = store.ratings
    .filter((rating) => followingIds.has(rating.userId))
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );

  const start = (page - 1) * pageSize;
  const pageItems = ratings.slice(start, start + pageSize);

  const results = pageItems
    .map((rating) => {
      const match = store.matches.find((item) => item.id === rating.matchId);
      const actorUser = store.users.find((item) => item.id === rating.userId);
      if (!match || !actorUser) {
        return null;
      }
      const home = toTeam(store, match.homeTeamId);
      const away = toTeam(store, match.awayTeamId);
      return {
        actor: toUserMini(actorUser),
        match: {
          id: match.id,
          title: getMatchTitle(store, match),
          date_time: match.date_time,
          home_team: home,
          away_team: away,
        },
        rating_score: rating.score,
        review_snippet: rating.review.slice(0, 140),
        created_at: rating.created_at,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return NextResponse.json({
    page,
    page_size: pageSize,
    total: ratings.length,
    results,
  });
}
