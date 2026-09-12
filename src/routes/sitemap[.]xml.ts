import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { isSameOrigin } from "@/lib/request-guard.server";

const BASE_URL = "https://caveman-lilac.vercel.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Same-origin guard. Crawler/browser GETs omit Origin and pass; a
        // cross-origin client scraping the endpoint is rejected.
        if (!isSameOrigin()) {
          return new Response("Forbidden", { status: 403 });
        }
        const entries = [
          { path: "/", changefreq: "monthly", priority: "1.0" },
          { path: "/generate", changefreq: "weekly", priority: "0.9" },
          { path: "/graph", changefreq: "monthly", priority: "0.7" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
        ];
        const urls = entries.map(
          (e) =>
            `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
        );
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
