export const LEAGUE_STORAGE_KEY = 'ballboxd.myLeagues';

export const readLeaguePreferences = (): number[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(LEAGUE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value) => typeof value === 'number');
    }
    return null;
  } catch {
    return null;
  }
};

export const saveLeaguePreferences = (ids: number[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(LEAGUE_STORAGE_KEY, JSON.stringify(ids));
};
