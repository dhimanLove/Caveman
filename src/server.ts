import "./shared/lib/error-capture";

import { consumeLastCapturedError } from "./shared/lib/error-capture";
import { renderErrorPage } from "./shared/lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} - try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.gstatic.com https://www.google.com https://www.recaptcha.net; style-src 'self' 'unsafe-inline' https://api.fontshare.com; font-src 'self' https://api.fontshare.com https://cdn.fontshare.com https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://api.github.com https://raw.githubusercontent.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://api.groq.com https://www.google-analytics.com https://*.google-analytics.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net; frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://www.google.com https://www.recaptcha.net; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }));
    }
  },
};
