import type { Match } from './types';

const toTime = (value: string) => new Date(value).getTime();

// Sorts matches by kickoff time ascending (soonest first).
export const sortMatchesByDateAsc = (matches: Match[]) => {
  return [...matches].sort((a, b) => toTime(a.date_time) - toTime(b.date_time));
};

// Sorts matches by "closest" kickoff: upcoming first, then recent past.
export const sortMatchesByClosest = (
  matches: Match[],
  anchor: Date = new Date(),
) => {
  const anchorTime = anchor.getTime();
  const upcoming: Match[] = [];
  const past: Match[] = [];

  matches.forEach((match) => {
    if (toTime(match.date_time) >= anchorTime) {
      upcoming.push(match);
    } else {
      past.push(match);
    }
  });

  upcoming.sort((a, b) => toTime(a.date_time) - toTime(b.date_time));
  past.sort((a, b) => toTime(b.date_time) - toTime(a.date_time));

  return [...upcoming, ...past];
};
