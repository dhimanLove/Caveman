import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { pseudonymize } from "./firebase-verify.server";

/**
 * Per-request guards for server functions:
 *  - client IP extraction (proxy-aware only when explicitly enabled)
 *  - same-origin enforcement
 *  - secondary per-IP limits (defense against mass fake-account abuse;
 *    the primary UID quota is enforced by firestore-rate-limit.server.ts)
 */

export function getClientIp(): string {
  const trustProxyHeaders = shouldTrustProxyHeaders();
  try {
    const ip = trustProxyHeaders ? getRequestIP({ xForwardedFor: true }) : getRequestIP();
    if (ip) return ip.split(",")[0].trim();
  } catch {
    /* fall through */
  }
  if (trustProxyHeaders) {
    const fwd = getRequestHeader("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return getRequestHeader("cf-connecting-ip") || "unknown";
  }
  return "unknown";
}

function normalizeHost(h: string | undefined): string {
  return (h || "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.startsWith("127.") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  );
}

/**
 * Allows requests whose Origin matches the serving Host (same-origin).
 * Enforces HTTPS for non-local traffic in production (Vercel/Hosting terminate
 * TLS; plain http is dropped). Non-browser clients / same-origin GETs may omit
 * Origin entirely.
 */
export function isSameOrigin(): boolean {
  const origin = getRequestHeader("origin");
  const trustProxyHeaders = shouldTrustProxyHeaders();
  const allowedExtraOrigins = getAllowedExtraOrigins();
  const host = normalizeHost(
    (trustProxyHeaders ? getRequestHeader("x-forwarded-host") : undefined) ||
      getRequestHeader("host"),
  );
  const isLocal = isLocalHost(host);

  // TLS enforcement (production only): reject non-HTTPS unless localhost.
  if (!isLocal && process.env.NODE_ENV === "production") {
    if (trustProxyHeaders) {
      const proto = (getRequestHeader("x-forwarded-proto") || "")
        .split(",")[0]
        .trim()
        .toLowerCase();
      if (proto !== "https") return false;
    }
  }

  if (!origin) return true;

  let originHost = "";
  let secure = false;
  try {
    const u = new URL(origin);
    originHost = normalizeHost(u.host);
    secure = u.protocol === "https:";
  } catch {
    return false;
  }

  // Non-local browser origins must arrive over HTTPS.
  if (!isLocal && !secure && !allowedExtraOrigins.includes(originHost)) return false;

  return !host || originHost === host || allowedExtraOrigins.includes(originHost);
}

function shouldTrustProxyHeaders(): boolean {
  // Cloudflare exposes bindings only during the request lifecycle. Do not
  // capture this value at module initialization.
  return process.env.TRUST_PROXY_HEADERS === "true";
}

function getAllowedExtraOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

interface IpWindow {
  dayStart: number;
  dayCount: number;
  hourStart: number;
  hourCount: number;
}
const ipStore = new Map<string, IpWindow>();

const LIMITS: Record<string, { perDay: number; perHour: number }> = {
  generate: { perDay: 25, perHour: 12 },
  graph: { perDay: 60, perHour: 30 },
};

/** Whether an IP is usable for per-IP limiting. Unknown/missing IPs must NOT
 *  share one global bucket - that would lock out every user behind a proxy or
 *  serverless host that doesn't forward client IPs. The UID quota remains the
 *  real gate; per-IP is just defense-in-depth. */
function isUsableIp(ip: string): boolean {
  return !!ip && ip.trim() !== "" && ip !== "unknown" && ip !== "::1" && !ip.startsWith("127.");
}

export interface IpLimitResult {
  allowed: boolean;
  /** Epoch ms when the per-IP allowance resets; 0 when not limited. */
  cooldownEnd: number;
}

/** Fixed-window per-IP counter. Secondary layer only (per-instance). */
export function checkIpLimit(ip: string, scope: keyof typeof LIMITS): IpLimitResult {
  if (!isUsableIp(ip)) return { allowed: true, cooldownEnd: 0 };

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

  if (w.dayCount >= limit.perDay) {
    console.warn(
      JSON.stringify({ type: "ip_limit_denied", scope, ipHash: key, ts: new Date().toISOString() }),
    );
    return { allowed: false, cooldownEnd: w.dayStart + 24 * 60 * 60 * 1000 };
  }
  if (w.hourCount >= limit.perHour) {
    console.warn(
      JSON.stringify({ type: "ip_limit_denied", scope, ipHash: key, ts: new Date().toISOString() }),
    );
    return { allowed: false, cooldownEnd: w.hourStart + 60 * 60 * 1000 };
  }

  w.dayCount += 1;
  w.hourCount += 1;
  return { allowed: true, cooldownEnd: 0 };
}

/** Reverses one checkIpLimit() increment when the generation itself failed.
 *  Prevents failed attempts (AI rate limits, timeouts, invalid input) from
 *  permanently eating the per-IP allowance and locking out real users. */
export function refundIpLimit(ip: string, scope: keyof typeof LIMITS): void {
  if (!isUsableIp(ip)) return;
  const key = `${scope}:${pseudonymize(ip)}`;
  const w = ipStore.get(key);
  if (!w) return;
  if (w.dayCount > 0) w.dayCount -= 1;
  if (w.hourCount > 0) w.hourCount -= 1;
}

// ---------------------------------------------------------------------------
// AUTH BRUTE-FORCE SHIELD - separate from the generation quota. Bounds how many
// FAILED token-verification attempts an IP may make before being blocked for
// the hour. Successful verifications reset the counter.
// ---------------------------------------------------------------------------

const AUTH_MAX_FAILURES = 30;
const AUTH_WINDOW_MS = 60 * 60 * 1000;

interface AuthFailure {
  count: number;
  windowStart: number;
}
const authFails = new Map<string, AuthFailure>();

export interface AuthGateResult {
  blocked: boolean;
  /** Epoch ms when the block lifts; 0 while allowed. */
  retryAfter: number;
}

function authKey(ip: string): string {
  return `auth:${pseudonymize(ip)}`;
}

function logAuthAbuse(key: string, reason: string, retryAfter: number): void {
  console.warn(
    JSON.stringify({
      type: "auth_bruteforce_blocked",
      action: "auth",
      ipHash: key,
      retryAfter,
      ts: new Date().toISOString(),
    }),
  );
}

export function checkAuthBruteForce(ip: string): AuthGateResult {
  if (!isUsableIp(ip)) return { blocked: false, retryAfter: 0 };
  const key = authKey(ip);
  const entry = authFails.get(key);
  if (!entry) return { blocked: false, retryAfter: 0 };

  const now = Date.now();
  if (now - entry.windowStart >= AUTH_WINDOW_MS) {
    authFails.delete(key);
    return { blocked: false, retryAfter: 0 };
  }
  if (entry.count >= AUTH_MAX_FAILURES) {
    const retryAfter = entry.windowStart + AUTH_WINDOW_MS;
    logAuthAbuse(key, "failure_cap", retryAfter);
    return { blocked: true, retryAfter };
  }
  return { blocked: false, retryAfter: 0 };
}

export function recordAuthFailure(ip: string): void {
  if (!isUsableIp(ip)) return;
  const key = authKey(ip);
  const now = Date.now();
  const entry = authFails.get(key);
  if (!entry || now - entry.windowStart >= AUTH_WINDOW_MS) {
    authFails.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

export function clearAuthFailures(ip: string): void {
  if (!isUsableIp(ip)) return;
  authFails.delete(authKey(ip));
}
