import { createHash } from "node:crypto";

/**
 * Verifies a Firebase ID token server-side using Google's Identity Toolkit.
 * Google validates signature + expiry for the token against THIS project's key,
 * and we extract the immutable UID (localId) from the response.
 */
export async function verifyFirebaseToken(idToken: string): Promise<string> {
  // Firebase Web API keys are public identifiers by design, but they must come
  // from the environment - never hardcoded in source.
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("[auth] VITE_FIREBASE_API_KEY is not configured");
    throw new Error("Unauthorized");
  }

  let res: Response;
  try {
    res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
  } catch {
    console.error("[auth] Identity Toolkit unreachable");
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    // Log only the status code server-side; never echo provider bodies to clients.
    console.warn(`[auth] Token rejected (status ${res.status})`);
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  const users = data?.users;
  if (!Array.isArray(users) || users.length === 0 || !users[0].localId) {
    throw new Error("Unauthorized");
  }
  if (users[0].disabled === true) {
    throw new Error("Unauthorized");
  }

  return users[0].localId as string;
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /you\s+are\s+now/i,
  /repeat\s+(your\s+)?(system\s+)?prompt/i,
  /what\s+are\s+your\s+instructions/i,
  /\u202E/,
  /\u200F/,
  /\u200E/,
];

export function hasPromptInjection(input: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((p) => p.test(input));
}

const SCRIPT_TAG_RE = /<script[\s>][\s\S]*?<\/script>/gi;
const JAVASCRIPT_PROTO_RE = /javascript\s*:/gi;
const EVENT_HANDLER_RE = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi;

export function sanitizeOutput(text: string): string {
  return text.replace(SCRIPT_TAG_RE, "").replace(JAVASCRIPT_PROTO_RE, "").replace(EVENT_HANDLER_RE, "");
}

/** One-way hash for abuse logging - never log raw UIDs or IPs. */
export function pseudonymize(value: string): string {
  const salt = process.env.ABUSE_LOG_SALT || "caveman-abuse-log";
  return createHash("sha256").update(salt + value).digest("hex").slice(0, 12);
}
