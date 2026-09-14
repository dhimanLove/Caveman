import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { runReadmeGeneration } from "./readme.functions";
import {
  verifyFirebaseToken,
  verifyAppCheck,
  hasPromptInjection,
  sanitizeOutput,
  pseudonymize,
} from "./firebase-verify.server";
import {
  consumeQuota,
  refundQuota,
  readUsage,
  consumeGlobalCap,
  logGeneration,
} from "./firestore-rate-limit.server";
import {
  getClientIp,
  isSameOrigin,
  checkIpLimit,
  refundIpLimit,
  checkAuthBruteForce,
  recordAuthFailure,
  clearAuthFailures,
} from "./request-guard.server";

const Input = z.object({
  _token: z.string().min(20).max(4096),
  // Optional: sent by the client only when App Check is configured there. An
  // empty value is UNAVAILABLE-token, NOT an error — enforcement happens
  // server-side via verifyAppCheck (rejects empty only when ENFORCE_APP_CHECK).
  _appCheckToken: z.string().max(10240).optional().default(""),
  projectUrl: z.string().max(300).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  style: z.enum(["minimal", "standard", "comprehensive"]).default("standard"),
  sections: z.array(z.string().max(60)).max(24).default(["Installation", "Usage", "License"]),
  tone: z.enum(["technical", "friendly", "enterprise"]).default("technical"),
});

const RATE_LIMIT_MESSAGES = {
  user: "Rate limit reached. Your next generation unlocks in a few hours.",
  ip: "Too many requests from this connection. Please wait a moment.",
  global: "Caveman is seeing very high demand right now. Please try again in a few minutes.",
} as const;

// Maps raw AI-provider/client errors to safe, user-facing messages. Returns
// null when the message is curated/informative and can pass through as-is.
// All heuristics are lowercase-insensitive on the provider message.
function toFriendlyGenerationError(rawMessage: string): string | null {
  const m = rawMessage.toLowerCase();

  // Server-side configuration / credential problems. Never mention env var
  // names or key material in client-facing copy; log the raw cause server-side.
  if (
    m.includes("generative_key") ||
    m.includes("api key") ||
    rawMessage === "401" ||
    m.includes("401") ||
    m.includes("403") ||
    m.includes("failed to initialize ai provider") ||
    m.includes("unable to connect")
  ) {
    return "The AI service is temporarily unavailable. Please try again in a few minutes.";
  }

  // Provider context-window exceeded (e.g. Groq "Request too large" for the
  // selected model) — actionable for the user without leaking model/org ids.
  if (
    m.includes("request too large") ||
    m.includes("too large") ||
    m.includes("context length") ||
    m.includes("maximum context") ||
    m.includes("context_length_exceeded") ||
    m.includes("too many tokens") ||
    m.includes("max tokens") ||
    m.includes("token limit") ||
    m.includes("context window")
  ) {
    return "This project is too large to generate at the selected detail level. Try the Minimal style, or reduce the number of sections.";
  }

  // Generic wrapped "README generation failed: ..." — the tail is raw provider
  // text (model ids, quotas, org names). Strip it to a safe generic message.
  if (m.includes("readme generation failed")) {
    return "Generation failed. Please try again.";
  }

  return null;
}

