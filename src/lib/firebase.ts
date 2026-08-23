import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCFwxBgzmmJHGzdSHAv0MBfKVBNHe9K4Bo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "caveman-d35a5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "caveman-d35a5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "caveman-d35a5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "932409750435",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:932409750435:web:de8012ec644b21559aa016",
};

// Validate required config fields
const missingFields = (["apiKey", "authDomain", "projectId"] as (keyof FirebaseOptions)[])
  .filter((key) => !firebaseConfig[key]);
if (missingFields.length > 0) {
  throw new Error(`Firebase config missing required fields: ${missingFields.join(", ")}`);
}

let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (err) {
  console.error("[firebase] Initialization failed:", err);
  throw new Error(`Firebase initialization failed: ${err instanceof Error ? err.message : "unknown error"}`);
}

let auth;
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
