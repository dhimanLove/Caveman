import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const Input = z.object({
  projectUrl: z.string().optional().default(""),
  description: z.string().optional().default(""),
  style: z.enum(["minimal", "standard", "comprehensive"]).default("standard"),
  sections: z.array(z.string()).default(["Installation", "Usage", "License"]),
  tone: z.enum(["technical", "friendly", "enterprise"]).default("technical"),
});

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\/+/, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

type GitHubContentItem = {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
};

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "caveman-readme",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token && token.length > 10) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchRepoFile(owner: string, repo: string, path: string): Promise<string | null> {
  const branches = ["main", "master"];
  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 403 || res.status === 429) continue;
      if (res.ok) return await res.text();
    } catch {
      continue;
    }
  }
  return null;
}

async function listDir(
  owner: string,
  repo: string,
  path: string,
  branch = "main",
): Promise<GitHubContentItem[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: getGitHubHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 403 || res.status === 429) {
      console.warn(`[listDir] Rate limited listing ${path}`);
      return [];
    }
    if (res.status === 404) return [];
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      download_url: item.download_url,
    }));
  } catch {
    return [];
  }
}

async function buildRepoTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<{ tree: string; fetchedFiles: Map<string, string>; packageManager: string }> {
  const fetchedFiles = new Map<string, string>();
  const treeLines: string[] = [];
  const maxFiles = 50;

  const rootItems = await listDir(owner, repo, "", branch);

  // Detect package manager from lockfiles
  let packageManager = "npm";
  const fileNames = rootItems.filter((i) => i.type === "file").map((i) => i.name);
  if (fileNames.includes("pnpm-lock.yaml")) packageManager = "pnpm";
  else if (fileNames.includes("yarn.lock")) packageManager = "yarn";
  else if (fileNames.includes("bun.lockb") || fileNames.includes("bun.lock"))
    packageManager = "bun";

  const allItems: GitHubContentItem[] = [...rootItems];
  const excludeDirs = new Set([
    "node_modules",
    ".git",
    ".vscode",
    ".idea",
    "dist",
    "build",
    ".output",
    "coverage",
    "__pycache__",
    ".cache",
    ".turbo",
    ".next",
    ".nuxt",
  ]);
  const sourceDirNames = new Set([
    "src",
    "lib",
    "app",
    "pages",
    "components",
    "utils",
    "helpers",
    "hooks",
    "stores",
    "routes",
    "api",
    "core",
    "modules",
    "services",
    "config",
    "constants",
    "types",
    "interfaces",
  ]);

  for (const item of rootItems) {
    if (item.type !== "dir" || excludeDirs.has(item.name)) continue;
    const maxDepth = sourceDirNames.has(item.name) ? 3 : 2;
    let dirsToScan: GitHubContentItem[] = [item];
    for (let depth = 0; depth < maxDepth; depth++) {
      const nextDirs: GitHubContentItem[] = [];
      const scanPromises = dirsToScan.map(async (dir) => {
        const subItems = await listDir(owner, repo, dir.path, branch);
        allItems.push(...subItems);
        for (const sub of subItems) {
          if (sub.type === "dir" && !excludeDirs.has(sub.name)) {
            nextDirs.push(sub);
          }
        }
      });
      await Promise.allSettled(scanPromises);
      dirsToScan = nextDirs;
    }
  }

  treeLines.push(`${repo}/`);
  for (const item of allItems) {
    const depth = item.path.split("/").length - 1;
    const prefix = "  ".repeat(depth) + (item.type === "dir" ? "📁 " : "📄 ");
    treeLines.push(prefix + item.name);
  }

  const importantExtensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".html",
    ".css",
    ".py",
    ".go",
    ".rs",
    ".yml",
    ".yaml",
    ".toml",
    ".cfg",
    ".ini",
    ".md",
  ];
  const entryPointNames = new Set([
    "main.tsx",
    "main.ts",
    "main.jsx",
    "main.js",
    "index.tsx",
    "index.ts",
    "index.jsx",
    "index.js",
    "App.tsx",
    "App.ts",
    "App.jsx",
    "App.js",
    "app.tsx",
    "app.ts",
    "root.tsx",
    "root.ts",
    "layout.tsx",
    "layout.ts",
    "router.tsx",
    "router.ts",
    "routes.tsx",
    "routes.ts",
    "page.tsx",
    "page.ts",
    "entry-client.tsx",
    "entry-server.tsx",
    "_app.tsx",
    "_app.ts",
    "404.tsx",
    "500.tsx",
    "error.tsx",
    "loading.tsx",
  ]);
  const configFileNames = new Set([
    "package.json",
    "tsconfig.json",
    "index.html",
    "vite.config.ts",
    "vite.config.js",
    "next.config.js",
    "next.config.mjs",
    "astro.config.mjs",
    "nuxt.config.ts",
    "tailwind.config.ts",
    "tailwind.config.js",
    "postcss.config.js",
    ".env.example",
    "Dockerfile",
    "docker-compose.yml",
    "composer.json",
    "Cargo.toml",
    "go.mod",
    "Gemfile",
    "Makefile",
  ]);

  const files = allItems
    .filter((i) => i.type === "file")
    .filter((i) => importantExtensions.some((ext) => i.name.endsWith(ext)))
    .filter((i) => !i.name.startsWith(".") || i.name === ".env.example");

  files.sort((a, b) => {
    const aIsEntry = entryPointNames.has(a.name) ? 0 : 1;
    const bIsEntry = entryPointNames.has(b.name) ? 0 : 1;
    if (aIsEntry !== bIsEntry) return aIsEntry - bIsEntry;
    const aIsConfig = configFileNames.has(a.name) ? 0 : 1;
    const bIsConfig = configFileNames.has(b.name) ? 0 : 1;
    if (aIsConfig !== bIsConfig) return aIsConfig - bIsConfig;
    const aInSrc =
      a.path.startsWith("src/") || a.path.startsWith("app/") || a.path.startsWith("lib/") ? 0 : 1;
    const bInSrc =
      b.path.startsWith("src/") || b.path.startsWith("app/") || b.path.startsWith("lib/") ? 0 : 1;
    if (aInSrc !== bInSrc) return aInSrc - bInSrc;
    return 0;
  });

  const filesToFetch = files.slice(0, maxFiles);
  const results = await Promise.allSettled(
    filesToFetch.map((f) =>
      fetchRepoFile(owner, repo, f.path).then((text) => ({ path: f.path, text })),
    ),
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value.text) {
      fetchedFiles.set(r.value.path, r.value.text);
    }
  }

  return { tree: treeLines.join("\n"), fetchedFiles, packageManager };
}

