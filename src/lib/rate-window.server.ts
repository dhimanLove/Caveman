/**
 * Sliding-window rate-limit core, shared by the Firestore (durable) and
 * in-memory (fallback) backends so both enforce identical semantics.
 *
 * A user has `max` requests inside any `windowMs` rolling window. A request is
 * allowed iff fewer than `max` timestamps are currently inside the window.
 * When denied, `resetAt` is the moment the oldest request ages out of the
 * window — exactly when a new request becomes possible again.
 */

export interface WindowResult {
  allowed: boolean;
  remaining: number;
  /** Epoch ms when a new request becomes possible; 0 while allowed. */
  resetAt: number;
  timestamps: number[];
}

/** The oldest writable timestamp inside the window. Never grows unbounded. */
export const MAX_TRACKED = 256;

/**
 * Consuming pass: prunes expired timestamps, appends `now` when allowed.
 * Used inside a Firestore transaction / memory write.
 */
export function advanceWindow(
  timestamps: unknown,
  now: number,
  max: number,
  windowMs: number,
): WindowResult {
  const current = asTimestamps(timestamps);
  const kept = current.filter((t) => now - t < windowMs);

  if (kept.length >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: kept[0] + windowMs,
      timestamps: kept.slice(-MAX_TRACKED),
    };
  }

  const next = [...kept, now].slice(-MAX_TRACKED);
  return { allowed: true, remaining: Math.max(0, max - next.length), resetAt: 0, timestamps: next };
}

/**
 * Read-only pass: prunes expired timestamps and reports state WITHOUT
 * consuming a slot. Used by the usage endpoint / post-generation reporting.
 */
export function windowState(
  timestamps: unknown,
  now: number,
  max: number,
  windowMs: number,
): { count: number; remaining: number; cooldownEnd: number; windowStart: number } {
  const current = asTimestamps(timestamps);
  const kept = current.filter((t) => now - t < windowMs);
  const count = kept.length;
  const oldest = kept.length > 0 ? kept[0] : 0;

  if (count >= max) {
    return { count, remaining: 0, cooldownEnd: oldest + windowMs, windowStart: oldest };
  }
  return { count, remaining: max - count, cooldownEnd: 0, windowStart: oldest };
}

/** Removes the most recent request — used to refund failed generations. */
export function refundWindow(timestamps: unknown): number[] {
  const current = asTimestamps(timestamps);
  return current.slice(0, -1);
}

function asTimestamps(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is number => typeof t === "number" && Number.isFinite(t));
}
