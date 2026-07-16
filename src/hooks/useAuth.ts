import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth, googleProvider, firebaseConfigError } from "@/lib/firebase";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
  "auth/popup-blocked": "Pop-up sign-in was blocked. Please allow pop-ups for this site or try again.",
  "auth/unauthorized-domain": "This domain is not authorized for Firebase sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed": "Google sign-in is not enabled in Firebase Console → Authentication → Sign-in method → Google.",
  "auth/invalid-api-key": "Invalid Firebase API key. Check VITE_FIREBASE_API_KEY.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setError(firebaseConfigError ?? "Firebase Auth is not available.");
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async () => {
    setError(null);

    if (!auth) {
      setError(firebaseConfigError ?? "Firebase Auth is not available.");
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code as string;
      const message = ERROR_MESSAGES[code];

      if (message === "") return;
      if (message) {
        setError(message);
        return;
      }

      if (code === "auth/popup-blocked") {
        setError("Pop-up was blocked. Try allowing pop-ups for this site.");
        return;
      }

      console.error("Sign-in error:", err);
      setError(`Sign-in failed: ${code || err?.message || "Unknown error"}. Please try again.`);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setUser(null);
    setError(null);
  }, []);

  return { user, loading, error, signIn, signOut };
}
