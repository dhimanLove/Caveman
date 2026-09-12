import { getUserDailyLimit, USER_RATE_WINDOW_MS } from "./rate-config.server";
import { advanceWindow, windowState, refundWindow } from "./rate-window.server";

/**
 * Per-instance in-memory fallback limiter. Exact same sliding-window semantics
 * as the Firestore backend (see rate-window.server.ts); used only when Firebase
 * Admin credentials are not configured. Resets on restart, not shared across pods.
 */

const store = new Map<string, number[]>();

function maxCount(): number {
  return getUserDailyLimit();
}

export function checkRateLimit(uid: string): {
  allowed: boolean;
  remaining: number;
  cooldownEnd: number;
} {
  const now = Date.now();
  const current = store.get(uid);
  const result = advanceWindow(current, now, maxCount(), USER_RATE_WINDOW_MS);
  store.set(uid, result.timestamps);
  return { allowed: result.allowed, remaining: result.remaining, cooldownEnd: result.resetAt };
}

export function decrementCount(uid: string): void {
  const current = store.get(uid);
  if (!current) return;
  const next = refundWindow(current);
  if (next.length > 0) store.set(uid, next);
  else store.delete(uid);
}

export function getUsage(uid: string): {
  count: number;
  remaining: number;
  windowStart: number;
  cooldownEnd: number;
} {
  const state = windowState(store.get(uid), Date.now(), maxCount(), USER_RATE_WINDOW_MS);
  return state;
}
