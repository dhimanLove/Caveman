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

class GitHubError extends Error {
  constructor(message: string, public status?: number) { super(message); this.name = "GitHubError"; }
}
class RateLimitError extends Error {
  constructor() { super("GitHub API rate limit exceeded. Try again later."); this.name = "RateLimitError"; }
}
class NetworkError extends Error {
  constructor(cause: unknown) { super(`Network error: ${cause instanceof Error ? cause.message : "request failed"}`); this.name = "NetworkError"; }
}

async function fetchRepoFile(owner: string, repo: string, path: string): Promise<string | null> {
  const branches = ["main", "master"];
  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 403 || res.status === 429) {
        console.warn(`[fetchRepoFile] Rate limited fetching ${path} (${res.status})`);
        continue;
      }
      if (res.ok) return await res.text();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.warn(`[fetchRepoFile] Timeout fetching ${owner}/${repo}/${path}`);
        continue;
      }
      console.warn(`[fetchRepoFile] Error fetching ${path}:`, err instanceof Error ? err.message : err);
      continue;
    }
  }
  return null;
}

type GitHubContentItem = {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
};

async function listDir(owner: string, repo: string, path: string, branch = "main"): Promise<GitHubContentItem[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "caveman" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 403 || res.status === 429) {
      console.warn(`[listDir] Rate limited listing ${path} (${res.status})`);
      return [];
    }
    if (res.status === 404) {
      console.warn(`[listDir] Path not found: ${path}`);
      return [];
    }
    if (!res.ok) {
      console.warn(`[listDir] Unexpected status ${res.status} for ${path}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn(`[listDir] Expected array but got ${typeof data} for ${path}`);
      return [];
    }
    return data.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      download_url: item.download_url,
    }));
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`[listDir] Timeout listing ${owner}/${repo}/${path}`);
      return [];
    }
    console.warn(`[listDir] Error listing ${path}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function buildRepoTree(owner: string, repo: string, branch: string): Promise<{ tree: string; fetchedFiles: Map<string, string> }> {
  const fetchedFiles = new Map<string, string>();
  const treeLines: string[] = [];
  const batchSize = 14;

  const rootItems = await listDir(owner, repo, "", branch);

  // Collect all root items, then recurse into every source-like directory at root
  const allItems: GitHubContentItem[] = [...rootItems];
  const excludeDirs = new Set(["node_modules", ".git", ".vscode", ".idea", "dist", "build", ".output", "coverage", "__pycache__"]);

  for (const item of rootItems) {
    if (item.type !== "dir") continue;
    if (excludeDirs.has(item.name)) continue;
    // Scan up to 2 levels deep for source directories
    const subItems = await listDir(owner, repo, item.path, branch);
    allItems.push(...subItems);
    // Go one more level into subdirectories
    for (const sub of subItems) {
      if (sub.type !== "dir") continue;
      if (excludeDirs.has(sub.name)) continue;
      const deepItems = await listDir(owner, repo, sub.path, branch);
      allItems.push(...deepItems);
    }
  }

  // Build tree string
  treeLines.push(`${repo}/`);
  for (const item of allItems) {
    const depth = item.path.split("/").length - 1;
    const prefix = "  ".repeat(depth) + (item.type === "dir" ? "📁 " : "📄 ");
    treeLines.push(prefix + item.name);
  }

  // Fetch important files for content analysis
  const importantExtensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".css", ".py", ".go", ".rs", ".yml", ".yaml", ".toml", ".cfg", ".ini"];
  const filesToFetch = allItems
    .filter((i) => i.type === "file")
    .filter((i) => importantExtensions.some((ext) => i.name.endsWith(ext)))
    .filter((i) => !i.name.startsWith(".") || i.name === ".env.example")
    .slice(0, batchSize);

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

  return { tree: treeLines.join("\n"), fetchedFiles };
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
    React: [
      "react",
      "react-dom",
      "remix",
      "gatsby",
      "react-router",
      "@tanstack/react-router",
    ],
    Vue: ["vue", "nuxt", "vue-router", "pinia", "vuex"],
    Angular: ["@angular/core", "@angular/cli"],
    Svelte: ["svelte", "sveltekit"],
    "Node.js": ["express", "fastify", "koa", "hapi", "nestjs", "@nestjs/core"],
    TypeScript: ["typescript", "ts-node", "@typescript-eslint"],
    "Tailwind CSS": ["tailwindcss", "@tailwindcss"],
    Prisma: ["prisma", "@prisma/client"],
    PostgreSQL: ["pg", "postgres", "postgresql", "sequelize", "typeorm"],
    MongoDB: ["mongodb", "mongoose", "mongose"],
    Redis: ["redis", "ioredis"],
    Docker: ["docker", "docker-compose"],
    GraphQL: ["graphql", "apollo-server", "@apollo/client", "relay"],
    Vite: ["vite", "@vitejs"],
    "Next.js": ["next"],
    Express: ["express"],
    Fastify: ["fastify"],
    tRPC: ["@trpc", "trpc"],
    Zod: ["zod"],
    zustand: ["zustand"],
    "React Query": ["@tanstack/react-query"],
    "Framer Motion": ["framer-motion"],
    "shadcn/ui": ["@radix-ui", "lucide-react"],
    GSAP: ["gsap"],
    "Canvas API": [
      "fabric",
      "konva",
      "p5",
      "paper",
      "two.js",
      "roughjs",
      "excalidraw",
      "roughjs",
      "perfect-freehand",
    ],
  };

  const exactMatch: Record<string, string[]> = {
    "Next.js": ["next"],
  };

  const detected: string[] = [];

  // Use substring matching for most frameworks
  for (const [name, keywords] of Object.entries(stackMap)) {
    if (keywords.some((kw) => lowerDeps.some((d) => d.includes(kw.toLowerCase())))) {
      detected.push(name);
    }
  }

  // Use exact match for frameworks prone to false positives
  for (const [name, keywords] of Object.entries(exactMatch)) {
    if (keywords.some((kw) => lowerDeps.some((d) => d === kw.toLowerCase() || d.startsWith(kw.toLowerCase() + "/")))) {
      if (!detected.includes(name)) detected.push(name);
    }
  }

  // Detect canvas-based apps by peer dependencies or keywords
  const canvasKeywords = [
    "fabric",
    "konva",
    "p5",
    "paper.js",
    "two.js",
    "roughjs",
    "excalidraw",
    "perfect-freehand",
    "draw",
  ];
  if (
    !detected.includes("Canvas API") &&
    canvasKeywords.some((kw) => lowerDeps.some((d) => d.includes(kw)))
  ) {
    detected.push("Canvas API");
  }

  return detected;
}

