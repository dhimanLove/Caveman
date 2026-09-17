import {
  checkRateLimit as memoryCheck,
  decrementCount as memoryDecrement,
  getUsage as memoryGetUsage,
} from "./rate-limit.server";
import { pseudonymize } from "./firebase-verify.server";
import {
  getUserDailyLimit,
  getGlobalDailyCap,
  dayKey,
  USER_RATE_WINDOW_MS,
} from "./rate-config.server";
import { advanceWindow, windowState, refundWindow } from "./rate-window.server";
import { getAdminApp } from "./firebase-admin.server";

/**
 * Durable rate limiting.
 *
 * Primary store: Firestore transaction on rateLimits/{uid} - atomic
 * read-modify-write, shared across all server instances, survives restarts and
 * cold starts. The sliding-window core lives in rate-window.server.ts so the
 * durable and in-memory backends stay identical.
 *
 * Fallback: per-instance in-memory limiter when Firebase Admin credentials are
 * not configured (logs a warning - resets on restart, not shared across pods).
 *
 * Configure via env:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  - full service-account JSON (recommended)
 *   or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   or GOOGLE_APPLICATION_CREDENTIALS / platform workload identity
 */

function maxCount(): number {
  return getUserDailyLimit();
}

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  /**
   * Epoch ms when the allowance next opens (oldest request ages out of the
   * rolling window). 0 while allowed. Also surfaced as `cooldownEnd` below for
   * client compatibility.
   */
  resetAt: number;
  cooldownEnd: number;
}

interface RateDoc {
  timestamps: number[];
  lastGen: number;
}

// undefined = init not attempted yet, null = unavailable (use memory fallback)
let dbPromise: Promise<import("firebase-admin/firestore").Firestore | null> | undefined;
let warnedMemoryFallback = false;
let warnedTransactionFallback = false;

function hasDurableFirebaseConfig(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.FIREBASE_CONFIG ||
    process.env.K_SERVICE ||
    process.env.FUNCTIONS_WORKER_RUNTIME ||
    process.env.GAE_ENV,
  );
}

function requireDurableRateLimit(): boolean {
  return (
    process.env.REQUIRE_DURABLE_RATE_LIMIT === "true" ||
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1"
  );
}

function warnMemoryFallback(message: string): void {
  if (warnedMemoryFallback) return;
  warnedMemoryFallback = true;
  console.warn(`[rate-limit] ${message}`);
}

async function getDb(): Promise<import("firebase-admin/firestore").Firestore | null> {
  if (!dbPromise) {
    dbPromise = (async () => {
      if (!hasDurableFirebaseConfig()) {
        if (requireDurableRateLimit()) {
          throw new Error(
            "Durable Firestore rate limiting is not configured. Add Firebase Admin credentials.",
          );
        }
        warnMemoryFallback(
          "Durable Firestore credentials are not configured; using in-memory quota for this instance.",
        );
        return null;
      }
      try {
        const adminApp = await getAdminApp();
        const fsMod = await import("firebase-admin/firestore");
        const fs =
          (fsMod as unknown as { default?: typeof fsMod }).default ??
          (fsMod as unknown as typeof fsMod);
        return fs.getFirestore(adminApp) as import("firebase-admin/firestore").Firestore;
      } catch (err) {
        if (requireDurableRateLimit()) {
          throw new Error("Durable Firestore rate limiting is unavailable.");
        }
        warnMemoryFallback(
          "Firestore is unavailable; using in-memory quota for this instance. " +
            "Set FIREBASE_SERVICE_ACCOUNT_JSON for durable cross-instance limits.",
        );
        console.warn(
          "[rate-limit] Durable store details:",
          err instanceof Error ? err.message : err,
        );
        return null;
      }
    })();
  }
  return dbPromise;
}

export function logDenial(uid: string, durable: boolean): void {
  // Structured abuse signal for monitoring/alerting. UID pseudonymized.
  console.warn(
    JSON.stringify({
      type: "rate_limit_denied",
      action: "generate",
      store: durable ? "firestore" : "memory",
      uidHash: pseudonymize(uid),
      ts: new Date().toISOString(),
    }),
  );
}

/** One-line JSON log for each completed generation (quota-consumption monitor). */
export function logGeneration(uid: string, ok: boolean, ms: number): void {
  console.log(
    JSON.stringify({
      type: "generation",
      action: "generate",
      ok,
      uidHash: pseudonymize(uid),
      ms: Math.round(ms),
      ts: new Date().toISOString(),
    }),
  );
}

export async function consumeQuota(uid: string): Promise<QuotaResult> {
  const db = await getDb();

  if (!db) {
    const res = memoryCheck(uid);
    if (!res.allowed) logDenial(uid, false);
    return { ...res, resetAt: res.cooldownEnd || 0 };
  }

  const ref = db.collection("rateLimits").doc(uid);

  try {
    const result = (await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const current = snap.exists ? (snap.data() as RateDoc) : undefined;
      const windowed = advanceWindow(current?.timestamps, now, maxCount(), USER_RATE_WINDOW_MS);
      tx.set(ref, { timestamps: windowed.timestamps, lastGen: current?.lastGen ?? now });
      return {
        allowed: windowed.allowed,
        remaining: windowed.remaining,
        resetAt: windowed.resetAt,
        cooldownEnd: windowed.resetAt,
      } satisfies QuotaResult;
    })) as QuotaResult;

    if (!result.allowed) logDenial(uid, true);
    return result;
  } catch (err) {
    if (requireDurableRateLimit()) {
      throw new Error("Durable Firestore rate limiting is unavailable.");
    }
    if (!warnedTransactionFallback) {
      warnedTransactionFallback = true;
      console.warn(
        "[rate-limit] Firestore transaction failed; using in-memory quota for this instance:",
        err instanceof Error ? err.message : err,
      );
    }
    const res = memoryCheck(uid);
    if (!res.allowed) logDenial(uid, false);
    return { ...res, resetAt: res.cooldownEnd || 0 };
  }
}

