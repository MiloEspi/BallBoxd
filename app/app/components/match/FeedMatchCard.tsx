'use client';

import MatchCardCompact from '@/app/components/match/MatchCardCompact';
import type { Match } from '@/app/lib/types';

type FeedMatchCardProps = {
  match: Match;
};

export default function FeedMatchCard({ match }: FeedMatchCardProps) {
  return <MatchCardCompact match={match} />;
}
