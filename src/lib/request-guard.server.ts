import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { pseudonymize } from "./firebase-verify.server";

/**
 * Per-request guards for server functions:
 *  - client IP extraction (proxy-aware)
 *  - same-origin enforcement
 *  - secondary per-IP limits (defense against mass fake-account abuse;
 *    the primary UID quota is enforced by firestore-rate-limit.server.ts)
 */

export function getClientIp(): string {
  try {
    const ip = getRequestIP({ xForwardedFor: true });
    if (ip) return ip.split(",")[0].trim();
  } catch {
    /* fall through */
  }
  const fwd = getRequestHeader("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return getRequestHeader("cf-connecting-ip") || "unknown";
}

function normalizeHost(h: string | undefined): string {
  return (h || "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Allows requests whose Origin matches the serving Host (same-origin).
 * Non-browser clients / same-origin GETs may omit Origin entirely.
 */
export function isSameOrigin(): boolean {
  const origin = getRequestHeader("origin");
  if (!origin) return true;

  const host = normalizeHost(getRequestHeader("x-forwarded-host") || getRequestHeader("host"));
  let originHost = "";
  try {
    originHost = normalizeHost(new URL(origin).host);
  } catch {
    return false;
  }
  return !host || originHost === host || ALLOWED_EXTRA.includes(originHost);
}

const ALLOWED_EXTRA = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

interface IpWindow {
  dayStart: number;
  dayCount: number;
  hourStart: number;
  hourCount: number;
}
const ipStore = new Map<string, IpWindow>();

const LIMITS: Record<string, { perDay: number; perHour: number }> = {
  generate: { perDay: 25, perHour: 8 },
  graph: { perDay: 60, perHour: 30 },
};

/** Fixed-window per-IP counter. Secondary layer only (per-instance). */
export function checkIpLimit(ip: string, scope: keyof typeof LIMITS): boolean {
  const limit = LIMITS[scope];
  const now = Date.now();
  const key = `${scope}:${pseudonymize(ip)}`;

  let w = ipStore.get(key);
  if (!w) {
    w = { dayStart: now, hourStart: now, dayCount: 0, hourCount: 0 };
    ipStore.set(key, w);
  }
  if (now - w.dayStart >= 24 * 60 * 60 * 1000) {
    w.dayStart = now;
    w.dayCount = 0;
  }
  if (now - w.hourStart >= 60 * 60 * 1000) {
    w.hourStart = now;
    w.hourCount = 0;
  }

  if (w.dayCount >= limit.perDay || w.hourCount >= limit.perHour) {
    console.warn(
      JSON.stringify({ type: "ip_limit_denied", scope, ipHash: key, ts: new Date().toISOString() }),
    );
    return false;
  }

  w.dayCount += 1;
  w.hourCount += 1;
  return true;
}