function parsePackageJson(text: string) {
  try {
    const pkg = JSON.parse(text);
    return {
      name: pkg.name || "",
      description: pkg.description || "",
      version: pkg.version || "",
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
      scripts: Object.keys(pkg.scripts || {}),
      allDeps: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})],
    };
  } catch {
    return null;
  }
}

function detectStack(allDeps: string[]): string[] {
  const lowerDeps = allDeps.map((d) => d.toLowerCase());

  const stackMap: Record<string, string[]> = {
    React: ["react", "react-dom", "remix", "react-router", "@tanstack/react-router"],
    Vue: ["vue", "nuxt", "vue-router", "pinia", "vuex"],
    Angular: ["@angular/core", "@angular/cli"],
    Svelte: ["svelte", "sveltekit"],
    Solid: ["solid-js"],
    Qwik: ["@builder.io/qwik"],
    "Node.js": ["express", "fastify", "nestjs", "@nestjs/core"],
    TypeScript: ["typescript", "ts-node", "@typescript-eslint"],
    "Tailwind CSS": ["tailwindcss", "@tailwindcss"],
    Prisma: ["prisma", "@prisma/client"],
    Drizzle: ["drizzle-orm", "drizzle-kit"],
    PostgreSQL: ["pg", "postgres", "postgresql", "sequelize", "typeorm"],
    MongoDB: ["mongodb", "mongoose"],
    Redis: ["redis", "ioredis"],
    Docker: ["docker-compose"],
    GraphQL: ["graphql", "apollo-server", "@apollo/client"],
    Vite: ["vite", "@vitejs"],
    "Next.js": ["next"],
    Express: ["express"],
    Fastify: ["fastify"],
    tRPC: ["@trpc/server", "@trpc/client", "@trpc/react-query", "@trpc", "trpc"],
    Zod: ["zod"],
    zustand: ["zustand"],
    "React Query": ["@tanstack/react-query"],
    "Framer Motion": ["framer-motion"],
    "shadcn/ui": [
      "@radix-ui",
      "lucide-react",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
    ],
    Supabase: ["@supabase/supabase-js", "@supabase/auth-helpers-nextjs"],
    Clerk: ["@clerk/nextjs", "@clerk/clerk-react"],
    Stripe: ["stripe", "@stripe/stripe-js"],
    GSAP: ["gsap"],
    Astro: ["astro"],
  };

  const exactMatch: Record<string, string[]> = {
    "Next.js": ["next"],
  };

  const detected: string[] = [];

  for (const [name, keywords] of Object.entries(stackMap)) {
    if (keywords.some((kw) => lowerDeps.some((d) => d.includes(kw.toLowerCase())))) {
      detected.push(name);
    }
  }

  // Exact match to remove false positives from substring matching
  for (const [name, keywords] of Object.entries(exactMatch)) {
    if (
      keywords.some((kw) =>
        lowerDeps.some((d) => d === kw.toLowerCase() || d.startsWith(kw.toLowerCase() + "/")),
      )
    ) {
      if (!detected.includes(name)) detected.push(name);
    }
  }

  // Deduplicate
  return [...new Set(detected)];
}