export const generateSecure = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    // Same-origin guard (defense-in-depth; auth token below is the real gate)
    if (!isSameOrigin()) {
      throw new Error("Unauthorized");
    }

    const ip = getClientIp();

    // Auth brute-force shield: block IPs with too many failed verifications
    // for the hour BEFORE spending any quota or hitting the token endpoint.
    const authGate = checkAuthBruteForce(ip);
    if (authGate.blocked) {
      throw new Error("Too many attempts. Please try again later.");
    }

    const { _token, _appCheckToken, ...input } = data;

    let uid: string;
    try {
      uid = await verifyFirebaseToken(_token);
      clearAuthFailures(ip);
    } catch {
      recordAuthFailure(ip);
      console.warn(
        JSON.stringify({
          type: "auth_failed",
          action: "auth",
          ipHash: pseudonymize(ip),
          ts: new Date().toISOString(),
        }),
      );
      throw new Error("Unauthorized");
    }

    // App Check: block requests that don't carry evidence of running in the
    // real app. Gated by ENFORCE_APP_CHECK=true (see .env.example); the hosted
    // production build sets it so only genuine app instances can generate.
    if (!(await verifyAppCheck(_appCheckToken))) {
      recordAuthFailure(ip);
      console.warn(
        JSON.stringify({
          type: "app_check_failed",
          action: "app_check",
          ipHash: pseudonymize(ip),
          ts: new Date().toISOString(),
        }),
      );
      throw new Error("Unauthorized");
    }

    // Per-IP secondary limit (fallback for bots behind throwaway accounts)
    const ipLimit = checkIpLimit(ip, "generate");
    if (!ipLimit.allowed) {
      throw new Error(
        JSON.stringify({ cooldownEnd: ipLimit.cooldownEnd, message: RATE_LIMIT_MESSAGES.ip }),
      );
    }

    if (!input.projectUrl && !input.description) {
      throw new Error("Provide a GitHub URL or a project description.");
    }
    if (hasPromptInjection(input.description)) {
      throw new Error("Invalid input");
    }

    // Per-user rolling-window quota (primary gate). Checked before the global
    // cap so users already over their own limit never inflate the app-wide
    // counter (which would cause false "high demand" denials for everyone).
    const rateLimit = await consumeQuota(uid);
    if (!rateLimit.allowed) {
      throw new Error(
        JSON.stringify({
          cooldownEnd: rateLimit.cooldownEnd,
          resetAt: rateLimit.resetAt,
          message: RATE_LIMIT_MESSAGES.user,
        }),
      );
    }

    // App-wide daily cap — bounds total Groq spend during launch. Thrown as a
    // plain error so it surfaces in the inline error banner ("high demand"),
    // NOT the per-user cooldown screen (whose copy is about the user's own quota).
    // If the global cap closes AFTER the user quota was consumed, refund the
    // user slot so the global denial doesn't eat one of their 10 generations.
    const globalCap = await consumeGlobalCap();
    if (!globalCap.allowed) {
      try {
        await refundQuota(uid);
      } catch {
        /* refund failure must not mask the global-cap message */
      }
      try {
        refundIpLimit(ip, "generate");
      } catch {
        /* ip refund failure must not mask the global-cap message */
      }
      throw new Error(RATE_LIMIT_MESSAGES.global);
    }

    const startedAt = Date.now();
    try {
      const result = await runReadmeGeneration(input);

      const sanitized = sanitizeOutput(result.readme);
      const usage = await readUsage(uid);
      logGeneration(uid, true, Date.now() - startedAt);

      return {
        readme: sanitized,
        discovery: result.discovery,
        remaining: usage.remaining,
        cooldownEnd: 0,
      };
    } catch (err) {
      // Refund quota that was consumed on failure. Each refund is isolated in
      // its own try/catch so a refund failure NEVER masks or replaces the
      // original generation error (e.g. a Firebase "Unable to detect a Project
      // Id" error on non-GCP hosts must not hide why generation actually failed).
      try {
        await refundQuota(uid);
      } catch (refundErr) {
        console.warn(
          "[generateSecure] Refund failed (original error preserved):",
          refundErr instanceof Error ? refundErr.message : refundErr,
        );
      }
      try {
        refundIpLimit(ip, "generate");
      } catch (ipErr) {
        console.warn(
          "[generateSecure] IP refund failed (original error preserved):",
          ipErr instanceof Error ? ipErr.message : ipErr,
        );
      }
      logGeneration(uid, false, Date.now() - startedAt);

      const message = err instanceof Error ? err.message : String(err);

      // Sanitize raw provider errors before they reach the client: never expose
      // internal config (env var names, keys) or raw provider internals (model
      // ids, org ids, service tiers). Log the real cause server-side.
      const friendly = toFriendlyGenerationError(message);
      if (friendly) {
        console.error("[generateSecure] Generation failed:", message);
        throw new Error(friendly);
      }

      // Pass through curated / informative errors
      if (
        message === "Unauthorized" ||
        message.includes("Unauthorized") ||
        message.includes("Invalid input") ||
        message.includes("rate limit") ||
        message.includes("Rate limited") ||
        message.includes("Too many requests") ||
        message.includes("rate_limit") ||
        message.includes("quota") ||
        message.includes("Retry after") ||
        message.includes("requests per minute") ||
        message.includes("timed out") ||
        message.includes("timeout") ||
        message.includes("empty response") ||
        message.includes("Provide a GitHub URL") ||
        message.includes("AI rate limited") ||
        message.includes("temporarily unavailable")
      ) {
        throw new Error(message);
      }

      console.error("[generateSecure] Generation failed:", message);
      throw err instanceof Error ? err : new Error(message || "Generation failed. Try again.");
    }
  });
