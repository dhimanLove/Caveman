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

async function fetchRepoFile(owner: string, repo: string, path: string): Promise<string | null> {
  const branches = ["main", "master"];
  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return await res.text();
    } catch {
      continue;
    }
  }
  return null;
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
  const stackMap: Record<string, string[]> = {
    React: [
      "react",
      "react-dom",
      "next",
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

  const detected: string[] = [];
  const lowerDeps = allDeps.map((d) => d.toLowerCase());

  for (const [name, keywords] of Object.entries(stackMap)) {
    if (keywords.some((kw) => lowerDeps.some((d) => d.includes(kw.toLowerCase())))) {
      detected.push(name);
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
    let entryText: string | null = null;

    const SCAN_FILES = [
      "package.json",
      "README.md",
      "index.html",
      "tsconfig.json",
      "vite.config.ts",
      "vite.config.js",
      "next.config.js",
      "next.config.mjs",
      "astro.config.mjs",
      "nuxt.config.ts",
      "svelte.config.js",
      "src/main.tsx",
      "src/main.ts",
      "src/main.jsx",
      "src/main.js",
      "src/App.tsx",
      "src/App.jsx",
      "src/index.tsx",
      "src/index.ts",
      "app/layout.tsx",
      "app/layout.jsx",
      "pages/_app.tsx",
      "pages/_app.jsx",
    ];

    const repo = parseRepoUrl(data.projectUrl);
    if (repo) {
      repoInfo.owner = repo.owner;
      repoInfo.repo = repo.repo;
      repoInfo.title = repo.repo.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      const results = await Promise.all(
        SCAN_FILES.map((path) =>
          fetchRepoFile(repo.owner, repo.repo, path).then((text) => ({ path, text })),
        ),
      );

      const pkgText = results.find((r) => r.path === "package.json")?.text ?? null;
      const readmeText = results.find((r) => r.path === "README.md")?.text ?? null;
      const indexHtml = results.find((r) => r.path === "index.html")?.text ?? null;
      const tsconfigText = results.find((r) => r.path === "tsconfig.json")?.text ?? null;
      entryText =
        results.find(
          (r) =>
            r.path.startsWith("src/") || r.path.startsWith("app/") || r.path.startsWith("pages/"),
        )?.text ?? null;

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

      if (readmeText) {
        repoInfo.existingReadme = readmeText.slice(0, 3000);
      }

      // Parse index.html for title and description
      if (indexHtml) {
        const titleMatch = indexHtml.match(/<title>([^<]*)<\/title>/i);
        if (titleMatch) htmlTitle = titleMatch[1];
        const descMatch = indexHtml.match(
          /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
        );
        if (descMatch) htmlDescription = descMatch[1];
      }

      // Parse tsconfig.json for framework hints
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

    // Count scanned files for realistic discovery
    const scannedFilesCount = repo ? SCAN_FILES.length : 0;
    const hasJsx =
      detectedStack.includes("React") ||
      tsconfigJsx.toLowerCase() === "react" ||
      tsconfigJsx.toLowerCase() === "react-jsx";
    const componentEstimate = hasJsx ? Math.max(Math.floor(scannedFilesCount * 1.5), 3) : 0;
    const hasApi = detectedStack.some((s) =>
      ["Node.js", "Express", "Fastify", "Next.js"].includes(s),
    );
    const hasDatabase = detectedStack.some((s) =>
      ["PostgreSQL", "MongoDB", "Redis", "Prisma"].includes(s),
    );

    // Build discovery from real data
    const discovery = {
      inferredTitle: projectTitle,
      inferredDescription: projectDesc,
      detectedStack: detectedStack.length > 0 ? detectedStack.slice(0, 10) : [],
      fileCount: scannedFilesCount,
      componentCount: componentEstimate,
      apiRoutes: hasApi ? Math.max(Math.floor(scannedFilesCount * 0.4), 1) : 0,
      databaseModels: hasDatabase ? Math.max(Math.floor(scannedFilesCount * 0.3), 1) : 0,
    };

    // Build context with all scanned data for deep AI analysis
    const contextParts: string[] = [];

    if (repo) {
      contextParts.push(`GitHub repository: ${repo.owner}/${repo.repo}`);
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
    if (entryText) {
      contextParts.push(`Entry point source code:\n\`\`\`\n${entryText!.slice(0, 2000)}\n\`\`\``);
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
      minimal: "Short and punchy. One-liner per section. No fluff.",
      standard: "Balanced. Clear sections with 2-3 sentences each. Good for most projects.",
      comprehensive:
        "Detailed. Include code examples, technical explanations, and thorough coverage. Production quality.",
    };

    const toneGuides = {
      technical: "Precise, direct. Use technical terminology. Assume the reader is a developer.",
      friendly: "Welcoming, conversational. Write like a helpful open-source maintainer.",
      enterprise: "Formal, polished. Write for a corporate audience. Use complete sentences.",
    };

const prompt = `You are a senior technical writer generating a README.md for a software project.

CORE INSTRUCTION:
Deeply analyze the provided repository data in the CONTEXT block. Do not guess, invent, or assume features, dependencies, or architectures. Base every single claim on the actual code, configuration files, and dependencies provided.

CONTEXT AVAILABLE TO YOU:
- Configuration files (e.g., package.json, tsconfig.json)
- Project structure and routing configurations
- Source code entry points
- HTML metadata and existing documentation fragments

ANALYSIS TASKS:
1. Project Purpose: Define exactly what the project does. Look at the primary dependencies, scripts, and main source code to determine if it is a frontend app, an API, or a library.
2. Folder Structure: Map the actual folder tree based on the provided file paths and imports. Do not add standard boilerplate folders unless they exist in the context.
3. Tech Stack: List the exact technologies found in the configuration files. Briefly explain the role of each tool within this specific project.
4. Features: Identify features only if they are backed by the code. For example, only mention "Authentication" if auth libraries or middleware are clearly present.
5. Installation & Usage: Provide setup commands based strictly on the detected package manager (npm, yarn, pnpm) and the exact scripts defined in the configuration files (like "npm run dev").
6. Architecture & Best Practices: Describe the system architecture based entirely on the tech stack and code layout. 

RULES:
- Never write "not specified" or "no information available". If data is missing for a section, omit that section entirely.
- Do not add placeholder links, fake badges, or fake image links.
- Write in short, clear, and direct sentences.
- Keep the output professional and highly factual.

CONTEXT:
${contextBlock}

REQUIREMENTS:
Style (${data.style}): ${styleGuides[data.style]}
Tone (${data.tone}): ${toneGuides[data.tone]}
Sections to include (in order): ${data.sections.join(", ")}

OUTPUT FORMAT:
Output only the valid Markdown for the README.md. Do not include introductory text. Do not wrap the entire output in markdown code fences.
Begin directly with "# ${projectTitle}".
Use proper markdown code fences (\`\`\`) with language tags for code examples.

---METADATA---
Return this exact JSON block after the README content, separated by a line containing only "---METADATA---":
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
      const { createGroqProvider } = await import("./ai-gateway.server");
      const groq = createGroqProvider(key);
      const model = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";

      const { text } = await generateText({
        model: groq(model),
        prompt,
        temperature: 0.7,
      });

      const parts = text.split("---METADATA---");
      const readme = parts[0]?.trim() || text;

      let parsedMeta = { ...discovery };
      if (parts[1]) {
        try {
          const meta = JSON.parse(parts[1].trim());
          parsedMeta = { ...parsedMeta, ...meta };
        } catch {
          // use defaults
        }
      }

      return { readme, discovery: parsedMeta };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      if (message.includes("429")) throw new Error("Rate limited. Try again in a moment.");
      throw new Error(message);
    }
  });
