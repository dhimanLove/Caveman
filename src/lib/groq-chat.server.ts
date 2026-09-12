/**
 * High-speed OpenAI-compatible chat completions client for Groq, Google Gemini, and OpenAI.
 */

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
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 10000);
  return undefined;
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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);

      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch (err: unknown) {
      if (attempt <= maxRetries) {
        const backoffMs = 500 * Math.pow(2, attempt - 1);
        console.warn(
          `[ai-client] network error on attempt ${attempt}: ${(err as Error)?.message}. Retrying in ${backoffMs}ms...`,
        );
        await sleep(backoffMs);
        continue;
      }
      throw err;
    }

    if (res.ok) {
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("AI provider returned an unreadable response format.");
      }
      const choice = data?.choices?.[0];
      const text = choice?.message?.content ?? "";
      const finishReason: string = choice?.finish_reason ?? "stop";
      const usage = data?.usage
        ? {
            promptTokens: Number(data.usage.prompt_tokens ?? 0),
            completionTokens: Number(data.usage.completion_tokens ?? 0),
            totalTokens: Number(data.usage.total_tokens ?? 0),
          }
        : undefined;

      return { text, finishReason, usage, model };
    }

    // Parse provider error response
    let errorMessage = `AI request failed (HTTP ${res.status})`;
    try {
      const errData = await res.json();
      const inner = errData?.error;
      if (typeof inner === "string") errorMessage = inner;
      else if (inner?.message) errorMessage = inner.message;
      else if (errData?.message) errorMessage = errData.message;
    } catch {
      // Keep default status message
    }

    // Handle rate limits (429) & transient server errors (500, 502, 503)
    const isRetryable =
      res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503;
    if (isRetryable && attempt <= maxRetries) {
      const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
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
