/**
 * High-speed OpenAI-compatible chat completions client for Groq, Google Gemini, and OpenAI.
 */

import { fetchWithTimeout, readJsonWithLimit } from "./http.server";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GroqChatOptions = {
  apiKey: string;
  model: string;
  baseURL?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
};

export type GroqChatResult = {
  text: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
};

const DEFAULT_BASE = "https://api.groq.com/openai/v1";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60000);
  return undefined;
}

function parseRetryAfterMessage(message: string): number | undefined {
  const match = message.match(/try again in\s+([\d.]+)s/i);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, 60000) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function groqChatComplete(options: GroqChatOptions): Promise<GroqChatResult> {
  const {
    apiKey,
    model,
    baseURL = DEFAULT_BASE,
    messages,
    temperature = 0.2,
    maxTokens = 4096,
    maxRetries = 2,
  } = options;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Missing GENERATIVE_KEY. Put a valid API key in your .env file.");
  }

  const endpoint = `${baseURL.replace(/\/+$/, "")}/chat/completions`;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  let attempt = 0;
  for (;;) {
    attempt++;
    let res: Response;
    try {
      res = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify(body),
        },
        45_000,
      );
    } catch (err: unknown) {
      if (attempt <= maxRetries) {
        const backoffMs = 500 * Math.pow(2, attempt - 1);
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[ai-client] network error on attempt ${attempt}: ${message}. Retrying in ${backoffMs}ms...`,
        );
        await sleep(backoffMs);
        continue;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }

    if (res.ok) {
      let data: unknown;
      try {
        data = await readJsonWithLimit(res, 2 * 1024 * 1024);
      } catch {
        throw new Error("AI provider returned an unreadable response format.");
      }
      const choices = isRecord(data) && Array.isArray(data.choices) ? data.choices : [];
      const choice = isRecord(choices[0]) ? choices[0] : undefined;
      const message = choice && isRecord(choice.message) ? choice.message : undefined;
      const text = message && typeof message.content === "string" ? message.content : "";
      const finishReason =
        choice && typeof choice.finish_reason === "string" ? choice.finish_reason : "stop";
      const rawUsage = isRecord(data) && isRecord(data.usage) ? data.usage : undefined;
      const usage = rawUsage
        ? {
            promptTokens: asFiniteNumber(rawUsage.prompt_tokens),
            completionTokens: asFiniteNumber(rawUsage.completion_tokens),
            totalTokens: asFiniteNumber(rawUsage.total_tokens),
          }
        : undefined;

      if (!text.trim()) {
        throw new Error("AI provider returned an empty response.");
      }

      return { text, finishReason, usage, model };
    }

    // Parse provider error response
    let errorMessage = `AI request failed (HTTP ${res.status})`;
    try {
      const errData: unknown = await readJsonWithLimit(res, 256 * 1024);
      const inner = isRecord(errData) ? errData.error : undefined;
      if (typeof inner === "string") errorMessage = inner;
      else if (isRecord(inner) && typeof inner.message === "string") errorMessage = inner.message;
      else if (isRecord(errData) && typeof errData.message === "string") {
        errorMessage = errData.message;
      }
    } catch {
      // Keep default status message
    }

    // Handle rate limits (429) & transient server errors (500, 502, 503)
    const isRetryable =
      res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503;
    const retryLimit = res.status === 429 ? Math.min(maxRetries, 1) : maxRetries;
    if (isRetryable && attempt <= retryLimit) {
      const retryAfter =
        parseRetryAfter(res.headers.get("retry-after")) ?? parseRetryAfterMessage(errorMessage);
      const backoffMs = retryAfter ?? Math.min(800 * Math.pow(2, attempt - 1), 5000);
      console.warn(
        `[ai-client] Retryable error (${res.status}: ${errorMessage}). Retrying in ${backoffMs}ms...`,
      );
      await sleep(backoffMs);
      continue;
    }

    const err = new Error(errorMessage) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
}
