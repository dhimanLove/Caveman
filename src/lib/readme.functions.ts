import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const Input = z.object({
  projectUrl: z.string().optional().default(""),
  description: z.string().optional().default(""),
  style: z.enum(["minimal", "standard", "comprehensive"]).default("standard"),
  sections: z.array(z.string()).default(["Installation", "Usage", "License"]),
  tone: z.enum(["technical", "friendly", "enterprise"]).default("technical"),
});

export const generateReadme = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.GENERATIVE_KEY;
    if (!key) {
      throw new Error("Missing GENERATIVE_KEY. Add your API key to the .env file in the project root.");
    }
    if (!data.projectUrl && !data.description) {
      throw new Error("Provide a GitHub URL or a project description.");
    }

    const { createGroqProvider } = await import("./ai-gateway.server");
    const groq = createGroqProvider(key);
    const model = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";

    const prompt = `You are a senior technical writer. Generate a ${data.style} README.md for the following project.

${data.projectUrl ? `GitHub URL: ${data.projectUrl}` : ""}
${data.description ? `Description: ${data.description}` : ""}

Tone: ${data.tone}
Required sections: ${data.sections.join(", ")}

Return ONLY valid Markdown. No preamble. No explanation. Start directly with the "# Project Name" heading. Use proper markdown code fences with language tags. Keep it tight, editorial, and useful.`;

    try {
      const { text } = await generateText({
        model: groq(model),
        prompt,
      });
      return { readme: text };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      if (message.includes("429")) throw new Error("Rate limited. Try again in a moment.");
      throw new Error(message);
    }
  });
