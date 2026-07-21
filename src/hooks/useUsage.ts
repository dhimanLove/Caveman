import { useState, useEffect } from "react";
import { doc, onSnapshot, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

interface UsageState {
  count: number;
  remaining: number;
  windowStart: number;
  cooldownEnd: number;
}

const DEFAULT_USAGE: UsageState = { count: 0, remaining: 10, windowStart: 0, cooldownEnd: 0 };

export function useUsage(uid: string | undefined) {
  const [usage, setUsage] = useState<UsageState>(DEFAULT_USAGE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setUsage(DEFAULT_USAGE);
      return;
    }

    let cancelled = false;

    const unsub = onSnapshot(
      doc(db, "usage", uid),
      (snap) => {
        if (cancelled) return;
        setError(null);

        if (!snap.exists()) {
          setUsage(DEFAULT_USAGE);
          return;
        }
        const data = snap.data() as UsageState;
        const now = Date.now();

        if (data.cooldownEnd > now) {
          setUsage({ ...data, remaining: 0 });
        } else if (now - data.windowStart >= 24 * 60 * 60 * 1000) {
          setUsage(DEFAULT_USAGE);
        } else {
          setUsage({ ...data, remaining: Math.max(0, 10 - data.count) });
        }
      },
      (err) => {
        if (cancelled) return;
        console.error("[useUsage] Firestore listener error:", err);
        setError("Failed to load usage data");
        // Keep last known usage state on error
      },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid]);

  const inCooldown = usage.cooldownEnd > Date.now();

  return { ...usage, inCooldown, error };
}