export const generateReadme = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.GENERATIVE_KEY;
    if (!key) {
      throw new Error("Missing GENERATIVE_KEY. Add your API key to the .env file.");
    }
    if (!data.projectUrl && !data.description) {
      throw new Error("Provide a GitHub URL or a project description.");
    }

    let repoInfo = {
      title: "",
      description: "",
      version: "",
      dependencies: [] as string[],
      devDependencies: [] as string[],
      allDeps: [] as string[],
      packageJsonRaw: "",
      existingReadme: "",
      owner: "",
      repo: "",
      packageManager: "npm",
    };

    let htmlTitle = "",
      htmlDescription = "",
      tsconfigTarget = "",
      tsconfigJsx = "";
    let repoTree = "";
    let fetchedFiles = new Map<string, string>();

    const repo = parseRepoUrl(data.projectUrl);
    if (repo) {
      repoInfo.owner = repo.owner;
      repoInfo.repo = repo.repo;
      repoInfo.title = repo.repo.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      const scan = await buildRepoTree(repo.owner, repo.repo, "main");
      repoTree = scan.tree;
      fetchedFiles = scan.fetchedFiles;
      repoInfo.packageManager = scan.packageManager;

      const pkgText = fetchedFiles.get("package.json") ?? null;
      if (pkgText) {
        repoInfo.packageJsonRaw = pkgText;
        const parsed = parsePackageJson(pkgText);
        if (parsed) {
          repoInfo.description = parsed.description || "";
          repoInfo.version = parsed.version;
          repoInfo.dependencies = parsed.dependencies;
          repoInfo.devDependencies = parsed.devDependencies;
          repoInfo.allDeps = parsed.allDeps;
        }
      }

      const readmeText = fetchedFiles.get("README.md") ?? null;
      if (readmeText) repoInfo.existingReadme = readmeText.slice(0, 3000);

      const indexHtml = fetchedFiles.get("index.html") ?? null;
      if (indexHtml) {
        const titleMatch = indexHtml.match(/<title>([^<]*)<\/title>/i);
        if (titleMatch) htmlTitle = titleMatch[1];
        const descMatch = indexHtml.match(
          /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
        );
        if (descMatch) htmlDescription = descMatch[1];
      }

      const tsconfigText = fetchedFiles.get("tsconfig.json") ?? null;
      if (tsconfigText) {
        try {
          const tsconfig = JSON.parse(tsconfigText);
          tsconfigTarget = tsconfig.compilerOptions?.target || "";
          tsconfigJsx = tsconfig.compilerOptions?.jsx || "";
        } catch {}
      }
    }

    const projectDesc = repoInfo.description || htmlDescription || data.description || "";
    const projectTitle =
      repoInfo.title ||
      htmlTitle ||
      (data.description ? data.description.split("\n")[0].replace(/^#\s*/, "").trim() : "Project");

    const detectedStack = repoInfo.allDeps.length > 0 ? detectStack(repoInfo.allDeps) : [];
    const hasJsx = detectedStack.includes("React") || tsconfigJsx.toLowerCase().includes("react");
    const sourceFileCount = Array.from(fetchedFiles.keys()).length;

    const discovery = {
      inferredTitle: projectTitle,
      inferredDescription: projectDesc,
      detectedStack: detectedStack.slice(0, 10),
      fileCount: sourceFileCount,
      componentCount: hasJsx ? Math.max(Math.floor(sourceFileCount * 0.6), 3) : 0,
      apiRoutes: detectedStack.some((s) => ["Node.js", "Next.js", "Express", "Fastify"].includes(s))
        ? Math.max(Math.floor(sourceFileCount * 0.3), 1)
        : 0,
      databaseModels: detectedStack.some((s) =>
        ["PostgreSQL", "MongoDB", "Prisma", "Drizzle"].includes(s),
      )
        ? Math.max(Math.floor(sourceFileCount * 0.2), 1)
        : 0,
    };

    const contextParts: string[] = [];

    if (repo) {
      contextParts.push(`GitHub repository: ${repo.owner}/${repo.repo}`);
      contextParts.push(`Clone URL: https://github.com/${repo.owner}/${repo.repo}.git`);
      contextParts.push(`Package manager: ${repoInfo.packageManager}`);
    }
    if (projectTitle) contextParts.push(`Project name: ${projectTitle}`);
    if (projectDesc) contextParts.push(`Description: ${projectDesc}`);
    if (repoInfo.version) contextParts.push(`Version: ${repoInfo.version}`);
    if (repoInfo.allDeps.length > 0)
      contextParts.push(`Dependencies: ${repoInfo.allDeps.join(", ")}`);
    if (detectedStack.length > 0)
      contextParts.push(`Detected tech stack: ${detectedStack.join(", ")}`);
    if (htmlTitle) contextParts.push(`HTML page title: ${htmlTitle}`);
    if (htmlDescription) contextParts.push(`HTML meta description: ${htmlDescription}`);
    if (tsconfigTarget || tsconfigJsx)
      contextParts.push(
        `TypeScript config - target: ${tsconfigTarget || "not set"}, jsx: ${tsconfigJsx || "not set"}`,
      );

    if (repoTree) contextParts.push(`Repository file tree:\n\`\`\`\n${repoTree}\n\`\`\``);

    if (fetchedFiles.size > 0) {
      const sourceContext: string[] = [];
      const priorityOrder = [
        "package.json",
        "tsconfig.json",
        "index.html",
        "vite.config.ts",
        "vite.config.js",
        "next.config.js",
        "next.config.mjs",
        "astro.config.mjs",
        "nuxt.config.ts",
        "tailwind.config.ts",
        "tailwind.config.js",
        "postcss.config.js",
        ".env.example",
        "Dockerfile",
        "docker-compose.yml",
      ];

      for (const name of priorityOrder) {
        if (fetchedFiles.has(name)) {
          const content = fetchedFiles.get(name)!;
          const lang = name.endsWith(".json")
            ? "json"
            : name.endsWith(".ts") ||
                name.endsWith(".tsx") ||
                name.endsWith(".js") ||
                name.endsWith(".jsx")
              ? "ts"
              : name.endsWith(".yml") || name.endsWith(".yaml")
                ? "yaml"
                : "text";
          sourceContext.push(`\`${name}\`:\n\`\`\`${lang}\n${content.slice(0, 3500)}\n\`\`\``);
          fetchedFiles.delete(name);
        }
      }

      let extraCount = 0;
      for (const [path, content] of fetchedFiles) {
        if (extraCount >= 25) break;
        if (
          path.match(
            /^(src|lib|app|pages|components|hooks|utils|stores|routes|api|modules|services|config|types)\//,
          )
        ) {
          const lang =
            path.endsWith(".tsx") || path.endsWith(".ts")
              ? "tsx"
              : path.endsWith(".jsx")
                ? "jsx"
                : path.endsWith(".js")
                  ? "js"
                  : path.endsWith(".css")
                    ? "css"
                    : "text";
          sourceContext.push(`\`${path}\`:\n\`\`\`${lang}\n${content.slice(0, 5000)}\n\`\`\``);
          extraCount++;
        }
      }

      if (sourceContext.length > 0) {
        contextParts.push(`Source files:\n${sourceContext.join("\n\n")}`);
      }
    }

    if (repoInfo.packageJsonRaw && !contextParts.some((p) => p.startsWith("Dependencies:"))) {
      contextParts.push(`package.json:\n\`\`\`json\n${repoInfo.packageJsonRaw}\n\`\`\``);
    }
    if (repoInfo.existingReadme) {
      contextParts.push(`Existing README:\n${repoInfo.existingReadme}`);
    }
    if (data.description && !repo) {
      contextParts.push(`User-provided description:\n${data.description}`);
    }

    const contextBlock = contextParts.join("\n\n");

    const styleGuides = {
      minimal:
        "Ruthlessly concise. Every section is a few tight paragraphs with real substance. Omit anything a developer can infer. No filler.",
      standard:
        "Balanced and thorough. Each section has explanations, real code snippets, and concrete details. Production-quality open-source documentation.",
      comprehensive:
        "Deep documentation. Full API references, multiple code examples, configuration guides, architecture diagrams. Shipshape production quality.",
    };

    const toneGuides = {
      technical:
        "Precise and direct. Use domain terminology. Write like a senior engineer documenting their own architecture. Assume the reader can handle depth.",
      friendly:
        "Approachable but confident. Write like a maintainer who actually likes helping people. Clear language, not marketing fluff.",
      enterprise:
        "Formal and polished. Write for a professional audience evaluating the project for adoption. Complete sentences, structured sections.",
    };

    const prompt = `You are a senior technical writer who produces README files that look like they were written by a human maintainer, not a template.

# PROJECT CONTEXT
${contextBlock}

# README SPEC
- Style: ${styleGuides[data.style]}
- Tone: ${toneGuides[data.tone]}
- Required sections (in this order): ${data.sections.join(" → ")}

# QUALITY STANDARDS
- Project description that actually explains what this thing DOES and why it exists
- Real code examples showing the actual API surface, derived from source files in context
- A badge row with shields.io badges reflecting the detected tech stack
- Installation steps with the exact clone URL and package manager (${repoInfo.packageManager})
- Tech stack section explaining what each tool IS used for IN THIS PROJECT, not generic descriptions
- Features list derived from real file names and structure - concrete, not generic
- Folder structure matching the actual project tree from context
- Architecture explanation connecting the tech stack to the file layout
- Contributing guidelines that sound like they were written by a real person
- No AI disclaimers, no "I cannot", no "I don't have access"

# FORMAT
- Start with "# ${projectTitle}" - no preamble
- Use proper markdown fences with language tags
- Code examples must look real, not pseudocode
- Every section gets genuine content

# SEPARATOR
---METADATA---
After the README, add "---METADATA---" then this exact JSON (no fences):
${JSON.stringify({
  inferredTitle: projectTitle,
  inferredDescription: projectDesc,
  detectedStack: detectedStack,
  fileCount: discovery.fileCount,
  componentCount: discovery.componentCount,
  apiRoutes: discovery.apiRoutes,
  databaseModels: discovery.databaseModels,
})}`;

    try {
      let groq;
      try {
        const { createGroqProvider } = await import("./ai-gateway.server");
        groq = createGroqProvider(key);
      } catch (err) {
        console.error("[generateReadme] Failed to initialize AI provider:", err);
        throw new Error("AI provider initialization failed. Check GENERATIVE_KEY configuration.");
      }

      const model = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";

      let text: string;
      try {
        const result = await generateText({
          model: groq(model),
          prompt,
          temperature: 0.7,
        });
        text = result.text;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[generateReadme] AI generation failed:", message);
        if (message.includes("429") || message.includes("rate limit")) {
          throw new Error("AI rate limited. Try again in a moment.");
        }
        if (message.includes("timeout") || message.includes("timed out")) {
          throw new Error(
            "AI generation timed out. Your repo may be too large - try describing it instead.",
          );
        }
        if (
          message.includes("401") ||
          message.includes("unauthorized") ||
          message.includes("api key")
        ) {
          throw new Error("Invalid AI API key. Check your GENERATIVE_KEY environment variable.");
        }
        throw new Error(`Generation failed: ${message}`);
      }

      if (!text || text.trim().length < 10) {
        console.error("[generateReadme] AI returned empty or near-empty response");
        throw new Error("AI returned an empty response. Try again.");
      }

      let readme = text;
      let metaJson = "";
      const metaSep = "---METADATA---";
      const metaIdx = text.lastIndexOf(metaSep);
      if (metaIdx !== -1) {
        readme = text.slice(0, metaIdx).trim();
        metaJson = text.slice(metaIdx + metaSep.length).trim();
      } else {
        const fallbackMatch = text.match(/---\s*\n(\{[\s\S]*\})\s*$/);
        if (fallbackMatch) {
          readme = text.slice(0, fallbackMatch.index).trim();
          metaJson = fallbackMatch[1];
        }
      }

      metaJson = metaJson
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      if (!readme) {
        throw new Error("Generated README is empty. Try again.");
      }

      let parsedMeta = { ...discovery };
      if (metaJson) {
        try {
          const meta = JSON.parse(metaJson);
          parsedMeta = { ...parsedMeta, ...meta };
        } catch (e) {
          console.warn("[generateReadme] Failed to parse metadata JSON");
        }
      }

      return { readme, discovery: parsedMeta };
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error("An unexpected error occurred during README generation.");
    }
  });

