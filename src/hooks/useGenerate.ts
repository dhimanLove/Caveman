import { useState, useCallback, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { auth, getAppCheckFrontendToken } from "@/lib/firebase";
import { generateSecure } from "@/lib/generate.functions";

const STORAGE_KEY_PREFIX = "caveman_usage_v2";
const LOCAL_DAILY_LIMIT = 10;

interface StoredUsage {
  uid: string;
  day: string;
  used: number;
  cooldownEnd: number;
}

function currentDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(uid: string): string {
  return `${STORAGE_KEY_PREFIX}:${uid}`;
}

function loadStoredUsage(uid: string): StoredUsage {
  const fresh: StoredUsage = { uid, day: currentDay(), used: 0, cooldownEnd: 0 };
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw) as StoredUsage;
      if (
        parsed.uid === uid &&
        typeof parsed.day === "string" &&
        typeof parsed.used === "number" &&
        typeof parsed.cooldownEnd === "number"
      ) {
        return parsed.day === currentDay() ? parsed : fresh;
      }
    }
  } catch {
    // ignore corrupt data
  }
  return fresh;
}

function saveStoredUsage(usage: StoredUsage) {
  try {
    localStorage.setItem(storageKey(usage.uid), JSON.stringify(usage));
  } catch {
    // storage full or unavailable
  }
}

function clearStoredUsage(uid: string) {
  try {
    localStorage.removeItem(storageKey(uid));
  } catch {
    // ignore
  }
}

interface GenerateInput {
  projectUrl?: string;
  description?: string;
  style?: "minimal" | "standard" | "comprehensive";
  sections?: string[];
  tone?: "technical" | "friendly" | "enterprise";
}

interface GenerateResult {
  readme: string;
  discovery?: any;
  remaining: number;
  cooldownEnd: number;
}

interface GenerateState {
  data: GenerateResult | null;
  error: string | null;
  cooldownExpiry: number;
  isPending: boolean;
  localRemaining: number;
}

function classifyError(err: unknown): { message: string; cooldown: number } {
  if (!err) {
    return { message: "An unexpected error occurred.", cooldown: 0 };
  }

  let rawMessage = "";
  if (typeof err === "string") {
    rawMessage = err;
  } else if (typeof err === "object") {
    const error = err as Record<string, unknown>;
    rawMessage =
      typeof error.message === "string"
        ? error.message
        : typeof error.detail === "string"
          ? error.detail
          : String(err);
  }

  // Check for structured cooldown error (JSON with cooldownEnd)
  if (rawMessage) {
    try {
      const parsed = JSON.parse(rawMessage);
      if (typeof parsed.cooldownEnd === "number") {
        return {
          message:
            typeof parsed.message === "string"
              ? parsed.message
              : "Daily limit reached. Try again later.",
          cooldown: parsed.cooldownEnd,
        };
      }
    } catch {
      // not JSON, handle as plain text
    }
  }

  // Auth errors
  if (rawMessage.includes("Unauthorized") || rawMessage.includes("unauthorized")) {
    return { message: "Session expired. Please sign in again.", cooldown: 0 };
  }
  if (rawMessage.includes("token") || rawMessage.includes("id token")) {
    return { message: "Authentication failed. Please sign in again.", cooldown: 0 };
  }

  // Timeout errors
  if (
    rawMessage.includes("timeout") ||
    rawMessage.includes("timed out") ||
    (err as any)?.name === "AbortError"
  ) {
    return { message: "Request timed out. Check your connection and try again.", cooldown: 0 };
  }

  // Real offline network errors
  if (typeof window !== "undefined" && !window.navigator.onLine) {
    return { message: "Network error. Check your connection and try again.", cooldown: 0 };
  }

  // Input errors
  if (rawMessage.includes("Invalid input")) {
    return { message: "Invalid input detected. Check your URL or description.", cooldown: 0 };
  }
  if (rawMessage.includes("Provide a GitHub URL")) {
    return { message: "Provide a GitHub URL or a project description.", cooldown: 0 };
  }
  if (rawMessage.includes("Could not access repository files")) {
    return {
      message:
        "Could not read the repository files. Private repos require a configured GitHub access token.",
      cooldown: 0,
    };
  }

  // Rate limit / cooldown errors
  if (
    rawMessage.includes("Too many requests") ||
    rawMessage.includes("rate limit") ||
    rawMessage.includes("Rate limit")
  ) {
    return { message: "Rate limited. Please wait before generating again.", cooldown: 0 };
  }
  if (rawMessage.includes("cooldown")) {
    return { message: "Please wait before generating another README.", cooldown: 0 };
  }

  return { message: rawMessage || "Something went wrong. Please try again.", cooldown: 0 };
}

