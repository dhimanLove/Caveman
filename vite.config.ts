// @lovable.dev/vite-tanstack-config already includes the following - do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { ConfigEnv } from "vite";

// The lovable config factory always pushes `vite-tsconfig-paths`. Since Vite 8
// resolves tsconfig paths natively, we drop that plugin (which silences the
// "The plugin vite-tsconfig-paths is detected..." warning) and enable the
// native resolve.tsconfigPaths option in its place.
const base = defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

export default async (env: ConfigEnv) => {
  const config = await base(env);
  config.plugins = (config.plugins ?? []).filter(
    (plugin) =>
      !(
        plugin &&
        typeof plugin === "object" &&
        (plugin as { name?: string }).name === "vite-tsconfig-paths"
      ),
  );
  config.resolve = {
    ...config.resolve,
    tsconfigPaths: true,
  };
  // Split the heavy client libraries into dedicated, immutable-cacheable
  // vendor chunks so each route loads only what it needs and long-lived
  // shareable code stays cached across deploys (gsap, framer-motion, firebase).
  config.build = {
    ...config.build,
    rolldownOptions: {
      ...config.build?.rolldownOptions,
      output: {
        ...config.build?.rolldownOptions?.output,
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
  };
  return config;
};
