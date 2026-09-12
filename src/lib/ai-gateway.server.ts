/**
 * Resolves the primary and fallback AI models based on the configured environment or key.
 */
export function getModelCandidates(
  customModel?: string,
  apiKey?: string,
): { primary: string; fallback: string } {
  const envModel = customModel || process.env.AI_MODEL;
  const key = apiKey || process.env.GENERATIVE_KEY || "";

  if (envModel && envModel.trim()) {
    const trimmed = envModel.trim();
    if (trimmed.startsWith("gemini")) {
      return { primary: trimmed, fallback: "gemini-1.5-flash" };
    }
    if (trimmed.startsWith("gpt-") || trimmed.startsWith("o1") || trimmed.startsWith("o3")) {
      return { primary: trimmed, fallback: "gpt-4o-mini" };
    }
    return { primary: trimmed, fallback: "openai/gpt-oss-20b" };
  }

  // Key-based inference
  if (key.startsWith("AIza")) {
    return { primary: "gemini-2.5-flash", fallback: "gemini-1.5-flash" };
  }
  if (key.startsWith("sk-") && !key.startsWith("gsk_")) {
    return { primary: "gpt-4o-mini", fallback: "gpt-4o" };
  }

  // Default to Groq (super fast, high accuracy) — openai/gpt-oss-120b is the
  // primary with the smaller/cheaper gpt-oss-20b as fallback (both verified on
  // the current Groq tiers; legacy llama-* model ids are no longer available).
  return {
    primary: "openai/gpt-oss-120b",
    fallback: "openai/gpt-oss-20b",
  };
}