export const generateReadme = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.GENERATIVE_KEY;
    if (!key) {
      throw new Error(
        "Missing GENERATIVE_KEY. Add your API key to the .env file in the project root.",
      );
    }
    if (!data.projectUrl && !data.description) {
      throw new Error("Provide a GitHub URL or a project description.");
    }

    // Fetch real data from GitHub
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
    };

    let htmlTitle = "";
    let htmlDescription = "";
    let tsconfigTarget = "";
    let tsconfigJsx = "";
    let repoTree = "";
    let fetchedFiles = new Map<string, string>();

    const repo = parseRepoUrl(data.projectUrl);
    if (repo) {
      repoInfo.owner = repo.owner;
      repoInfo.repo = repo.repo;
      repoInfo.title = repo.repo.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      // Deep scan: build file tree + fetch all important files
      const branch = "main";
      const scan = await buildRepoTree(repo.owner, repo.repo, branch);
      repoTree = scan.tree;
      fetchedFiles = scan.fetchedFiles;

      // Parse package.json if found
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

      // Check for existing README
      const readmeText = fetchedFiles.get("README.md") ?? null;
      if (readmeText) {
        repoInfo.existingReadme = readmeText.slice(0, 3000);
      }

      // Parse index.html
      const indexHtml = fetchedFiles.get("index.html") ?? null;
      if (indexHtml) {
        const titleMatch = indexHtml.match(/<title>([^<]*)<\/title>/i);
        if (titleMatch) htmlTitle = titleMatch[1];
        const descMatch = indexHtml.match(
          /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
        );
        if (descMatch) htmlDescription = descMatch[1];
      }

      // Parse tsconfig.json
      const tsconfigText = fetchedFiles.get("tsconfig.json") ?? null;
      if (tsconfigText) {
        try {
          const tsconfig = JSON.parse(tsconfigText);
          const compilerOptions = tsconfig.compilerOptions || {};
          tsconfigTarget = compilerOptions.target || "";
          tsconfigJsx = compilerOptions.jsx || "";
        } catch {
          // ignore parse errors
        }
      }
    }

    const projectDesc = repoInfo.description || htmlDescription || data.description || "";
    const projectTitle =
      repoInfo.title ||
      htmlTitle ||
      (data.description ? data.description.split("\n")[0].replace(/^#\s*/, "").trim() : "Project");

    // Detect real stack
    const detectedStack = repoInfo.allDeps.length > 0 ? detectStack(repoInfo.allDeps) : [];

    // Build discovery from real data
    const hasJsx =
      detectedStack.includes("React") ||
      tsconfigJsx.toLowerCase() === "react" ||
      tsconfigJsx.toLowerCase() === "react-jsx";
    const allSourceFiles = Array.from(fetchedFiles.keys());
    const sourceFileCount = allSourceFiles.length;
    const componentEstimate = hasJsx ? Math.max(Math.floor(sourceFileCount * 0.6), 3) : 0;
    const hasApi = detectedStack.some((s) =>
      ["Node.js", "Express", "Fastify", "Next.js"].includes(s),
    );
    const hasDatabase = detectedStack.some((s) =>
      ["PostgreSQL", "MongoDB", "Redis", "Prisma"].includes(s),
    );

    const discovery = {
      inferredTitle: projectTitle,
      inferredDescription: projectDesc,
      detectedStack: detectedStack.length > 0 ? detectedStack.slice(0, 10) : [],
      fileCount: sourceFileCount,
      componentCount: componentEstimate,
      apiRoutes: hasApi ? Math.max(Math.floor(sourceFileCount * 0.3), 1) : 0,
      databaseModels: hasDatabase ? Math.max(Math.floor(sourceFileCount * 0.2), 1) : 0,
    };

    // Build context with all scanned data for deep AI analysis
    const contextParts: string[] = [];

    if (repo) {
      contextParts.push(`GitHub repository: ${repo.owner}/${repo.repo}`);
      contextParts.push(`Clone URL: https://github.com/${repo.owner}/${repo.repo}.git`);
    }
    if (projectTitle) {
      contextParts.push(`Project name: ${projectTitle}`);
    }
    if (projectDesc) {
      contextParts.push(`Description: ${projectDesc}`);
    }
    if (repoInfo.version) {
      contextParts.push(`Version: ${repoInfo.version}`);
    }
    if (repoInfo.allDeps.length > 0) {
      contextParts.push(`Dependencies (from package.json): ${repoInfo.allDeps.join(", ")}`);
    }
    if (detectedStack.length > 0) {
      contextParts.push(`Detected tech stack: ${detectedStack.join(", ")}`);
    }
    if (htmlTitle) {
      contextParts.push(`HTML page title: ${htmlTitle}`);
    }
    if (htmlDescription) {
      contextParts.push(`HTML meta description: ${htmlDescription}`);
    }
    if (tsconfigTarget || tsconfigJsx) {
      contextParts.push(
        `TypeScript config — target: ${tsconfigTarget || "not set"}, jsx: ${tsconfigJsx || "not set"}`,
      );
    }

    // Include the full repo file tree for structure understanding
    if (repoTree) {
      contextParts.push(`Repository file tree:\n\`\`\`\n${repoTree}\n\`\`\``);
    }

    // Include key source files (limit to avoid token overflow, prioritize most important)
    if (fetchedFiles.size > 0) {
      const sourceContext: string[] = [];
      const priorityOrder = [
        "package.json", "tsconfig.json", "index.html", "vite.config.ts", "vite.config.js",
        "next.config.js", "next.config.mjs", "astro.config.mjs", "nuxt.config.ts",
        "tailwind.config.ts", "tailwind.config.js", "postcss.config.js", ".env.example",
        "Dockerfile", "docker-compose.yml",
      ];
      // First add priority config files
      for (const name of priorityOrder) {
        if (fetchedFiles.has(name)) {
          const content = fetchedFiles.get(name)!;
          const lang = name.endsWith(".json") ? "json" : name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".js") || name.endsWith(".jsx") ? "ts" : name.endsWith(".yml") || name.endsWith(".yaml") ? "yaml" : "text";
          sourceContext.push(`\`${name}\`:\n\`\`\`${lang}\n${content.slice(0, 1500)}\n\`\`\``);
          fetchedFiles.delete(name);
        }
      }
      // Then add up to 6 more source files from src/ or lib/
      let extraCount = 0;
      for (const [path, content] of fetchedFiles) {
        if (extraCount >= 6) break;
        if (path.startsWith("src/") || path.startsWith("lib/") || path.startsWith("app/") || path.startsWith("pages/") || path.startsWith("components/")) {
          const lang = path.endsWith(".tsx") || path.endsWith(".ts") ? "tsx" : path.endsWith(".jsx") ? "jsx" : path.endsWith(".js") ? "js" : path.endsWith(".css") ? "css" : "text";
          sourceContext.push(`\`${path}\`:\n\`\`\`${lang}\n${content.slice(0, 2000)}\n\`\`\``);
          extraCount++;
        }
      }
      if (sourceContext.length > 0) {
        contextParts.push(`Source files:\n${sourceContext.join("\n\n")}`);
      }
    }

    if (repoInfo.packageJsonRaw) {
      contextParts.push(`package.json:\n\`\`\`json\n${repoInfo.packageJsonRaw}\n\`\`\``);
    }
    if (repoInfo.existingReadme) {
      contextParts.push(`Existing README (for reference):\n${repoInfo.existingReadme}`);
    }
    if (data.description && !repo) {
      contextParts.push(`User-provided project description:\n${data.description}`);
    }

    const contextBlock = contextParts.join("\n\n");

    const styleGuides = {
      minimal: "Keep it tight — no filler, but still complete. Every section is a few sharp paragraphs. Omit anything obvious.",
      standard: "Balanced, thorough. Each section has real substance — explanations, code snippets, and concrete details. Good for production open-source projects.",
      comprehensive:
        "Deep documentation. Full API references, multiple code examples, configuration guides, performance considerations. Shipshape production quality.",
    };

    const toneGuides = {
      technical: "Precise and direct. Use domain terminology. Write like a senior engineer documenting their own architecture. Assume the reader can handle depth.",
      friendly: "Approachable but confident. Write like a maintainer who actually likes helping people. Use clear language, not marketing fluff.",
      enterprise: "Formal and polished. Write for a professional audience evaluating the project for adoption. Complete sentences, structured sections, no shortcuts.",
    };

const prompt = `You write README files that look like they were written by a human maintainer, not a template. You have strong opinions about what makes documentation useful.

# PROJECT CONTEXT
${contextBlock}

# README SPEC
- Style: ${styleGuides[data.style]}
- Tone: ${toneGuides[data.tone]}
- Required sections (in this order): ${data.sections.join(" → ")}

# QUALITY STANDARDS
A great README feels alive. It has:
- A project description that actually explains what this thing DOES and why it exists
- Real code examples that show the API surface, not generic placeholder code
- A badge row with real shields.io badges that reflect the actual tech
- Installation steps with the actual clone URL and package manager
- A tech stack section that says what each tool IS used for in this project, not a dictionary definition
- A features list that reads like release notes: concrete, specific, derived from real file names and structure
- A folder structure that matches the actual project tree
- Architecture explanation that connects the stack to the layout
- Contributing guidelines that sound like a real human wrote them

# FORMAT RULES
- Start with "# ${projectTitle}" — no preamble
- Use proper markdown fences with language tags
- Code examples must look real, not pseudocode
- Never say "I cannot", "I don't have access", or any AI apologetics
- Every section gets genuine content. If context is thin, write what a maintainer would reasonably write about their own project

# SEPARATOR
---METADATA---
After the README, add "---METADATA---" then this exact JSON on its own line (no fences):
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
          throw new Error("AI generation timed out. Your repo may be too large — try describing it instead.");
        }
        if (message.includes("401") || message.includes("unauthorized") || message.includes("api key")) {
          throw new Error("Invalid AI API key. Check your GENERATIVE_KEY environment variable.");
        }
        throw new Error(`Generation failed: ${message}`);
      }

      if (!text || text.trim().length < 10) {
        console.error("[generateReadme] AI returned empty or near-empty response");
        throw new Error("AI returned an empty response. Try again.");
      }

      // Try primary separator, then fallback to markdown HR + JSON pattern
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

      metaJson = metaJson.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

      if (!readme) {
        throw new Error("Generated README is empty. Try again.");
      }

      let parsedMeta = { ...discovery };
      if (metaJson) {
        try {
          const meta = JSON.parse(metaJson);
          parsedMeta = { ...parsedMeta, ...meta };
        } catch (e) {
          console.warn("[generateReadme] Failed to parse metadata JSON:", metaJson.slice(0, 100));
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
    prompt: "Write an 'Installation' or 'Getting Started' section. Include exact terminal commands for npm/yarn/pnpm based on the project's package manager. Keep it scannable and actionable.",
  },
  usage: {
    label: "Usage / Examples",
    prompt: "Write a 'Usage' or 'Examples' section. Include a real code block (```) showing how to import and use the core API. Add a concise explanation.",
  },
  api: {
    label: "API Documentation",
    prompt: "Write an 'API Documentation' section. Document the main exports, functions, components, or endpoints. Use a table for props/parameters. Keep it precise and technical.",
  },
  toc: {
    label: "Table of Contents",
    prompt: "Write a 'Table of Contents' section with anchor links to all major sections in the README. Use a simple bullet list format with proper markdown anchor links.",
  },
  contributing: {
    label: "Contributing",
    prompt: "Write a 'Contributing' section. Cover local setup, pull request process, coding standards, and how to report issues. Keep it friendly but professional.",
  },
  license: {
    label: "License",
    prompt: "Write a 'License' section that states the project is open source under the MIT License. Include a link to the LICENSE file. Simple and standard.",
  },
  configuration: {
    label: "Configuration / Environment",
    prompt: "Write a 'Configuration' or 'Environment Variables' section. List env vars in a table with variable name, description, and default value. Based on the actual configuration files.",
  },
};

export const generateSection = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({
    existingReadme: z.string(),
    sectionKey: z.string(),
    projectTitle: z.string(),
    projectDesc: z.string(),
    detectedStack: z.array(z.string()),
  }).parse(input))
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
${data.projectTitle} — ${data.projectDesc}
Stack: ${data.detectedStack.join(", ")}

TASK:
Write the missing section "## ${guide.label}" as if you built this project yourself.

${guide.prompt}

Make it read like a real section from a real README — specific, honest, technically accurate. Use code blocks, tables, or lists where they help.

FORMAT: Output only the section content starting with "## ${guide.label}". No preamble. No code fences around the output.`;

    const { text } = await generateText({
      model: groq(model),
      prompt,
      temperature: 0.7,
    });

    return { section: text.trim() };
  });
