import { defineConfig, loadEnv } from "vite";
import type { ConfigEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

// Standalone replacement for the former @lovable.dev/vite-tanstack-config
// wrapper. Reproduces the same defaults this app relied on:
//   - tanstackStart (TanStack Start SSR, bundled server entry -> src/server.ts)
//   - @vitejs/plugin-react + @tailwindcss/vite
//   - nitro (build-only, cloudflare-module default preset, matching the
//     deployed runtime; NITRO_PRESET overrides still win via auto-detect)
//   - VITE_* env injection, `@` -> src alias, React/TanStack dedupe,
//     prebundling of react/react-dom, lightningcss, dev server on port 8080.
export default defineConfig((env: ConfigEnv) => {
  const { command, mode } = env;

  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins = [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
  ];

  if (command === "build") {
    plugins.push(nitro({ defaultPreset: "cloudflare-module" }));
  }

  return {
    define: envDefine,
    css: { transformer: "lightningcss" as const },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      tsconfigPaths: true,
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    build: {
      rolldownOptions: {
        output: {
          // Split the heavy client libraries into dedicated, immutable-cacheable
          // vendor chunks so each route loads only what it needs and long-lived
          // shareable code stays cached across deploys (gsap, framer-motion, firebase).
          codeSplitting: {
            groups: [
              {
                name: "gsap",
                test: /[\\/]node_modules[\\/]gsap[\\/]/,
              },
              {
                name: "framer-motion",
                test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              },
              {
                name: "firebase",
                test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              },
            ],
          },
        },
      },
    },
  };
});
