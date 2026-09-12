import type { App } from "firebase-admin/app";

/**
 * Shared Firebase Admin app (single instance) used by:
 *  - Firestore (durable rate limiting, global cap)
 *  - App Check token verification
 *
 * Credentials:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  - full service-account JSON (recommended)
 *   or GOOGLE_APPLICATION_CREDENTIALS / platform workload identity
 *
 * projectId is passed EXPLICITLY: outside GCP the client cannot auto-detect it
 * ("Unable to detect a Project Id ..."). Prefer FIREBASE_PROJECT_ID, then
 * GOOGLE_CLOUD_PROJECT, then project_id inside the service account JSON.
 */

export const FIREBASE_ADMIN_APP_NAME = "caveman-server";

let appPromise: Promise<App> | undefined;

async function buildApp(): Promise<App> {
  // firebase-admin ships CJS; dynamic import may wrap it under `default`
  const appMod: any = await import("firebase-admin/app");
  const admin = appMod.default ?? appMod;

  const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? admin.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
    : admin.applicationDefault();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    (process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? (JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) as { project_id?: string })
          .project_id
      : undefined);

  const existing = admin.getApps().find((a: App) => a.name === FIREBASE_ADMIN_APP_NAME);
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
