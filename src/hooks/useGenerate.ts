import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { auth } from "@/lib/firebase";
import { generateSecure } from "@/lib/generate.server";

const STORAGE_KEY = "caveman_usage";

interface StoredUsage {
  remaining: number;
  cooldownEnd: number;
}

function loadStoredUsage(): StoredUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredUsage;
      if (typeof parsed.remaining === "number" && typeof parsed.cooldownEnd === "number") {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt data
  }
  return { remaining: 10, cooldownEnd: 0 };
}

function saveStoredUsage(remaining: number, cooldownEnd: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ remaining, cooldownEnd }));
  } catch {
    // storage full or unavailable
  }
}

function clearStoredUsage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
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
}

function classifyError(err: unknown): { message: string; cooldown: number } {
  if (!err || typeof err !== "object") {
    return { message: "An unexpected error occurred.", cooldown: 0 };
  }

  const error = err as Record<string, unknown>;
  const rawMessage = typeof error.message === "string" ? error.message : "";

  // Check for structured cooldown error (JSON with cooldownEnd)
  if (rawMessage) {
    try {
      const parsed = JSON.parse(rawMessage);
      if (typeof parsed.cooldownEnd === "number") {
        return { message: "Daily limit reached. Try again later.", cooldown: parsed.cooldownEnd };
      }
    } catch {
      // not JSON, handle as plain text
    }
  }

  // Network / timeout errors
  if (error.name === "AbortError" || rawMessage.includes("timeout") || rawMessage.includes("timed out")) {
    return { message: "Request timed out. Check your connection and try again.", cooldown: 0 };
  }
  if (rawMessage.includes("fetch") || rawMessage.includes("network") || rawMessage.includes("NetworkError")) {
    return { message: "Network error. Check your connection and try again.", cooldown: 0 };
  }

  // Auth errors
  if (rawMessage === "Unauthorized") {
    return { message: "Session expired. Please sign in again.", cooldown: 0 };
  }
  if (rawMessage.includes("token") || rawMessage.includes("id token")) {
    return { message: "Authentication failed. Please sign in again.", cooldown: 0 };
  }

  // Input errors
  if (rawMessage === "Invalid input" || rawMessage.includes("Invalid input")) {
    return { message: "Invalid input detected. Check your URL or description.", cooldown: 0 };
  }

  // Rate limit / cooldown errors
  if (rawMessage.includes("rate limit") || rawMessage.includes("Rate limit")) {
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
    const stored = loadStoredUsage();
    const inCooldown = stored.cooldownEnd > Date.now();
    return {
      data: null,
      error: null,
      cooldownExpiry: inCooldown ? stored.cooldownEnd : 0,
      isPending: false,
    };
  });

  const generate = useCallback(async (input: GenerateInput) => {
    setState((s) => ({ ...s, error: null, data: null, isPending: true }));

    try {
      const user = auth.currentUser;
      if (!user) {
        setState({ data: null, error: "Not signed in. Please sign in to generate.", cooldownExpiry: 0, isPending: false });
        return;
      }

      let token: string;
      try {
        token = await user.getIdToken();
      } catch {
        setState({ data: null, error: "Failed to get authentication token. Please sign in again.", cooldownExpiry: 0, isPending: false });
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const result = await (fn as any)({
        data: {
          _token: token,
          projectUrl: input.projectUrl || "",
          description: input.description || "",
          style: input.style || "standard",
          sections: input.sections || ["Installation", "Usage", "License"],
          tone: input.tone || "technical",
        },
      });

      clearTimeout(timeout);

      if (!result || !result.readme) {
        setState({ data: null, error: "Generation returned empty. Try again.", cooldownExpiry: 0, isPending: false });
        return;
      }

      // Persist remaining count to localStorage so it survives page refresh
      if (typeof result.remaining === "number") {
        saveStoredUsage(result.remaining, result.cooldownEnd || 0);
      }

      setState({ data: result, error: null, cooldownExpiry: 0, isPending: false });
      return result;
    } catch (err: unknown) {
      const { message, cooldown } = classifyError(err);
      // Persist cooldown so it survives page refresh
      if (cooldown > 0) {
        saveStoredUsage(0, cooldown);
      }
      setState({ data: null, error: message, cooldownExpiry: cooldown, isPending: false });
    }
  }, [fn]);

  const reset = useCallback(() => {
    clearStoredUsage();
    setState({ data: null, error: null, cooldownExpiry: 0, isPending: false });
  }, []);

  return { ...state, generate, reset };
}
