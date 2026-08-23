import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createGroqProvider(apiKey: string) {
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("Invalid API key provided to createGroqProvider");
  }
  if (apiKey.length < 10) {
    throw new Error("API key appears to be too short. Check your GENERATIVE_KEY.");
  }

  try {
    return createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey,
    });
  } catch (err) {
    console.error("[ai-gateway] Failed to create provider:", err);
    throw new Error(`Failed to initialize AI provider: ${err instanceof Error ? err.message : "unknown error"}`);
  }
}
