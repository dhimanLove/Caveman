import { useState, useCallback, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { onAuthStateChanged } from "firebase/auth";
import { auth, getAppCheckFrontendToken } from "@/lib/firebase";
import { generateSecure, getQuotaStatus } from "@/lib/generate.functions";
import type { ReadmeDiscovery } from "@/lib/readme.functions";

const STORAGE_KEY_PREFIX = "caveman_usage_v3";
const GENERATION_LIMIT = 8;

interface StoredUsage {
  uid: string;
  used: number;
  cooldownEnd: number;
  syncedAt: number;
}

function storageKey(uid: string): string {
  return `${STORAGE_KEY_PREFIX}:${uid}`;
}

function loadStoredUsage(uid: string): StoredUsage {
  const fresh: StoredUsage = { uid, used: 0, cooldownEnd: 0, syncedAt: 0 };
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw) as StoredUsage;
      if (
        parsed.uid === uid &&
        typeof parsed.used === "number" &&
        typeof parsed.cooldownEnd === "number" &&
        typeof parsed.syncedAt === "number"
      ) {
        return parsed;
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
  discovery?: ReadmeDiscovery;
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

type GenerateServerInput = {
  data: {
    _token: string;
    _appCheckToken: string;
    projectUrl: string;
    description: string;
    style: "minimal" | "standard" | "comprehensive";
    sections: string[];
    tone: "technical" | "friendly" | "enterprise";
  };
};

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && "name" in error
    ? String((error as { name?: unknown }).name)
    : "";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error("Request timed out.")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) window.clearTimeout(timer);
  });
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
              : "You've used all 8 generations in the current 15-hour window. Try again later.",
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
    errorName(err) === "AbortError"
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
  const quotaFn = useServerFn(getQuotaStatus);

  const [state, setState] = useState<GenerateState>(() => {
    const uid = auth.currentUser?.uid || "anonymous";
    const stored = loadStoredUsage(uid);
    return {
      data: null,
      error: null,
      cooldownExpiry: 0,
      isPending: false,
      localRemaining: Math.max(0, GENERATION_LIMIT - stored.used),
    };
  });

  useEffect(() => {
    const refreshQuota = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const appCheckToken = await getAppCheckFrontendToken();
        const serverFn = quotaFn as unknown as (args: {
          data: { _token: string; _appCheckToken: string };
        }) => Promise<{ remaining: number; cooldownEnd: number }>;
        const usage = await serverFn({ data: { _token: token, _appCheckToken: appCheckToken } });
        const cooldown = usage.cooldownEnd > Date.now() ? usage.cooldownEnd : 0;
        saveStoredUsage({
          uid: user.uid,
          used: Math.max(0, GENERATION_LIMIT - usage.remaining),
          cooldownEnd: cooldown,
          syncedAt: Date.now(),
        });
        setState((s) => ({
          ...s,
          cooldownExpiry: cooldown,
          localRemaining: Math.max(0, usage.remaining),
        }));
      } catch {
        // The generation endpoint remains the source of truth if this refresh
        // fails (for example during a temporary network transition).
        const stored = loadStoredUsage(user.uid);
        setState((s) => ({
          ...s,
          localRemaining: Math.max(0, GENERATION_LIMIT - stored.used),
        }));
      }
    };

    const unsubscribe = onAuthStateChanged(auth, () => void refreshQuota());
    const interval = window.setInterval(() => void refreshQuota(), 60_000);
    void refreshQuota();
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [quotaFn]);

  useEffect(() => {
    if (state.cooldownExpiry <= Date.now()) return;
    const timeout = window.setTimeout(
      () => {
        setState((s) =>
          s.cooldownExpiry > 0 && s.cooldownExpiry <= Date.now() ? { ...s, cooldownExpiry: 0 } : s,
        );
      },
      Math.max(0, state.cooldownExpiry - Date.now()) + 100,
    );
    return () => window.clearTimeout(timeout);
  }, [state.cooldownExpiry]);

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
            localRemaining: GENERATION_LIMIT,
          });
          return;
        }

        const stored = loadStoredUsage(user.uid);

        let token: string;
        try {
          token = await user.getIdToken(true);
        } catch {
          setState({
            data: null,
            error: "Failed to get authentication token. Please sign in again.",
            cooldownExpiry: 0,
            isPending: false,
            localRemaining: Math.max(0, GENERATION_LIMIT - stored.used),
          });
          return;
        }

        const appCheckToken = await getAppCheckFrontendToken();
        const serverFn = fn as unknown as (args: GenerateServerInput) => Promise<GenerateResult>;
        const result = await withTimeout(
          serverFn({
            data: {
              _token: token,
              _appCheckToken: appCheckToken,
              projectUrl: input.projectUrl || "",
              description: input.description || "",
              style: input.style || "comprehensive",
              sections: input.sections || [
                "Installation",
                "Usage",
                "API Docs",
                "License",
                "Tech Stack",
                "Folder Structure",
                "Components",
                "Features",
                "Architecture",
                "Security",
                "Deployment",
                "Testing",
              ],
              tone: input.tone || "technical",
            },
          }),
          180000,
        );

        if (!result || !result.readme) {
          setState({
            data: null,
            error: "Generation returned empty. Try again.",
            cooldownExpiry: 0,
            isPending: false,
            localRemaining: Math.max(0, GENERATION_LIMIT - stored.used),
          });
          return;
        }

        const updatedUsage: StoredUsage = {
          uid: user.uid,
          used: Math.max(0, GENERATION_LIMIT - result.remaining),
          cooldownEnd: result.cooldownEnd || 0,
          syncedAt: Date.now(),
        };
        saveStoredUsage(updatedUsage);

        setState({
          data: result,
          error: null,
          cooldownExpiry: 0,
          isPending: false,
          localRemaining: Math.max(0, result.remaining),
        });
        return result;
      } catch (err: unknown) {
        const { message, cooldown } = classifyError(err);
        if (cooldown > 0) {
          saveStoredUsage({
            uid: auth.currentUser?.uid || "anonymous",
            used: GENERATION_LIMIT,
            cooldownEnd: cooldown,
            syncedAt: Date.now(),
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
      localRemaining: GENERATION_LIMIT,
    });
  }, []);

  return { ...state, generate, reset };
}
