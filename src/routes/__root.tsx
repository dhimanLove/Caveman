import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SmoothScroll } from "../components/layout/SmoothScroll";
import { EarlyAccessBanner } from "../components/layout/EarlyAccessBanner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        <img
          src="/logo-256.png"
          alt="Caveman logo"
          className="w-16 h-16 mx-auto rounded-[4px] border border-bone bg-paper object-contain p-1"
        />
        <h1 className="mt-6 text-7xl font-light text-ink" style={{ fontFamily: "var(--font-relative)" }}>
          404
        </h1>
        <h2 className="mt-4 text-xl font-light text-ink">Page not found</h2>
        <p className="mt-2 text-sm text-fog">The page you are looking for does not exist.</p>
        <div className="mt-6">
          <Link to="/" className="btn-primary">
            Go home
          </Link>
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
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-light text-ink">This page did not load</h1>
        <p className="mt-2 text-sm text-fog">Something went wrong on our end.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary"
          >
            Try again
          </button>
          <a href="/" className="btn-outline">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Caveman",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web Browser",
      url: "https://caveman-lilac.vercel.app",
      description:
        "AI-powered README generator for developers. Generate professional, accurate documentation from GitHub URLs or project descriptions. Caveman deep-scans source code to write READMEs that match your actual architecture.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "128" },
      featureList: [
        "Deep code analysis",
        "Stack auto-detection",
        "17+ customizable sections",
        "Tone and style control",
        "Package manager detection",
      ],
    },
    {
      "@type": "Organization",
      name: "Caveman",
      url: "https://caveman-lilac.vercel.app",
      logo: "https://caveman-lilac.vercel.app/og-image.png",
      contactPoint: {
        "@type": "ContactPoint",
        email: "hello@caveman.dev",
        contactType: "customer support",
      },
    },
    {
      "@type": "WebSite",
      name: "Caveman - AI README Generator",
      url: "https://caveman-lilac.vercel.app",
      description:
        "Generate production-ready README files in seconds. Paste a GitHub URL or describe your project - Caveman writes documentation your users will actually read.",
      inLanguage: "en",
    },
  ],
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Caveman - AI-Powered README Generator from GitHub Repos" },
      {
        name: "description",
        content:
          "Generate professional, structured README files in seconds. Paste your GitHub URL or describe your project - Caveman reads your source code and writes docs your users will actually read.",
      },
      { name: "author", content: "Caveman" },
      {
        name: "keywords",
        content:
          "AI README generator, GitHub documentation, auto generate README, developer tools, AI coding assistant, semantic code analysis, README.md generator",
      },
      { property: "og:title", content: "Caveman - AI-Powered README Generator" },
      {
        property: "og:description",
        content:
          "Stop procrastinating on documentation. Paste your repo URL and get a polished, accurate README in seconds.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Caveman" },
      { property: "og:url", content: "https://caveman-lilac.vercel.app" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Caveman - AI README Generator" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#F5F0FF" },
    ],
    links: [
      { rel: "preconnect", href: "https://api.fontshare.com" },
      {
        rel: "stylesheet",
        href: "https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
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
  const location = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <EarlyAccessBanner />
      <SmoothScroll>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </SmoothScroll>
    </QueryClientProvider>
  );
}
