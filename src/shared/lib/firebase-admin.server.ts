import type { App } from "firebase-admin/app";

/**
 * Shared Firebase Admin app (single instance) used by:
 *  - Firestore (durable rate limiting, global cap)
 *  - App Check token verification
 *
 * Credentials:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  - full service-account JSON (recommended)
 *   or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   or GOOGLE_APPLICATION_CREDENTIALS / platform workload identity
 *
 * projectId is passed EXPLICITLY: outside GCP the client cannot auto-detect it
 * ("Unable to detect a Project Id ..."). Prefer FIREBASE_PROJECT_ID, then
 * GOOGLE_CLOUD_PROJECT, then project_id inside the service account JSON.
 */

export const FIREBASE_ADMIN_APP_NAME = "caveman-server";

let appPromise: Promise<App> | undefined;

interface ServiceAccountJson {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
}

function readServiceAccount(): ServiceAccountJson | undefined {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  const raw = encoded
    ? Buffer.from(encoded, "base64").toString("utf8")
    : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return undefined;

  const parsed = JSON.parse(raw) as unknown;
  // Accept a JSON string containing JSON as well as a normal JSON object. This
  // handles values copied through secret managers that add one outer layer of
  // quoting without weakening validation.
  const value = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Firebase service-account value must be a JSON object.");
  }
  return value as ServiceAccountJson;
}

function requiredServiceAccountField(
  account: ServiceAccountJson,
  field: keyof ServiceAccountJson,
): string {
  const value = account[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Firebase service-account JSON is missing ${field}.`);
  }
  return value;
}

async function buildApp(): Promise<App> {
  // firebase-admin ships CJS; dynamic import may wrap it under `default`
  const appMod = await import("firebase-admin/app");
  const admin =
    (appMod as unknown as { default?: typeof appMod }).default ??
    (appMod as unknown as typeof appMod);

  const serviceAccount = readServiceAccount();

  const credential = serviceAccount
    ? admin.cert({
        projectId: requiredServiceAccountField(serviceAccount, "project_id"),
        clientEmail: requiredServiceAccountField(serviceAccount, "client_email"),
        privateKey: requiredServiceAccountField(serviceAccount, "private_key").replace(
          /\\n/g,
          "\n",
        ),
      })
    : process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
      ? admin.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        })
      : admin.applicationDefault();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    serviceAccount?.project_id;

  const existing = admin.getApps().find((a) => a.name === FIREBASE_ADMIN_APP_NAME);
  if (existing) return existing;

  return admin.initializeApp(
    projectId ? { credential, projectId } : { credential },
    FIREBASE_ADMIN_APP_NAME,
  );
}

/** Singleton Admin app. Rejects on failure — callers decide how to fall back. */
export function getAdminApp(): Promise<App> {
  if (!appPromise)
    appPromise = buildApp().catch((err) => {
      appPromise = undefined;
      throw err;
    });
  return appPromise;
}
