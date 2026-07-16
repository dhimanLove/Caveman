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

export function useUsage(uid: string | undefined) {
  const [usage, setUsage] = useState<UsageState>({
    count: 0,
    remaining: 10,
    windowStart: 0,
    cooldownEnd: 0,
  });

  useEffect(() => {
    if (!uid) return;

    const unsub = onSnapshot(doc(db, "usage", uid), (snap) => {
      if (!snap.exists()) {
        setUsage({ count: 0, remaining: 10, windowStart: 0, cooldownEnd: 0 });
        return;
      }
      const data = snap.data() as UsageState;
      const now = Date.now();

      if (data.cooldownEnd > now) {
        setUsage({ ...data, remaining: 0 });
      } else if (now - data.windowStart >= 24 * 60 * 60 * 1000) {
        setUsage({ count: 0, remaining: 10, windowStart: 0, cooldownEnd: 0 });
      } else {
        setUsage({ ...data, remaining: Math.max(0, 10 - data.count) });
      }
    });

    return unsub;
  }, [uid]);

  const inCooldown = usage.cooldownEnd > Date.now();

  return { ...usage, inCooldown };
}