const SECTION_GUIDES: Record<string, { label: string; prompt: string }> = {
  installation: {
    label: "Installation / Getting Started",
    prompt:
      "Write an Installation section with exact clone URL, cd, and install commands. Mention prerequisites (Node version, etc.) if inferrable from the repo. Include a note about environment setup if config files exist.",
  },
  usage: {
    label: "Usage / Examples",
    prompt:
      "Write a Usage section with real code examples - show imports, initialization, and a meaningful example of the core functionality. Use actual API names from the codebase if they appear in the context. Explain what the user will see or get back.",
  },
  api: {
    label: "API Documentation",
    prompt:
      "Write an API Documentation section. Document the main exports, key functions, components, types, or endpoints. Use a table for function signatures, parameters, and return values. Be specific - use real names from the codebase if visible in context.",
  },
  toc: {
    label: "Table of Contents",
    prompt:
      "Write a Table of Contents with anchor links to every major section in the README. Use a clean bullet list with inline markdown links.",
  },
  contributing: {
    label: "Contributing",
    prompt:
      "Write a Contributing section that covers: local dev setup, how to run tests, branch/PR workflow, and how to report bugs. Sound like a real maintainer who wants good contributions, not a legal document.",
  },
  license: {
    label: "License",
    prompt:
      "Write a License section stating the license (MIT by default, or whatever the package.json says). Add the standard boilerplate notice. Include the year and project name. Link to the LICENSE file.",
  },
  configuration: {
    label: "Configuration / Environment Variables",
    prompt:
      "Write a Configuration section listing environment variables, config files, or build options. Use a table with columns: variable name, description, default value, required? Derive from the codebase context if available.",
  },
};

export const generateSection = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        existingReadme: z.string(),
        sectionKey: z.string(),
        projectTitle: z.string(),
        projectDesc: z.string(),
        detectedStack: z.array(z.string()),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.GENERATIVE_KEY;
    if (!key) throw new Error("Missing GENERATIVE_KEY");

    const guide = SECTION_GUIDES[data.sectionKey];
    if (!guide) throw new Error(`Unknown section: ${data.sectionKey}`);

    const { createGroqProvider } = await import("./ai-gateway.server");
    const groq = createGroqProvider(key);
    const model = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";

    const prompt = `You are the original author of this project improving its README.

EXISTING README:
${data.existingReadme}

PROJECT:
${data.projectTitle} - ${data.projectDesc}
Stack: ${data.detectedStack.join(", ")}

TASK:
Write the missing section "## ${guide.label}" as if you built this project yourself.

${guide.prompt}

Make it read like a real section from a real README - specific, honest, technically accurate. Use code blocks, tables, or lists where they help.

FORMAT: Output only the section content starting with "## ${guide.label}". No preamble. No code fences around the output.`;

    const { text } = await generateText({
      model: groq(model),
      prompt,
      temperature: 0.7,
    });

    return { section: text.trim() };
  });
