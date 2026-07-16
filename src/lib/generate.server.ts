import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { generateReadme } from "./readme.functions";
import { verifyFirebaseToken, hasPromptInjection, sanitizeOutput } from "./firebase-verify.server";
import { checkRateLimit, decrementCount, getUsage } from "./rate-limit.server";

const Input = z.object({
  projectUrl: z.string().optional().default(""),
  description: z.string().optional().default(""),
  style: z.enum(["minimal", "standard", "comprehensive"]).default("standard"),
  sections: z.array(z.string()).default(["Installation", "Usage", "License"]),
  tone: z.enum(["technical", "friendly", "enterprise"]).default("technical"),
});

export const generateSecure = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const authHeader = getRequestHeader("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }

    const idToken = authHeader.slice(7);
    let uid: string;
    try {
      uid = await verifyFirebaseToken(idToken);
    } catch {
      throw new Error("Unauthorized");
    }

    const desc = data.description || "";
    const url = data.projectUrl || "";
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
      const result = await generateReadme({ data });

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

      if (err instanceof Error && err.message === "Rate limited. Try again in a moment.") {
        throw err;
      }

      throw new Error("Generation failed. Please try again.");
    }
  });
