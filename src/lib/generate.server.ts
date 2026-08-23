import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateReadme } from "./readme.functions";
import { verifyFirebaseToken, hasPromptInjection, sanitizeOutput } from "./firebase-verify.server";
import { checkRateLimit, decrementCount, getUsage } from "./rate-limit.server";

const Input = z.object({
  _token: z.string(),
  projectUrl: z.string().optional().default(""),
  description: z.string().optional().default(""),
  style: z.enum(["minimal", "standard", "comprehensive"]).default("standard"),
  sections: z.array(z.string()).default(["Installation", "Usage", "License"]),
  tone: z.enum(["technical", "friendly", "enterprise"]).default("technical"),
});

export const generateSecure = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { _token, ...input } = data;

    let uid: string;
    try {
      uid = await verifyFirebaseToken(_token);
    } catch {
      throw new Error("Unauthorized");
    }

    const desc = input.description || "";
    const url = input.projectUrl || "";
    if (!url && !desc) {
      throw new Error("Provide a GitHub URL or a project description.");
    }
    if (desc.length > 2000) {
      throw new Error("Description must be under 2,000 characters.");
    }

    if (hasPromptInjection(desc)) {
      throw new Error("Invalid input");
    }

    const rateLimit = checkRateLimit(uid);
    if (!rateLimit.allowed) {
      throw new Error(JSON.stringify({ cooldownEnd: rateLimit.cooldownEnd }));
    }

    try {
      const result = await generateReadme({ data: input });

      const sanitized = sanitizeOutput(result.readme);

      const usage = getUsage(uid);
      return {
        readme: sanitized,
        discovery: result.discovery,
        remaining: usage.remaining,
        cooldownEnd: usage.cooldownEnd,
      };
    } catch (err) {
      decrementCount(uid);

      const message = err instanceof Error ? err.message : "Unknown error";

      // Pass through meaningful errors, hide internal details
      if (message.includes("rate limit") || message.includes("Rate limit")) throw err;
      if (message.includes("timed out") || message.includes("timeout")) throw err;
      if (message.includes("API key") || message.includes("api key")) throw err;
      if (message.includes("empty response")) throw err;
      if (message.includes("Failed to initialize")) throw err;
      if (message.includes("Repository") || message.includes("rate limited")) throw err;
      if (message.startsWith("Generation failed:")) throw err;

      throw new Error("Generation failed. Try again.");
    }
  });
