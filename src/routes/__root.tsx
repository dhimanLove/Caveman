import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SmoothScroll } from "../components/layout/SmoothScroll";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-warm px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl text-spruce-900" style={{ fontWeight: 475 }}>404</h1>
        <h2 className="mt-4 text-xl text-spruce-900">Page not found</h2>
        <p className="mt-2 text-sm text-spruce-mist">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-pill-primary">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-warm px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl text-spruce-900">This page didn't load</h1>
        <p className="mt-2 text-sm text-spruce-mist">Something went wrong on our end.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="btn-pill-primary"
          >
            Try again
          </button>
          <a href="/" className="btn-pill-secondary text-spruce-900">Go home</a>
        </div>
      </div>
    </div>
  );
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Caveman",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web Browser",
  description: "AI-powered README generator for developers. Generate professional documentation from GitHub URLs or project descriptions.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Caveman — AI README Generator for Developers" },
      {
        name: "description",
        content:
          "Generate professional, structured README files in seconds. Paste your GitHub URL or describe your project — Caveman writes docs your users will actually read.",
      },
      { name: "author", content: "Caveman" },
      { property: "og:title", content: "Caveman — AI README Generator for Developers" },
      {
        property: "og:description",
        content: "Stop procrastinating on documentation. Paste your repo URL and get a polished README in seconds.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Caveman" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Caveman — AI README Generator" },
      { name: "twitter:description", content: "Generate professional README files in seconds with AI." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(jsonLd),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <SmoothScroll>
        <Outlet />
      </SmoothScroll>
    </QueryClientProvider>
  );
}