export function useGenerate() {
  const fn = useServerFn(generateSecure);

  const [state, setState] = useState<GenerateState>(() => {
    const uid = auth.currentUser?.uid || "anonymous";
    const stored = loadStoredUsage(uid);
    const inCooldown = stored.cooldownEnd > Date.now();
    return {
      data: null,
      error: null,
      cooldownExpiry: inCooldown ? stored.cooldownEnd : 0,
      isPending: false,
      localRemaining: Math.max(0, LOCAL_DAILY_LIMIT - stored.used),
    };
  });

  useEffect(() => {
    const refreshLocalUsage = () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const stored = loadStoredUsage(uid);
      const cooldown = stored.cooldownEnd > Date.now() ? stored.cooldownEnd : 0;
      setState((s) => ({
        ...s,
        cooldownExpiry: cooldown,
        localRemaining: Math.max(0, LOCAL_DAILY_LIMIT - stored.used),
      }));
    };

    const interval = window.setInterval(refreshLocalUsage, 60_000);
    refreshLocalUsage();
    return () => window.clearInterval(interval);
  }, []);

  const generate = useCallback(
    async (input: GenerateInput) => {
      setState((s) => ({ ...s, error: null, data: null, isPending: true }));

      try {
        const user = auth.currentUser;
        if (!user) {
          setState({
            data: null,
            error: "Not signed in. Please sign in to generate.",
            cooldownExpiry: 0,
            isPending: false,
            localRemaining: LOCAL_DAILY_LIMIT,
          });
          return;
        }

        const stored = loadStoredUsage(user.uid);
        if (stored.used >= LOCAL_DAILY_LIMIT || stored.cooldownEnd > Date.now()) {
          const nextReset =
            stored.cooldownEnd > Date.now()
              ? stored.cooldownEnd
              : new Date(`${currentDay()}T23:59:59.999Z`).getTime();
          const message = "You have used all 10 generations for today. Try again tomorrow.";
          setState((s) => ({
            ...s,
            data: null,
            error: message,
            cooldownExpiry: nextReset,
            isPending: false,
            localRemaining: 0,
          }));
          return;
        }

        let token: string;
        try {
          token = await user.getIdToken(true);
        } catch {
          setState({
            data: null,
            error: "Failed to get authentication token. Please sign in again.",
            cooldownExpiry: 0,
            isPending: false,
            localRemaining: Math.max(0, LOCAL_DAILY_LIMIT - stored.used),
          });
          return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 180000);

        const appCheckToken = await getAppCheckFrontendToken();

        const result = await (fn as any)({
          data: {
            _token: token,
            _appCheckToken: appCheckToken,
            projectUrl: input.projectUrl || "",
            description: input.description || "",
            style: input.style || "standard",
            sections: input.sections || ["Installation", "Usage", "License"],
            tone: input.tone || "technical",
          },
        });

        clearTimeout(timeout);

        if (!result || !result.readme) {
          setState({
            data: null,
            error: "Generation returned empty. Try again.",
            cooldownExpiry: 0,
            isPending: false,
            localRemaining: Math.max(0, LOCAL_DAILY_LIMIT - stored.used),
          });
          return;
        }

        const updatedUsage: StoredUsage = {
          uid: user.uid,
          day: currentDay(),
          used: stored.used + 1,
          cooldownEnd: result.cooldownEnd || 0,
        };
        saveStoredUsage(updatedUsage);

        setState({
          data: result,
          error: null,
          cooldownExpiry: 0,
          isPending: false,
          localRemaining: Math.max(0, LOCAL_DAILY_LIMIT - updatedUsage.used),
        });
        return result;
      } catch (err: unknown) {
        const { message, cooldown } = classifyError(err);
        if (cooldown > 0) {
          saveStoredUsage({
            uid: auth.currentUser?.uid || "anonymous",
            day: currentDay(),
            used: LOCAL_DAILY_LIMIT,
            cooldownEnd: cooldown,
          });
        }
        setState((s) => ({
          ...s,
          data: null,
          error: message,
          cooldownExpiry: cooldown,
          isPending: false,
          localRemaining: cooldown > 0 ? 0 : s.localRemaining,
        }));
      }
    },
    [fn],
  );

  const reset = useCallback(() => {
    const uid = auth.currentUser?.uid || "anonymous";
    clearStoredUsage(uid);
    setState({
      data: null,
      error: null,
      cooldownExpiry: 0,
      isPending: false,
      localRemaining: LOCAL_DAILY_LIMIT,
    });
  }, []);

  return { ...state, generate, reset };
}
