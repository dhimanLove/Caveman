import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const env = import.meta.env;

const requiredConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

// No hardcoded fallbacks - configuration comes from the environment (.env /
// hosting provider env vars). Firebase web keys are public identifiers by
// design, but they still belong in configuration, not source.
const missingFields = Object.entries(requiredConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missingFields.length > 0) {
  throw new Error(
    `Firebase config missing: ${missingFields.join(", ")}. Add the VITE_FIREBASE_* variables to your .env file.`,
  );
}

const firebaseConfig: FirebaseOptions = requiredConfig;

let app: ReturnType<typeof initializeApp>;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (err) {
  console.error("[firebase] Initialization failed:", err);
  throw new Error(`Firebase initialization failed: ${err instanceof Error ? err.message : "unknown error"}`);
}

let auth: ReturnType<typeof getAuth>;
try {
  auth = getAuth(app);
} catch (err) {
  console.error("[firebase] Auth initialization failed:", err);
  throw new Error("Firebase auth initialization failed. Check your project configuration.");
}

let googleProvider: GoogleAuthProvider;
try {
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
} catch (err) {
  console.error("[firebase] Google provider init failed:", err);
  throw new Error("Failed to initialize Google sign-in provider.");
}

export { auth, googleProvider, app };
