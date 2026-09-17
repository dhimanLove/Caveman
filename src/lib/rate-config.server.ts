/**
 * Env-driven rate-limit configuration shared by all limiter backends
 * (Firestore, in-memory, per-IP, and the global daily cap).
 *
 *   USER_RATE_LIMIT     - per-user generations per rolling 15h window (default 8)
 *   USER_DAILY_LIMIT    - legacy alias for USER_RATE_LIMIT
 *   GLOBAL_DAILY_CAP    - app-wide generations per UTC day across all users (default 1000)
 *
 * Any value is re-read on each call (no caching) so changes apply without restart.
 */

/** Rolling window: 8 requests per 15 hours per user (sliding). */
export const USER_RATE_WINDOW_MS = 15 * 60 * 60 * 1000;

function clampInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export function getUserDailyLimit(): number {
  return clampInt(process.env.USER_RATE_LIMIT ?? process.env.USER_DAILY_LIMIT, 8);
}

export function getGlobalDailyCap(): number {
  return clampInt(process.env.GLOBAL_DAILY_CAP, 1000);
}

/** UTC calendar day key, e.g. "2026-08-30" - used for global cap reset. */
export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}
