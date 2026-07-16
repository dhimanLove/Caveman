export async function verifyFirebaseToken(idToken: string): Promise<string> {
  const apiKey = "AIzaSyCFwxBgzmmJHGzdSHAv0MBfKVBNHe9K4Bo";

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body.includes("TOKEN_EXPIRED") ? "Token expired" : "Invalid token");
  }

  const data = await res.json();
  const users = data.users;
  if (!users || users.length === 0) {
    throw new Error("No user found for token");
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

export function sanitizeOutput(text: string): string {
  return text.replace(SCRIPT_TAG_RE, "").replace(JAVASCRIPT_PROTO_RE, "");
}
