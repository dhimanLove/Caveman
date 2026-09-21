import { useState, useEffect, useCallback } from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/shared/lib/firebase";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
  "auth/popup-blocked":
    "Pop-up sign-in was blocked. Please allow pop-ups for this site or try again.",
  "auth/unauthorized-domain":
    "This domain is not authorized for Firebase sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed":
    "Google sign-in is not enabled in Firebase Console → Authentication → Sign-in method → Google.",
  "auth/invalid-api-key":
    "Invalid Firebase API key. Check the key in your Firebase Console → Project Settings.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    "Firebase project is misconfigured. Please check the project settings in Firebase Console.",
  "auth/internal-error":
    "Google sign-in could not complete. Add this production domain in Firebase Authorized domains and verify that Google sign-in is enabled.",
  "auth/invalid-oauth-client-id":
    "Google sign-in is misconfigured. Check the OAuth client and Firebase Google provider settings.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
};

const POPUP_FALLBACK_CODES = new Set(["auth/internal-error", "auth/popup-blocked"]);

type FirebaseAuthError = {
  code?: unknown;
  message?: unknown;
};

function getAuthErrorCode(err: unknown): string {
  if (typeof err !== "object" || err === null) return "";
  const code = (err as FirebaseAuthError).code;
  return typeof code === "string" ? code : "";
}

function getAuthErrorMessage(err: unknown): string {
  const code = getAuthErrorCode(err);
  const message = ERROR_MESSAGES[code];
  if (message) return message;
  if (message === "") return "";

  const detail =
    typeof err === "object" &&
    err !== null &&
    typeof (err as FirebaseAuthError).message === "string"
      ? (err as FirebaseAuthError).message
      : "Unknown error";
  return `Sign-in failed: ${code || detail}. Please try again.`;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    void getRedirectResult(auth).catch((err: unknown) => {
      const message = getAuthErrorMessage(err);
      if (message) setError(message);
    });

    return unsub;
  }, []);

  const signIn = useCallback(async () => {
    setError(null);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);

      // Popup auth can fail in production when browser privacy or opener
      // policies interfere with the popup handshake. Redirect auth uses the
      // same Firebase provider without relying on that handshake.
      if (POPUP_FALLBACK_CODES.has(code)) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: unknown) {
          const message = getAuthErrorMessage(redirectError);
          if (message) setError(message);
          return;
        }
      }

      const message = getAuthErrorMessage(err);
      if (!message) {
        return;
      }

      console.error("Sign-in error:", err);
      setError(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setError(null);
  }, []);

  return { user, loading, error, signIn, signOut };
}
