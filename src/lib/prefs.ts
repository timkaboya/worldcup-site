import type { UserPrefs } from './types';

const KEY = 'wc2026:prefs';

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Short, human label for a timezone (e.g. "Africa/Nairobi" -> "Nairobi"). */
export function tzShortLabel(tz: string): string {
  const seg = tz.split('/').pop() || tz;
  return seg.replace(/_/g, ' ');
}

const DEFAULTS = (): UserPrefs => ({ timezone: detectTimezone(), favorites: [] });

export function loadPrefs(): UserPrefs {
  if (typeof localStorage === 'undefined') return DEFAULTS();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const parsed = JSON.parse(raw) as Partial<UserPrefs>;
    return {
      timezone: parsed.timezone || detectTimezone(),
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      ...(parsed.lastSeenNewsUtc ? { lastSeenNewsUtc: parsed.lastSeenNewsUtc } : {}),
    };
  } catch {
    return DEFAULTS();
  }
}

export function savePrefs(prefs: UserPrefs): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function setTimezone(tz: string): UserPrefs {
  const p = loadPrefs();
  p.timezone = tz;
  savePrefs(p);
  return p;
}

export function toggleFavorite(teamId: string): UserPrefs {
  const p = loadPrefs();
  const i = p.favorites.indexOf(teamId);
  if (i >= 0) p.favorites.splice(i, 1);
  else p.favorites.push(teamId);
  savePrefs(p);
  return p;
}
