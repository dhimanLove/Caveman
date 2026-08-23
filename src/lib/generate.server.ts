import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { runReadmeGeneration } from "./readme.functions";
import {
  verifyFirebaseToken,
  hasPromptInjection,
  sanitizeOutput,
  pseudonymize,
} from "./firebase-verify.server";
import { consumeQuota, refundQuota, readUsage } from "./firestore-rate-limit.server";
import { checkIpLimit, getClientIp, isSameOrigin } from "./request-guard.server";

const Input = z.object({
  _token: z.string().min(20).max(4096),
  projectUrl: z.string().max(300).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  style: z.enum(["minimal", "standard", "comprehensive"]).default("standard"),
  sections: z.array(z.string().max(60)).max(24).default(["Installation", "Usage", "License"]),
  tone: z.enum(["technical", "friendly", "enterprise"]).default("technical"),
});

export const generateSecure = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    // Same-origin guard (defense-in-depth; auth token below is the real gate)
    if (!isSameOrigin()) {
      throw new Error("Unauthorized");
    }

    const ip = getClientIp();
    const { _token, ...input } = data;

    let uid: string;
    try {
      uid = await verifyFirebaseToken(_token);
    } catch {
      console.warn(
        JSON.stringify({ type: "auth_failed", ipHash: pseudonymize(ip), ts: new Date().toISOString() }),
      );
      throw new Error("Unauthorized");
    }

    // Secondary per-IP limit - mass fake-account abuse mitigation
    if (!checkIpLimit(ip, "generate")) {
      throw new Error("Too many requests. Please try again later.");
    }

    if (!input.projectUrl && !input.description) {
      throw new Error("Provide a GitHub URL or a project description.");
    }
    if (hasPromptInjection(input.description)) {
      throw new Error("Invalid input");
    }

    // Primary durable UID quota - atomic transaction on the server clock
    const rateLimit = await consumeQuota(uid);
    if (!rateLimit.allowed) {
      throw new Error(JSON.stringify({ cooldownEnd: rateLimit.cooldownEnd }));
    }

    try {
      const result = await runReadmeGeneration(input);

      const sanitized = sanitizeOutput(result.readme);
      const usage = await readUsage(uid);

      return {
        readme: sanitized,
        discovery: result.discovery,
        remaining: usage.remaining,
        cooldownEnd: usage.cooldownEnd,
      };
    } catch (err) {
      // Failed generation doesn't burn quota
      await refundQuota(uid);

      const message = err instanceof Error ? err.message : String(err);

      // Pass through all curated / informative errors
      if (
        message === "Unauthorized" ||
        message.includes("Unauthorized") ||
        message.includes("Invalid input") ||
        message.includes("rate limit") ||
        message.includes("Rate limited") ||
        message.includes("Too many requests") ||
        message.includes("timed out") ||
        message.includes("timeout") ||
        message.includes("API key") ||
        message.includes("empty response") ||
        message.includes("Missing GENERATIVE_KEY") ||
        message.includes("Failed to initialize AI provider") ||
        message.includes("README generation failed") ||
        message.includes("Provide a GitHub URL") ||
        message.includes("AI rate limited")
      ) {
        throw err;
      }

      console.error("[generateSecure] Generation failed:", message);
      throw err instanceof Error ? err : new Error(message || "Generation failed. Try again.");
    }
  });