export async function refundQuota(uid: string): Promise<void> {
  let db: import("firebase-admin/firestore").Firestore | null;
  try {
    db = await getDb();
  } catch (err) {
    // Never let a refund failure bubble up — it must not block or mask the
    // original generation result. Fall back to the in-memory decrement.
    console.warn("[rate-limit] Refund getDb failed:", err instanceof Error ? err.message : err);
    db = null;
  }
  if (!db) {
    memoryDecrement(uid);
    return;
  }

  const ref = db.collection("rateLimits").doc(uid);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const d = snap.data() as RateDoc;
      if (Array.isArray(d.timestamps) && d.timestamps.length > 0) {
        d.timestamps = refundWindow(d.timestamps);
        tx.set(ref, d);
      }
    });
  } catch (err) {
    console.warn("[rate-limit] Refund failed:", err instanceof Error ? err.message : err);
    memoryDecrement(uid);
  }
}

export async function readUsage(
  uid: string,
): Promise<{ count: number; remaining: number; windowStart: number; cooldownEnd: number }> {
  const db = await getDb();
  if (!db) {
    const fallback = memoryGetUsage(uid);
    return { ...fallback, cooldownEnd: fallback.cooldownEnd || 0 };
  }

  const ref = db.collection("rateLimits").doc(uid);

  try {
    const snap = await ref.get();
    if (!snap.exists) {
      return { count: 0, remaining: maxCount(), windowStart: 0, cooldownEnd: 0 };
    }
    const d = snap.data() as RateDoc;
    return windowState(d.timestamps, Date.now(), maxCount(), USER_RATE_WINDOW_MS);
  } catch {
    const fallback = memoryGetUsage(uid);
    return { ...fallback, cooldownEnd: fallback.cooldownEnd || 0 };
  }
}

// ---------------------------------------------------------------------------
// GLOBAL DAILY CAP - app-wide quota across all users to bound total Groq spend.
// Storage: usage/_global { day: "YYYY-MM-DD", count }. Same store/transaction
// pattern as per-UID quota, so it is shared across instances when Firestore is
// configured, and degrades to a per-instance in-memory counter otherwise.
// ---------------------------------------------------------------------------

interface GlobalDoc {
  day: string;
  count: number;
}

const _GLOBAL_UID = "_global";

// In-memory fallback (per instance) - resets on restart.
const globalMemory = new Map<string, number>();

export interface GlobalCapResult {
  allowed: boolean;
  /** UTC calendar day key that is capped. */
  day: string;
  /** Count applied for this day. */
  count: number;
  /** When the cap is next open (next UTC midnight). 0 when allowed. */
  resetAt: number;
  cap: number;
}

function nextUtcMidnight(now: number): number {
  const d = new Date(now);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
  return next.getTime();
}

function globalMemoryResult(
  allowed: boolean,
  day: string,
  count: number,
  now: number,
  cap: number,
): GlobalCapResult {
  return { allowed, day, count, cap, resetAt: allowed ? 0 : nextUtcMidnight(now) };
}

export async function consumeGlobalCap(): Promise<GlobalCapResult> {
  const cap = getGlobalDailyCap();
  const now = Date.now();
  const day = dayKey(now);

  const db = await getDb();
  if (!db) {
    const count = (globalMemory.get(day) ?? 0) + 1;
    globalMemory.set(day, count);
    console.log(
      JSON.stringify({
        type: "usage_daily",
        day,
        count,
        cap,
        store: "memory",
        ts: new Date(now).toISOString(),
      }),
    );
    return globalMemoryResult(count <= cap, day, count, now, cap);
  }

  const ref = db.collection("usage").doc(_GLOBAL_UID);
  try {
    const result = (await db.runTransaction(
      async (tx: import("firebase-admin/firestore").Transaction) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? (snap.data() as GlobalDoc) : undefined;
        const count = current && current.day === day ? current.count : 0;
        const next = count + 1;
        tx.set(ref, { day, count: next });
        console.log(
          JSON.stringify({
            type: "usage_daily",
            day,
            count: next,
            cap,
            store: "firestore",
            ts: new Date(now).toISOString(),
          }),
        );
        return globalMemoryResult(next <= cap, day, next, now, cap);
      },
    )) as GlobalCapResult;
    if (!result.allowed) {
      console.warn(
        JSON.stringify({
          type: "global_cap_denied",
          day,
          count: result.count,
          cap,
          ts: new Date(now).toISOString(),
        }),
      );
    }
    return result;
  } catch (err) {
    if (!warnedTransactionFallback) {
      warnedTransactionFallback = true;
      console.warn(
        "[rate-limit] Global cap transaction failed; using in-memory cap for this instance:",
        err instanceof Error ? err.message : err,
      );
    }
    const count = (globalMemory.get(day) ?? 0) + 1;
    globalMemory.set(day, count);
    return globalMemoryResult(count <= cap, day, count, now, cap);
  }
}
