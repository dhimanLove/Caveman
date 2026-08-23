import {
  checkRateLimit as memoryCheck,
  decrementCount as memoryDecrement,
  getUsage as memoryGetUsage,
} from "./rate-limit.server";
import { pseudonymize } from "./firebase-verify.server";
import type { App } from "firebase-admin/app";

/**
 * Durable rate limiting.
 *
 * Primary store: Firestore transaction on usage/{uid} - atomic read-modify-write,
 * shared across all server instances, survives restarts and cold starts. The
 * same document is what the client's usage panel reads, so UI stays in sync.
 *
 * Fallback: per-instance in-memory limiter when Firebase Admin credentials are
 * not configured (logs a warning - resets on restart, not shared across pods).
 *
 * Configure via env:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  - full service-account JSON (recommended)
 *   or GOOGLE_APPLICATION_CREDENTIALS / platform workload identity
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 10 * 60 * 60 * 1000;
const MAX_COUNT = 10;
const APP_NAME = "caveman-rate-limit";

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  cooldownEnd: number;
}

interface UsageDoc {
  count: number;
  windowStart: number;
  cooldownEnd: number;
  lastGen: number;
}

// undefined = init not attempted yet, null = unavailable (use memory fallback)
let dbPromise: Promise<import("firebase-admin/firestore").Firestore | null> | undefined;

async function getDb(): Promise<import("firebase-admin/firestore").Firestore | null> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        // firebase-admin ships CJS; dynamic import may wrap it under `default`
        const appMod: any = await import("firebase-admin/app");
        const app = appMod.default ?? appMod;

        const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
          ? app.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
          : app.applicationDefault();

        const existingApp: App | undefined = app
          .getApps()
          .find((a: App) => a.name === APP_NAME);
        const firebaseApp =
          existingApp ?? app.initializeApp({ credential }, APP_NAME);

        const fsMod: any = await import("firebase-admin/firestore");
        const fs = fsMod.default ?? fsMod;

        console.log("[rate-limit] Durable Firestore quota store active");
        return fs.getFirestore(firebaseApp) as import("firebase-admin/firestore").Firestore;
      } catch (err) {
        console.warn(
          "[rate-limit] Firestore unavailable, falling back to in-memory quota. " +
            "Set FIREBASE_SERVICE_ACCOUNT_JSON for durable cross-instance limits.",
          err instanceof Error ? err.message : err,
        );
        return null;
      }
    })();
  }
  return dbPromise;
}

/** Computes next quota state given current doc + server clock. Pure logic. */
function advance(
  record: UsageDoc | undefined,
  now: number,
): { record: UsageDoc; result: QuotaResult } {
  let r: UsageDoc =
    record && typeof record.count === "number" && typeof record.windowStart === "number"
      ? record
      : { count: 0, windowStart: now, cooldownEnd: 0, lastGen: 0 };

  // Window expired (or clock skew) -> fresh start
  if (now - r.windowStart >= WINDOW_MS || r.windowStart > now) {
    r = { count: 0, windowStart: now, cooldownEnd: 0, lastGen: r.lastGen };
  }

  // Active cooldown
  if (r.cooldownEnd > now) {
    return { record: r, result: { allowed: false, remaining: 0, cooldownEnd: r.cooldownEnd } };
  }

  // Cap reached -> start cooldown
  if (r.count >= MAX_COUNT) {
    r.cooldownEnd = now + COOLDOWN_MS;
    return { record: r, result: { allowed: false, remaining: 0, cooldownEnd: r.cooldownEnd } };
  }

  r.count += 1;
  r.lastGen = now;
  return { record: r, result: { allowed: true, remaining: MAX_COUNT - r.count, cooldownEnd: 0 } };
}

export function logDenial(uid: string, durable: boolean): void {
  // Structured abuse signal for monitoring/alerting. UID pseudonymized.
  console.warn(
    JSON.stringify({
      type: "rate_limit_denied",
      store: durable ? "firestore" : "memory",
      uidHash: pseudonymize(uid),
      ts: new Date().toISOString(),
    }),
  );
}

export async function consumeQuota(uid: string): Promise<QuotaResult> {
  const db = await getDb();

  if (!db) {
    const res = memoryCheck(uid);
    if (!res.allowed) logDenial(uid, false);
    return res;
  }

  const ref = db.collection("usage").doc(uid);

  try {
    const result = (await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const current = snap.exists ? (snap.data() as UsageDoc) : undefined;
      const { record, result } = advance(current, now);
      tx.set(ref, record);
      return result;
    })) as QuotaResult;

    if (!result.allowed) logDenial(uid, true);
    return result;
  } catch (err) {
    console.error(
      "[rate-limit] Transaction failed, using memory fallback:",
      err instanceof Error ? err.message : err,
    );
    const res = memoryCheck(uid);
    if (!res.allowed) logDenial(uid, false);
    return res;
  }
}

export async function refundQuota(uid: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    memoryDecrement(uid);
    return;
  }

  const ref = db.collection("usage").doc(uid);

  try {
    await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const d = snap.data() as UsageDoc;
      if (d.count > 0) d.count -= 1;
      tx.set(ref, d);
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
  if (!db) return memoryGetUsage(uid);

  const ref = db.collection("usage").doc(uid);

  try {
    const snap = await ref.get();
    const now = Date.now();
    if (!snap.exists) {
      return { count: 0, remaining: MAX_COUNT, windowStart: 0, cooldownEnd: 0 };
    }
    const d = snap.data() as UsageDoc;
    if (d.cooldownEnd > now) {
      return { count: d.count, remaining: 0, windowStart: d.windowStart, cooldownEnd: d.cooldownEnd };
    }
    if (now - d.windowStart >= WINDOW_MS) {
      return { count: 0, remaining: MAX_COUNT, windowStart: 0, cooldownEnd: 0 };
    }
    return {
      count: d.count,
      remaining: Math.max(0, MAX_COUNT - d.count),
      windowStart: d.windowStart,
      cooldownEnd: 0,
    };
  } catch {
    return memoryGetUsage(uid);
  }
}
