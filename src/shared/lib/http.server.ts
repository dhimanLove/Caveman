/**
 * Small server-side HTTP helpers shared by repository and identity providers.
 * Every outbound request gets a bounded lifetime so a slow upstream cannot
 * hold a generation slot open indefinitely.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 5_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new Error(`Upstream request timed out after ${timeoutMs}ms.`);
    }
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    clearTimeout(timer);
  }
}

/** Read an upstream body without allowing a remote response to grow memory
 * without bound. All server-side callers handling attacker-selectable remote
 * content should use this helper instead of response.text()/response.json(). */
export async function readResponseTextWithLimit(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get("content-length");
  const advertisedLength = contentLength ? Number(contentLength) : NaN;
  if (Number.isFinite(advertisedLength) && advertisedLength > maxBytes) {
    throw new Error("Upstream response exceeded the configured size limit.");
  }

  const body = response.body;
  if (!body) throw new Error("Upstream response did not provide a readable body.");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("Upstream response exceeded the configured size limit.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function readJsonWithLimit<T>(response: Response, maxBytes: number): Promise<T> {
  return JSON.parse(await readResponseTextWithLimit(response, maxBytes)) as T;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
