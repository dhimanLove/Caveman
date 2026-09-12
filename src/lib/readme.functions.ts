import { z } from "zod";
import { groqChatComplete } from "./groq-chat.server";
import { getModelCandidates } from "./ai-gateway.server";

/**
 * In-memory LRU cache for generated READMEs.
 * Keyed by canonical generation input (URL + description + style + tone + sections).
 */
const CACHE_MAX = 64;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CacheEntry {
  key: string;
  result: ReadmeResult;
  insertedAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(data: {
  projectUrl: string;
  description: string;
  style: string;
  tone: string;
  sections: string[];
}): string {
  return JSON.stringify({
    url: data.projectUrl.trim().toLowerCase().replace(/\/+$/, ""),
    description: data.description.trim(),
    style: data.style,
    tone: data.tone,
    sections: [...data.sections].sort(),
  });
}

function cacheGet(key: string): ReadmeResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.insertedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.result;
}

function cacheSet(key: string, result: ReadmeResult): void {
  while (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  cache.set(key, { key, result, insertedAt: Date.now() });
}

export interface ReadmeDiscovery {
  inferredTitle?: string;
  inferredDescription?: string;
  detectedStack?: string[];
  fileCount?: number;
  componentCount?: number;
  apiRoutes?: number;
  databaseModels?: number;
}

export type ReadmeResult = {
  readme: string;
  discovery: ReadmeDiscovery;
};

const Input = z.object({
  projectUrl: z.string().max(300).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  style: z.enum(["minimal", "standard", "comprehensive"]).default("standard"),
  sections: z.array(z.string().max(60)).max(24).default(["Installation", "Usage", "License"]),
  tone: z.enum(["technical", "friendly", "enterprise"]).default("technical"),
});

const GH_NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/;

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  if (!url || url.length > 300) return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  if (!GH_NAME_RE.test(owner) || !GH_NAME_RE.test(repo)) return null;
  return { owner, repo };
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "caveman-readme-generator",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token && token.trim().length > 10) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

interface RepoMetadata {
  defaultBranch: string;
  description: string;
  language: string;
  topics: string[];
  homepage: string;
  license: string;
}

async function fetchRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
  const fallback: RepoMetadata = {
    defaultBranch: "main",
    description: "",
    language: "",
    topics: [],
    homepage: "",
    license: "",
  };
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      headers: getGitHubHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return {
        defaultBranch:
          typeof data.default_branch === "string" && data.default_branch.length > 0
            ? data.default_branch
            : "main",
        description: typeof data.description === "string" ? data.description : "",
        language: typeof data.language === "string" ? data.language : "",
        topics: Array.isArray(data.topics)
          ? data.topics.filter((t: unknown) => typeof t === "string")
          : [],
        homepage: typeof data.homepage === "string" ? data.homepage : "",
        license:
          data.license && typeof data.license.spdx_id === "string" ? data.license.spdx_id : "",
      };
    }
  } catch {
    // Return default fallback
  }
  return fallback;
}

async function fetchRawFile(
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return await res.text();
  } catch {
    // Ignore fetch failure
  }
  return null;
}

async function fetchLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  const url = `https://api.github.com/repos/${owner}/${repo}/languages`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      headers: getGitHubHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return data && typeof data === "object" ? data : {};
    }
  } catch {
    // Ignore
  }
  return {};
}

/** Manifest files consulted to derive dependencies, scripts, and configuration. */
const ESSENTIAL_MANIFESTS = [
  "package.json",
  "Cargo.toml",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "composer.json",
  "pom.xml",
  "build.gradle",
  "Makefile",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  ".env.example",
  "README.md",
];

const ENTRY_POINTS = [
  "src/index.ts",
  "src/index.tsx",
  "src/main.ts",
  "src/main.tsx",
  "src/App.tsx",
  "src/App.vue",
  "src/server.ts",
  "src/server.js",
  "src/routes.ts",
  "src/main.rs",
  "src/main.go",
  "src/main.py",
  "app.py",
  "main.py",
  "index.js",
  "server.js",
  "lib/index.js",
  "lib/index.ts",
  "lib/express.js",
  "lib/application.js",
  "src/app.ts",
  "src/app.js",
];

const SOURCE_EXT_RE =
  /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|py|go|rs|c|cpp|h|hpp|java|kt|rb|php|sh|css|scss|sql|json|toml|md)$/i;

const HIGH_SIGNAL_DIRS = [
  "src",
  "lib",
  "app",
  "pages",
  "components",
  "server",
  "api",
  "handlers",
  "core",
  "cmd",
  "routes",
];

const NOISE_DIRS =
  /^(node_modules|\.git|\.vscode|\.idea|dist|build|\.output|coverage|__pycache__|\.next|\.turbo|vendor|target|bin|obj|\.github\/workflows|test|tests|__tests__|benchmark|benchmarks|docs?|scripts?|assets?|static)\//i;

interface ScannedRepository {
  tree: string;
  folderStructure: string[];
  fetchedFiles: Map<string, string>;
  packageManager: string;
  allFilePaths: string[];
  hasDocker: boolean;
  hasTests: boolean;
  hasCi: boolean;
}

async function scanRepository(
  owner: string,
  repo: string,
  defaultBranch = "main",
): Promise<ScannedRepository> {
  const fetchedFiles = new Map<string, string>();
  let allFilePaths: string[] = [];
  let packageManager = "npm";
  let hasDocker = false;
  let hasTests = false;
  let hasCi = false;

  // 1. Fetch recursive Git Tree
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(treeUrl, {
      headers: getGitHubHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tree)) {
        const excludePatterns =
          /^(node_modules|\.git|\.vscode|\.idea|dist|build|\.output|coverage|__pycache__|\.next|\.turbo|vendor|target|bin|obj)\//i;
        allFilePaths = data.tree
          .filter((item: any) => item.type === "blob" && !excludePatterns.test(item.path))
          .map((item: any) => item.path);
      }
    }
  } catch {
    // Tree API fallback
  }

  if (allFilePaths.length === 0) {
    allFilePaths = [...ESSENTIAL_MANIFESTS, ...ENTRY_POINTS];
  }

  // Detect build tool / package manager. Lockfiles are the ground truth, but a
  // repository may legitimately ship several (e.g. package-lock.json + bun.lock),
  // so never collapse that into a single manager assumption.
  const joined = allFilePaths.map((p) => p.toLowerCase()).join("\n");
  const jsManagers: string[] = [];
  if (/pnpm-lock\.yaml/.test(joined)) jsManagers.push("pnpm");
  if (/yarn\.lock/.test(joined)) jsManagers.push("yarn");
  if (/bun\.lock/.test(joined)) jsManagers.push("bun");
  if (/package-lock\.json/.test(joined) || /npm-shrinkwrap\.json/.test(joined))
    jsManagers.push("npm");
  if (jsManagers.length > 1) packageManager = `multiple (${jsManagers.join(" + ")})`;
  else if (jsManagers.length === 1) packageManager = jsManagers[0];
  else if (/package\.json/.test(joined)) packageManager = "npm";
  else if (/cargo\.toml/.test(joined)) packageManager = "cargo";
  else if (/go\.mod/.test(joined)) packageManager = "go";
  else if (/poetry\.lock/.test(joined) || /pyproject\.toml/.test(joined)) packageManager = "poetry";
  else if (/requirements\.txt/.test(joined) || /pipfile/.test(joined)) packageManager = "pip";
  else if (/makefile/.test(joined)) packageManager = "make";
  else if (/cmakelists\.txt/.test(joined)) packageManager = "cmake";
  else if (/pom\.xml/.test(joined)) packageManager = "maven";
  else if (/build\.gradle/.test(joined)) packageManager = "gradle";
  else if (/composer\.json/.test(joined)) packageManager = "composer";

  // Check features grounded in tree
  for (const p of allFilePaths) {
    const lower = p.toLowerCase();
    if (/(^|\/)dockerfile($|\.)|docker-compose\.ya?ml/.test(lower)) hasDocker = true;
    if (
      /\.(test|spec|e2e)\./.test(lower) ||
      /\/(test|tests|__tests__|spec)\//.test(lower) ||
      /\.(test|tests)\.(ts|tsx|js|jsx|py|go|rs|rb|sh)$/.test(lower)
    )
      hasTests = true;
    if (
      /^\.github\//.test(lower) ||
      /\.gitlab-ci\.yml$/.test(lower) ||
      /Jenkinsfile/.test(lower) ||
      /^\.circleci\//.test(lower)
    )
      hasCi = true;
  }

  // Pick high-signal files to fetch in parallel
  const filesToFetch: string[] = [];
  const prioritySet = new Set<string>();

  // Manifests first (cap at 10)
  let manifestCount = 0;
  for (const manifest of ESSENTIAL_MANIFESTS) {
    const match = allFilePaths.find(
      (p) =>
        p.toLowerCase() === manifest.toLowerCase() ||
        p.toLowerCase().endsWith("/" + manifest.toLowerCase()),
    );
    if (match && !prioritySet.has(match)) {
      prioritySet.add(match);
      filesToFetch.push(match);
      manifestCount++;
      if (manifestCount >= 10) break;
    }
  }

  // Entry points — only match if the file actually exists in the tree
  for (const entry of ENTRY_POINTS) {
    if (filesToFetch.length >= 15) break;
    const match = allFilePaths.find(
      (p) =>
        p.toLowerCase() === entry.toLowerCase() ||
        p.toLowerCase().endsWith("/" + entry.toLowerCase()),
    );
    if (match && !prioritySet.has(match)) {
      prioritySet.add(match);
      filesToFetch.push(match);
    }
  }

  // Real source files: prefer high-signal dirs, then any non-noise dir
  const highSignalSource = allFilePaths.filter(
    (p) =>
      SOURCE_EXT_RE.test(p) &&
      !NOISE_DIRS.test(p) &&
      HIGH_SIGNAL_DIRS.some((d) => p.split("/")[0] === d) &&
      !prioritySet.has(p),
  );
  highSignalSource.sort((a, b) => a.length - b.length);

  // Also include source from other dirs (not just top-level high-signal)
  const otherSource = allFilePaths.filter(
    (p) =>
      SOURCE_EXT_RE.test(p) &&
      !NOISE_DIRS.test(p) &&
      !HIGH_SIGNAL_DIRS.some((d) => p.split("/")[0] === d) &&
      !prioritySet.has(p) &&
      !p.includes("test/") &&
      !p.includes("__tests__/") &&
      !p.includes("spec/"),
  );
  otherSource.sort((a, b) => a.length - b.length);

  // Merge: high-signal first, then other source, capped at 35 total
  for (const p of highSignalSource) {
    if (filesToFetch.length >= 35) break;
    if (!prioritySet.has(p)) {
      prioritySet.add(p);
      filesToFetch.push(p);
    }
  }
  for (const p of otherSource) {
    if (filesToFetch.length >= 35) break;
    if (!prioritySet.has(p)) {
      prioritySet.add(p);
      filesToFetch.push(p);
    }
  }

  // Parallel raw file fetch with timeout
  const fetchPromises = filesToFetch.map(async (path) => {
    let text = await fetchRawFile(owner, repo, path, defaultBranch);
    if (!text && defaultBranch !== "main" && defaultBranch !== "master") {
      text =
        (await fetchRawFile(owner, repo, path, "main")) ||
        (await fetchRawFile(owner, repo, path, "master"));
    }
    return { path, text };
  });

  const results = await Promise.allSettled(fetchPromises);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.text) {
      fetchedFiles.set(r.value.path, r.value.text);
    }
  }

  // Build clean visual directory tree
  const topLevelDirs = new Set<string>();
  const topLevelTops = new Map<string, string[]>();
  for (const p of allFilePaths) {
    const parts = p.split("/");
    if (parts.length === 1) continue;
    const dir = parts[0];
    topLevelDirs.add(dir);
    if (!topLevelTops.has(dir)) topLevelTops.set(dir, []);
    if (topLevelTops.get(dir)!.length < 5) topLevelTops.get(dir)!.push(parts[1]);
  }
  const folderStructure: string[] = [];
  for (const d of topLevelDirs) {
    folderStructure.push(d);
    for (const sub of topLevelTops.get(d) || []) {
      folderStructure.push(`  ${sub}/`);
    }
  }

  const maxTreeDisplay = Math.min(allFilePaths.length, 36);
  const treeLines: string[] = [`${repo}/`];
  for (let i = 0; i < maxTreeDisplay; i++) {
    const p = allFilePaths[i];
    const depth = p.split("/").length - 1;
    const prefix = "  ".repeat(depth) + "├── ";
    treeLines.push(prefix + p.split("/").pop());
  }
  if (allFilePaths.length > maxTreeDisplay) {
    treeLines.push(`  └── ... and ${allFilePaths.length - maxTreeDisplay} more files`);
  }

  return {
    tree: treeLines.join("\n"),
    folderStructure,
    fetchedFiles,
    packageManager,
    allFilePaths,
    hasDocker,
    hasTests,
    hasCi,
  };
}

interface ParsedPackage {
  name: string;
  description: string;
  version: string;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  main?: string;
  bin?: string;
  keywords?: string[];
}

function parsePackageJson(text: string): ParsedPackage | null {
  try {
    const pkg = JSON.parse(text);
    return {
      name: typeof pkg.name === "string" ? pkg.name : "",
      description: typeof pkg.description === "string" ? pkg.description : "",
      version: typeof pkg.version === "string" ? pkg.version : "",
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
      scripts: typeof pkg.scripts === "object" && pkg.scripts ? pkg.scripts : {},
      main: typeof pkg.main === "string" ? pkg.main : undefined,
      bin:
        typeof pkg.bin === "string"
          ? pkg.bin
          : typeof pkg.bin === "object"
            ? Object.keys(pkg.bin).join(", ")
            : undefined,
      keywords: Array.isArray(pkg.keywords) ? pkg.keywords : undefined,
    };
  } catch {
    return null;
  }
}

interface ParsedCargo {
  name: string;
  version: string;
  description: string;
  edition: string;
  dependencies: string[];
  devDependencies: string[];
  binTargets: string[];
}

function parseCargoToml(text: string): ParsedCargo {
  const result: ParsedCargo = {
    name: "",
    version: "",
    description: "",
    edition: "",
    dependencies: [],
    devDependencies: [],
    binTargets: [],
  };

  const lines = text.split("\n");
  let currentSection = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const secMatch = line.match(/^\[([a-zA-Z0-9._-]+)\]$/);
    if (secMatch) {
      currentSection = secMatch[1].toLowerCase();
      continue;
    }

    if (currentSection === "package") {
      const nameM = line.match(/^name\s*=\s*["']([^"']+)["']/);
      if (nameM) result.name = nameM[1];
      const verM = line.match(/^version\s*=\s*["']([^"']+)["']/);
      if (verM) result.version = verM[1];
      const descM = line.match(/^description\s*=\s*["']([^"']+)["']/);
      if (descM) result.description = descM[1];
      const edM = line.match(/^edition\s*=\s*["']([^"']+)["']/);
      if (edM) result.edition = edM[1];
    } else if (currentSection === "dependencies") {
      const depM = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
      if (depM) result.dependencies.push(depM[1]);
    } else if (currentSection === "dev-dependencies") {
      const depM = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
      if (depM) result.devDependencies.push(depM[1]);
    } else if (currentSection === "bin" || currentSection.startsWith("bin.")) {
      const binM = line.match(/^name\s*=\s*["']([^"']+)["']/);
      if (binM) result.binTargets.push(binM[1]);
    }
  }

  return result;
}

interface ParsedPyproject {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  scripts: Record<string, string>;
}

function parsePyprojectToml(text: string): ParsedPyproject {
  const result: ParsedPyproject = {
    name: "",
    version: "",
    description: "",
    dependencies: [],
    scripts: {},
  };

  const lines = text.split("\n");
  let currentSection = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const secMatch = line.match(/^\[([a-zA-Z0-9._-]+)\]$/);
    if (secMatch) {
      currentSection = secMatch[1].toLowerCase();
      continue;
    }

    if (currentSection === "project" || currentSection === "tool.poetry") {
      const nameM = line.match(/^name\s*=\s*["']([^"']+)["']/);
      if (nameM) result.name = nameM[1];
      const verM = line.match(/^version\s*=\s*["']([^"']+)["']/);
      if (verM) result.version = verM[1];
      const descM = line.match(/^description\s*=\s*["']([^"']+)["']/);
      if (descM) result.description = descM[1];
    } else if (
      currentSection === "project.dependencies" ||
      currentSection === "tool.poetry.dependencies"
    ) {
      const depM = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
      if (depM && depM[1].toLowerCase() !== "python") {
        result.dependencies.push(depM[1]);
      }
    } else if (currentSection === "project.scripts" || currentSection === "tool.poetry.scripts") {
      const scrM = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/);
      if (scrM) result.scripts[scrM[1]] = scrM[2];
    }
  }

  const depArrayMatch = text.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (depArrayMatch) {
    const items = depArrayMatch[1].match(/["']([a-zA-Z0-9_-]+)[^"']*["']/g);
    if (items) {
      for (const it of items) {
        const cleaned = it
          .replace(/["']/g, "")
          .split(/[<>=!~ ]/)[0]
          .trim();
        if (cleaned && !result.dependencies.includes(cleaned)) {
          result.dependencies.push(cleaned);
        }
      }
    }
  }

  return result;
}

function parseRequirementsTxt(text: string): string[] {
  const deps: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) continue;
    const pkg = line.split(/[<>=!~; \t]/)[0].trim();
    if (pkg && /^[a-zA-Z0-9_.-]+$/.test(pkg) && !deps.includes(pkg)) {
      deps.push(pkg);
    }
  }
  return deps;
}

interface ParsedGoMod {
  module: string;
  goVersion: string;
  dependencies: string[];
}

function parseGoMod(text: string): ParsedGoMod {
  const result: ParsedGoMod = {
    module: "",
    goVersion: "",
    dependencies: [],
  };

  const modM = text.match(/^module\s+([^\s]+)/m);
  if (modM) result.module = modM[1];

  const goM = text.match(/^go\s+([0-9.]+)/m);
  if (goM) result.goVersion = goM[1];

  const reqBlock = text.match(/require\s*\(([\s\S]*?)\)/);
  if (reqBlock) {
    for (const line of reqBlock[1].split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] && !parts[0].startsWith("//") && parts[0] !== "//") {
        result.dependencies.push(parts[0]);
      }
    }
  }
  return result;
}

function parseEnvFiles(fetchedFiles: Map<string, string>): string[] {
  const envVars: string[] = [];
  for (const [p, content] of fetchedFiles) {
    const lower = p.toLowerCase();
    if (
      lower.endsWith(".env.example") ||
      lower.endsWith(".env.sample") ||
      lower.endsWith(".env.template") ||
      lower.endsWith("example.env")
    ) {
      for (const line of content.split("\n")) {
        const match = line.trim().match(/^([A-Z0-9_]+)=/i);
        if (match && !envVars.includes(match[1])) {
          envVars.push(match[1]);
        }
      }
    }
  }
  return envVars;
}

/** Extract key lines from entry points and routers (up to 150 lines total) to ground the LLM in real code. */
function extractSourceSnippets(
  fetchedFiles: Map<string, string>,
): { path: string; snippet: string }[] {
  const snippets: { path: string; snippet: string }[] = [];
  const scoredFiles: { path: string; score: number }[] = [];

  for (const p of fetchedFiles.keys()) {
    const lower = p.toLowerCase();
    if (
      !SOURCE_EXT_RE.test(p) ||
      NOISE_DIRS.test(p) ||
      /package(-lock)?\.json|tsconfig|\.env|cargo\.lock|license|readme|\.md$/i.test(lower)
    ) {
      continue;
    }

    let score = 0;
    if (
      ENTRY_POINTS.some(
        (ep) => lower === ep.toLowerCase() || lower.endsWith("/" + ep.toLowerCase()),
      )
    )
      score += 100;
    if (/index\.(ts|js|mjs|tsx|jsx)/.test(lower)) score += 80;
    if (/main\.(ts|js|py|go|rs)/.test(lower)) score += 80;
    if (/app\.(ts|js|py)/.test(lower)) score += 75;
    if (/server\.(ts|js)/.test(lower)) score += 70;
    if (/express\.(ts|js)|application\.(ts|js)/.test(lower)) score += 65;
    if (/(routes?|routers?|api|handlers?|controllers?)/.test(lower)) score += 60;
    if (/core|engine|client/.test(lower)) score += 40;

    // Bonus: files that export things or define classes are likely important
    const raw = fetchedFiles.get(p);
    if (raw) {
      const exportLines = (
        raw.match(/^(export |module\.exports|public |def |class |interface |type )/gm) || []
      ).length;
      score += Math.min(exportLines * 5, 30);
    }

    scoredFiles.push({ path: p, score });
  }

  scoredFiles.sort((a, b) => b.score - a.score);

  let totalLinesBudget = 400;

  for (const { path } of scoredFiles) {
    if (totalLinesBudget <= 0 || snippets.length >= 10) break;
    const raw = fetchedFiles.get(path);
    if (!raw) continue;

    const allLines = raw.split("\n");
    // Skip preamble comments / licenses so real declarations and signatures are visible
    let startIdx = 0;
    if (allLines[0]?.trim().startsWith("/*")) {
      while (startIdx < allLines.length && !allLines[startIdx].includes("*/")) {
        startIdx++;
      }
      if (startIdx < allLines.length && allLines[startIdx].includes("*/")) {
        startIdx++;
      }
    }
    while (
      startIdx < allLines.length &&
      (!allLines[startIdx].trim() ||
        allLines[startIdx].trim().startsWith("//") ||
        allLines[startIdx].trim().startsWith("#"))
    ) {
      startIdx++;
    }

    const linesToTake = Math.min(55, totalLinesBudget, Math.max(0, allLines.length - startIdx));
    if (linesToTake <= 5) continue;

    const trimmed = allLines
      .slice(startIdx, startIdx + linesToTake)
      .join("\n")
      .trim();
    if (trimmed.length > 20) {
      snippets.push({ path, snippet: trimmed });
      totalLinesBudget -= linesToTake;
    }
  }

  return snippets;
}

/**
 * Extract real exported symbols (functions, classes, types, constants) from source files.
 * This gives the LLM actual names it can reference instead of inventing them.
 */
function extractExportedSymbols(
  fetchedFiles: Map<string, string>,
): { file: string; symbol: string; kind: string }[] {
  const symbols: { file: string; symbol: string; kind: string }[] = [];
  const seen = new Set<string>();

  for (const [path, content] of fetchedFiles) {
    if (!SOURCE_EXT_RE.test(path) || NOISE_DIRS.test(path)) continue;
    if (/package(-lock)?\.json|tsconfig|\.env|cargo\.lock|license|readme|\.md$/i.test(path))
      continue;

    const lines = content.split("\n");
    for (let i = 0; i < Math.min(lines.length, 500); i++) {
      const line = lines[i];
      let match: RegExpMatchArray | null = null;
      let kind = "";

      // JS/TS: export function/class/const/type
      match = line.match(/^export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/);
      if (match) {
        kind = "function";
      }
      if (!match) {
        match = line.match(/^export\s+(?:abstract\s+)?class\s+(\w+)/);
        if (match) kind = "class";
      }
      if (!match) {
        match = line.match(/^export\s+(?:const|let|var)\s+(\w+)/);
        if (match) kind = "const";
      }
      if (!match) {
        match = line.match(/^export\s+(?:type|interface)\s+(\w+)/);
        if (match) kind = "type";
      }
      if (!match) {
        match = line.match(/^export\s+\{([^}]+)\}/);
        if (match) kind = "named";
      }

      // Python: def / class at top level
      if (!match) {
        match = line.match(/^def\s+(\w+)\s*\(/);
        if (match) kind = "function";
      }
      if (!match) {
        match = line.match(/^class\s+(\w+)/);
        if (match) kind = "class";
      }

      // Go: func Name
      if (!match) {
        match = line.match(/^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/);
        if (match) kind = "function";
      }

      // Rust: pub fn / pub struct / pub enum
      if (!match) {
        match = line.match(/^pub\s+(?:async\s+)?fn\s+(\w+)/);
        if (match) kind = "function";
      }
      if (!match) {
        match = line.match(/^pub\s+struct\s+(\w+)/);
        if (match) kind = "struct";
      }
      if (!match) {
        match = line.match(/^pub\s+enum\s+(\w+)/);
        if (match) kind = "enum";
      }

      // module.exports pattern
      if (!match) {
        match = line.match(/module\.exports\s*=\s*(?:\{([^}]+)\}|(\w+))/);
        if (match) kind = "export";
      }

      if (!match || !kind) continue;

      if (kind === "named") {
        // Handle: export { foo, bar, baz }
        const names = (match[1] || "")
          .split(",")
          .map((n) => n.trim().split(/\s+as\s+/)[0])
          .filter(Boolean);
        for (const name of names) {
          const key = `${path}:${name}`;
          if (!seen.has(key) && name.length > 1 && name.length < 60) {
            seen.add(key);
            symbols.push({ file: path, symbol: name, kind: "named" });
          }
        }
      } else {
        const name = match[1];
        if (!name || name.length < 2 || name.length > 60) continue;
        const key = `${path}:${name}`;
        if (!seen.has(key)) {
          seen.add(key);
          symbols.push({ file: path, symbol: name, kind });
        }
      }
    }
  }

  return symbols;
}

/**
 * Derive the project's REAL title + one-line summary from its top-level README.
 * The package.json name/description are frequently generic starter-template
 * values (e.g. "tanstack_start_ts") that do not describe the actual project.
 */
function extractReadmeIdentity(text: string): { title: string; summary: string } {
  const lines = text.replace(/\r/g, "").split("\n");
  let title = "";
  let headingIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+)$/);
    if (!m) continue;
    const candidate = m[1]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#*_`]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!candidate) continue;
    title = candidate;
    headingIdx = i;
    break;
  }
  if (!title) return { title: "", summary: "" };

  let summary = "";
  let subheadingSkips = 0;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^#{2,6}\s/.test(line)) {
      // Cross a few subheadings to find the first real descriptive paragraph.
      subheadingSkips++;
      if (subheadingSkips > 3) break;
      continue;
    }
    if (/^!\[/i.test(line)) continue; // image
    if (/^https?:\/\//i.test(line)) continue; // bare url
    if (/^<\/?(div|p|a|img|br)[>\s]/i.test(line)) continue; // html tag
    if (/^\|.*\|$/.test(line)) continue; // table row
    if (/^\s*[-*] |^\s*\d+\./.test(line)) continue; // list item
    if (line.length < 20) continue;
    summary = line
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#*_`>]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 350);
    break;
  }

  return { title, summary };
}

interface SynthesizedDesc {
  languages: string[];
  frameworks: string[];
  packageManager: string;
  entryPoint: string;
  scripts: Record<string, string>;
  dependencies: string[];
}

function synthesizeFromDescription(desc: string): SynthesizedDesc {
  const text = desc.toLowerCase();
  const languages: string[] = [];
  const frameworks: string[] = [];
  const dependencies: string[] = [];

  // Detect languages
  if (/\b(typescript|ts)\b/.test(text)) languages.push("TypeScript");
  if (/\b(javascript|js|node|nodejs)\b/.test(text) && !languages.includes("TypeScript"))
    languages.push("JavaScript");
  if (/\b(python|py|django|fastapi|flask)\b/.test(text)) languages.push("Python");
  if (/\b(rust|cargo|axum|actix|tokio)\b/.test(text)) languages.push("Rust");
  if (
    /\b(golang|go)\b/.test(text) &&
    !/\b(go to|go through|go over|let's go|go ahead)\b/.test(text)
  )
    languages.push("Go");
  if (/\b(java|spring)\b/.test(text) && !/\b(javascript)\b/.test(text)) languages.push("Java");
  if (/\b(c\+\+|cpp)\b/.test(text)) languages.push("C++");
  if (/\b(php|laravel)\b/.test(text)) languages.push("PHP");
  if (/\b(ruby|rails)\b/.test(text)) languages.push("Ruby");

  // Detect frameworks / databases / tools
  const pushF = (name: string, ok: boolean) => {
    if (ok && !frameworks.includes(name)) frameworks.push(name);
  };
  pushF("Redis", /\bredis\b/.test(text));
  pushF("PostgreSQL", /\b(postgres|postgresql|pg)\b/.test(text));
  pushF("MongoDB", /\b(mongo|mongodb)\b/.test(text));
  pushF("SQLite", /\bsqlite\b/.test(text));
  pushF("React", /\breact\b/.test(text));
  pushF("Next.js", /\bnext\.?js\b/.test(text));
  pushF("Express", /\bexpress(\.?js)?\b/.test(text));
  pushF("FastAPI", /\bfastapi\b/.test(text));
  pushF("Django", /\bdjango\b/.test(text));
  pushF("Flask", /\bflask\b/.test(text));
  pushF("Tailwind CSS", /\btailwind(css)?\b/.test(text));
  pushF("Docker", /\bdocker\b/.test(text));
  pushF("Kafka", /\bkafka\b/.test(text));
  pushF("GraphQL", /\bgraphql\b/.test(text));

  let packageManager = "npm";
  let entryPoint = "src/index.ts";
  let scripts: Record<string, string> = {
    build: "tsc",
    start: "node dist/index.js",
    dev: "tsx watch src/index.ts",
    test: "vitest run",
  };

  if (languages.includes("Python")) {
    packageManager = "pip";
    entryPoint = "main.py";
    scripts = {
      start: "python main.py",
      test: "pytest",
    };
  } else if (languages.includes("Rust")) {
    packageManager = "cargo";
    entryPoint = "src/main.rs";
    scripts = {
      build: "cargo build --release",
      test: "cargo test",
      run: "cargo run",
    };
  } else if (languages.includes("Go")) {
    packageManager = "go";
    entryPoint = "main.go";
    scripts = {
      build: "go build -o app .",
      test: "go test ./...",
      run: "go run main.go",
    };
  } else if (languages.includes("JavaScript")) {
    packageManager = "npm";
    entryPoint = "index.js";
    scripts = {
      start: "node index.js",
      dev: "node --watch index.js",
      test: "node --test",
    };
  }

  for (const f of frameworks) {
    dependencies.push(f.toLowerCase().replace(/\.js$/, ""));
  }

  return {
    languages: languages.length > 0 ? languages : ["TypeScript"],
    frameworks,
    packageManager,
    entryPoint,
    scripts,
    dependencies,
  };
}

/**
 * Deterministically extract repository facts.
 */
export interface RepoFacts {
  languages: string[];
  frameworks: string[];
  package_manager: string;
  entry_point: string;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  has_docker: boolean;
  has_tests: boolean;
  has_ci: boolean;
  license: string;
  folder_structure: string[];
  env_vars: string[];
  readme_excerpt: string;
}

function buildRepoFacts(options: {
  allFilePaths: string[];
  fetchedFiles: Map<string, string>;
  packageManager: string;
  folderStructure: string[];
  hasDocker: boolean;
  hasTests: boolean;
  hasCi: boolean;
  languageBytes: Record<string, number>;
  githubLanguage?: string;
  license?: string;
}): RepoFacts {
  const {
    allFilePaths,
    fetchedFiles,
    packageManager,
    folderStructure,
    hasDocker,
    hasTests,
    hasCi,
    languageBytes,
    githubLanguage,
    license,
  } = options;

  // Authoritative language detection
  const languages: string[] = [];
  const apiNames = Object.keys(languageBytes || {});
  if (apiNames.length > 0) {
    const skip = new Set(["html", "css", "scss", "markdown", "json", "svg", "shell", "dockerfile"]);
    const sorted = apiNames
      .filter((n) => n && !skip.has(n.toLowerCase()))
      .sort((a, b) => (languageBytes[b] || 0) - (languageBytes[a] || 0));
    for (const n of sorted) languages.push(n);
    if (languages.length === 0 && apiNames[0]) languages.push(apiNames[0]);
  } else if (githubLanguage) {
    languages.push(githubLanguage);
  } else {
    const extToLang: Record<string, string> = {
      ts: "TypeScript",
      tsx: "TypeScript",
      js: "JavaScript",
      jsx: "JavaScript",
      mjs: "JavaScript",
      vue: "Vue",
      svelte: "Svelte",
      py: "Python",
      go: "Go",
      rs: "Rust",
      c: "C",
      h: "C",
      cpp: "C++",
      hpp: "C++",
      java: "Java",
      kt: "Kotlin",
      rb: "Ruby",
      php: "PHP",
      sh: "Shell",
    };
    const counts = new Map<string, number>();
    for (const p of allFilePaths) {
      if (NOISE_DIRS.test(p)) continue;
      const ext = p.split(".").pop()?.toLowerCase() || "";
      const lang = extToLang[ext];
      if (lang) counts.set(lang, (counts.get(lang) || 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [lang, c] of sorted) {
      if (c >= 2) languages.push(lang);
    }
    if (languages.length === 0 && sorted[0]) languages.push(sorted[0][0]);
  }

  // Frameworks & dependencies detection across manifests
  const frameworks: string[] = [];
  let allDeps: string[] = [];
  let allDevDeps: string[] = [];
  let pkgScripts: Record<string, string> = {};
  let entryPoint = "";

  // 1. package.json
  let pkgText = fetchedFiles.get("package.json");
  if (!pkgText) {
    for (const [p, t] of fetchedFiles) {
      if (p.endsWith("package.json")) {
        pkgText = t;
        break;
      }
    }
  }
  if (pkgText) {
    const parsed = parsePackageJson(pkgText);
    if (parsed) {
      allDeps = parsed.dependencies;
      allDevDeps = parsed.devDependencies;
      pkgScripts = parsed.scripts;
      if (parsed.main) entryPoint = parsed.main;
    }
  }

  // 2. Cargo.toml
  const cargoText = fetchedFiles.get("Cargo.toml");
  if (cargoText) {
    const parsedCargo = parseCargoToml(cargoText);
    if (!languages.includes("Rust")) languages.push("Rust");
    if (allDeps.length === 0) allDeps = parsedCargo.dependencies;
    else allDeps = [...allDeps, ...parsedCargo.dependencies];
    if (allDevDeps.length === 0) allDevDeps = parsedCargo.devDependencies;
    if (!entryPoint && parsedCargo.binTargets[0])
      entryPoint = `src/${parsedCargo.binTargets[0]}.rs`;
    if (Object.keys(pkgScripts).length === 0) {
      pkgScripts = {
        build: "cargo build --release",
        test: "cargo test",
        run: "cargo run",
      };
    }
  }

  // 3. pyproject.toml / requirements.txt
  const pyprojectText = fetchedFiles.get("pyproject.toml");
  if (pyprojectText) {
    const parsedPy = parsePyprojectToml(pyprojectText);
    if (!languages.includes("Python")) languages.push("Python");
    allDeps = [...allDeps, ...parsedPy.dependencies];
    if (Object.keys(pkgScripts).length === 0 && Object.keys(parsedPy.scripts).length > 0) {
      pkgScripts = parsedPy.scripts;
    }
  }
  const reqText = fetchedFiles.get("requirements.txt");
  if (reqText) {
    const parsedReqs = parseRequirementsTxt(reqText);
    if (!languages.includes("Python")) languages.push("Python");
    allDeps = [...allDeps, ...parsedReqs];
  }

  // 4. go.mod
  const goModText = fetchedFiles.get("go.mod");
  if (goModText) {
    const parsedGo = parseGoMod(goModText);
    if (!languages.includes("Go")) languages.push("Go");
    allDeps = [...allDeps, ...parsedGo.dependencies];
    if (Object.keys(pkgScripts).length === 0) {
      pkgScripts = {
        build: "go build -o app .",
        test: "go test ./...",
        run: "go run main.go",
      };
    }
  }

  if (!entryPoint) {
    entryPoint =
      ENTRY_POINTS.find((e) => allFilePaths.some((p) => p.toLowerCase() === e.toLowerCase())) ||
      "index.js";
  }

  const depStr = [...allDeps, ...allDevDeps].map((d) => d.toLowerCase()).join("\n");
  const pushFramework = (name: string, ok: boolean) => {
    if (ok && !frameworks.includes(name)) frameworks.push(name);
  };

  pushFramework(
    "React",
    /(^|\n)react(\/|$)/.test(depStr) || /^react(-dom|-native)?($|\/)/.test(depStr),
  );
  pushFramework("Next.js", /\bnext\b|\bnext(-route|-navigation)?\b/.test(depStr));
  pushFramework("Express", /\bexpress\b/.test(depStr));
  pushFramework("Fastify", /\bfastify\b/.test(depStr));
  pushFramework("NestJS", /\bnestjs\b|\b@nestjs\//.test(depStr));
  pushFramework("Vue", /\bvue\b|\bnuxt\b/.test(depStr));
  pushFramework("Svelte", /\bsvelte\b/.test(depStr));
  pushFramework("Tailwind CSS", /\btailwindcss\b|\btailwind\b/.test(depStr));
  pushFramework("Vite", /\bvite\b/.test(depStr));
  pushFramework("Prisma", /\bprisma\b/.test(depStr));
  pushFramework("Drizzle", /\bdrizzle-orm\b/.test(depStr));
  pushFramework("TanStack", /\btanstack\b|\b@tanstack\//.test(depStr));
  pushFramework("GraphQL", /\bgraphql\b/.test(depStr));
  pushFramework("gRPC", /\bgrpc\b|\b@grpc\//.test(depStr));
  pushFramework("PostgreSQL", /\bpostgres\b|\bpg\b/.test(depStr));
  pushFramework("MongoDB", /\bmongodb\b|\bmongoose\b/.test(depStr));
  pushFramework("Redis", /\bredis\b/.test(depStr));
  pushFramework("Firebase", /\bfirebase\b/.test(depStr));
  pushFramework("Supabase", /\bsupabase\b/.test(depStr));
  pushFramework("Socket.io", /\bsocket\.io\b/.test(depStr));

  // Python / Cargo framework checks
  const cargoLower = (cargoText || "").toLowerCase();
  pushFramework("Axum", /axum/.test(cargoLower));
  pushFramework("Actix", /actix/.test(cargoLower));
  pushFramework("Tokio", /tokio/.test(cargoLower));

  const pyLower = ((pyprojectText || "") + (reqText || "")).toLowerCase();
  pushFramework("FastAPI", /fastapi/.test(pyLower));
  pushFramework("Django", /django/.test(pyLower));
  pushFramework("Flask", /flask/.test(pyLower));

  // Environment variables extraction
  const envVars = parseEnvFiles(fetchedFiles);

  // Existing README excerpt (up to 2000 chars)
  let readmeExcerpt = "";
  for (const [p, t] of fetchedFiles) {
    if (/^readme\.md$/i.test(p.split("/").pop() || "")) {
      readmeExcerpt = t
        .replace(/<!--[\s\S]*?-->/g, "")
        .slice(0, 2000)
        .trim();
      break;
    }
  }

  return {
    languages,
    frameworks: Array.from(new Set(frameworks)),
    package_manager: packageManager,
    entry_point: entryPoint,
    scripts: pkgScripts,
    dependencies: Array.from(new Set(allDeps)).slice(0, 30),
    devDependencies: Array.from(new Set(allDevDeps)).slice(0, 20),
    has_docker: hasDocker,
    has_tests: hasTests,
    has_ci: hasCi,
    license: license || "",
    folder_structure: folderStructure,
    env_vars: envVars.slice(0, 16),
    readme_excerpt: readmeExcerpt,
  };
}

/**
 * Normalizes Markdown: strips outer code wrapping, normalizes fancy quotes, ensures clean spacing.
 */
function cleanWrappingFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```markdown\n") && t.endsWith("\n```")) t = t.slice(12, -4).trim();
  else if (t.startsWith("```md\n") && t.endsWith("\n```")) t = t.slice(6, -4).trim();
  else if (t.startsWith("```\n") && t.endsWith("\n```")) t = t.slice(4, -4).trim();

  // Replace smart/curly punctuation with clean ASCII
  t = t
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0]/g, " ")
    .replace(/\uFFFD/g, "");

  // Fix empty or broken badge tags
  t = t.replace(/\[!\[\s*\]\(\s*\)\]\(\s*\)/g, "");

  // Ensure headings have space after '#'
  t = t.replace(/^(#{1,6})([^\s#])/gm, "$1 $2");

  // Prevent multiple consecutive blank lines
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

/** Section descriptions for strict prompt mapping. */
const SECTION_INSTRUCTIONS: Record<string, string> = {
  Installation:
    "Step-by-step setup, prerequisite versions, package manager install commands, and environment setup.",
  Usage:
    "Practical, realistic code examples showing how to import, configure, and run the project.",
  "API Docs":
    "Detailed API reference documenting key exports, functions, route handlers, CLI commands, or methods.",
  API: "Detailed API reference documenting key exports, functions, route handlers, CLI commands, or methods.",
  Contributing:
    "Clear guide for contributing, branch naming, running tests, and opening pull requests.",
  License: "Explicit license statement matching the detected license.",
  Badges:
    "DO NOT make a separate ## Badges section. Instead, place an aligned row of Shields.io badges immediately below the main title.",
  "Tech Stack":
    "Table or list of core languages, frameworks, and notable libraries with their architectural purpose.",
  "Folder Structure":
    "ASCII code tree displaying the repository layout with short explanations of main directories.",
  "Project Structure":
    "ASCII code tree displaying the repository layout with short explanations of main directories.",
  Features:
    "Clear bullet points or subheadings detailing the key capabilities and architectural strengths.",
  Architecture:
    "System architecture breakdown, data/request flow, modular design, and core abstractions.",
  Performance: "Performance characteristics, concurrency, caching, bundle size, or benchmarks.",
  Security:
    "Security best practices, input validation, authentication, and vulnerability reporting.",
  Deployment: "Production build commands and deployment instructions appropriate for the stack.",
  Testing: "How to run test suites using the project's actual test commands.",
  FAQ: "Frequently asked questions, common pitfalls, and troubleshooting tips.",
  Changelog: "Release history and version highlights.",
  Authors: "Author information, maintainers, and community acknowledgments.",
};

/**
 * Coarse token estimator (Groq free tier counts input+output tokens per minute;
 * gpt-oss models ~4 chars/token on average for mixed code+prose).
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.6);
}

/** Clamp context volume so that input + max_tokens stays under the 8000 TPM budget. */
function clampContextToBudget(
  sourceSnippets: { path: string; snippet: string }[],
  exportedSymbols: { file: string; symbol: string; kind: string }[],
  readmeExcerpt: string,
  maxTokens: number,
): {
  sourceSnippets: { path: string; snippet: string }[];
  exportedSymbols: { file: string; symbol: string; kind: string }[];
  readmeExcerpt: string;
} {
  const budget = 8000 - maxTokens - 700; // reserve ~700 for system + prompt scaffolding
  let used = 0;

  let material = sourceSnippets.map((s) => ({ ...s }));
  let symbols = [...exportedSymbols];
  let excerpt = readmeExcerpt;

  const fullText =
    (material.length ? material.map((s) => `${s.path}\n${s.snippet}`).join("\n") : "") +
    (symbols.length ? symbols.map((s) => s.file + s.symbol).join("\n") : "") +
    excerpt;

  if (estimateTokens(fullText) <= budget) {
    return { sourceSnippets: material, exportedSymbols: symbols, readmeExcerpt: excerpt };
  }

  // 1. Trim export symbols first (lowest value per token).
  while (symbols.length > 0) {
    const tail = symbols.slice();
    tail.pop();
    used = estimateTokens(
      (material.length ? material.map((s) => `${s.path}\n${s.snippet}`).join("\n") : "") +
        (tail.length ? tail.map((s) => s.file + s.symbol).join("\n") : "") +
        excerpt,
    );
    if (used <= budget || tail.length === 0) {
      symbols = tail;
      break;
    }
    symbols = tail;
  }

  // 2. Trim snippets from the longest tails, then trim the excerpt.
  let iter = 0;
  while (iter++ < 40) {
    const usedNow = estimateTokens(
      (material.length ? material.map((s) => `${s.path}\n${s.snippet}`).join("\n") : "") +
        (symbols.length ? symbols.map((s) => s.file + s.symbol).join("\n") : "") +
        excerpt,
    );
    if (usedNow <= budget) break;
    if (material.length > 1) {
      material = material.slice(0, material.length - 1);
    } else if (material.length === 1) {
      const last = material[0];
      material[0] = {
        path: last.path,
        snippet: last.snippet.slice(0, Math.floor(last.snippet.length / 2)),
      };
    } else if (excerpt.length > 400) {
      excerpt = excerpt.slice(0, Math.floor(excerpt.length / 2));
    } else {
      break;
    }
  }

  return { sourceSnippets: material, exportedSymbols: symbols, readmeExcerpt: excerpt };
}

/** Formats package.json deps/devDeps as `name@version` so the model keys off real versions. */
function versionedDeps(fetchedFiles: Map<string, string>): { deps: string[]; devDeps: string[] } {
  let pkgText = fetchedFiles.get("package.json");
  if (!pkgText) {
    for (const [p, t] of fetchedFiles) {
      if (p.endsWith("package.json")) {
        pkgText = t;
        break;
      }
    }
  }
  if (!pkgText) return { deps: [], devDeps: [] };
  try {
    const pkg = JSON.parse(pkgText);
    const fmt = (obj: unknown) =>
      Object.entries((obj as Record<string, string>) || {}).map(([n, v]) => `${n}@${v}`);
    return {
      deps: fmt(pkg.dependencies).slice(0, 30),
      devDeps: fmt(pkg.devDependencies).slice(0, 20),
    };
  } catch {
    return { deps: [], devDeps: [] };
  }
}

export async function runReadmeGeneration(rawInput: unknown): Promise<ReadmeResult> {
  const data = Input.parse(rawInput);
  const key = process.env.GENERATIVE_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error("Missing GENERATIVE_KEY. Add your API key to the .env file.");
  }
  if (!data.projectUrl && !data.description) {
    throw new Error("Provide a GitHub URL or a project description.");
  }

  // Check cache
  const cacheKeyStr = cacheKey(data);
  const cached = cacheGet(cacheKeyStr);
  if (cached) {
    return cached;
  }

  const repoInfo = {
    title: "",
    description: "",
    version: "",
    owner: "",
    repo: "",
    packageManager: "npm",
    scripts: {} as Record<string, string>,
    dependencies: [] as string[],
    devDependencies: [] as string[],
    main: "",
  };

  let repoTree = "";
  let folderStructure: string[] = [];
  let fetchedFiles = new Map<string, string>();
  let allFilePaths: string[] = [];
  let githubMeta: RepoMetadata | null = null;
  let languageBytes: Record<string, number> = {};
  let hasDocker = false;
  let hasTests = false;
  let hasCi = false;

  const repo = parseRepoUrl(data.projectUrl);
  if (data.projectUrl.trim() && !repo) {
    throw new Error("Invalid GitHub URL. Expected format: github.com/owner/repo");
  }

  if (repo) {
    repoInfo.owner = repo.owner;
    repoInfo.repo = repo.repo;
    repoInfo.title = repo.repo.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    githubMeta = await fetchRepoMetadata(repo.owner, repo.repo);
    const branch = githubMeta.defaultBranch || "main";

    const [langResult, scan] = await Promise.all([
      fetchLanguages(repo.owner, repo.repo),
      scanRepository(repo.owner, repo.repo, branch),
    ]);

    languageBytes = langResult;
    repoTree = scan.tree;
    folderStructure = scan.folderStructure;
    fetchedFiles = scan.fetchedFiles;
    repoInfo.packageManager = scan.packageManager;
    allFilePaths = scan.allFilePaths;
    hasDocker = scan.hasDocker;
    hasTests = scan.hasTests;
    hasCi = scan.hasCi;

    let pkgContent = fetchedFiles.get("package.json");
    if (!pkgContent) {
      for (const [p, t] of fetchedFiles) {
        if (p.endsWith("package.json")) {
          pkgContent = t;
          break;
        }
      }
    }

    if (pkgContent) {
      const parsed = parsePackageJson(pkgContent);
      if (parsed) {
        if (parsed.description) repoInfo.description = parsed.description;
        if (parsed.version) repoInfo.version = parsed.version;
        repoInfo.scripts = parsed.scripts;
        repoInfo.dependencies = parsed.dependencies;
        repoInfo.devDependencies = parsed.devDependencies;
        if (parsed.main) repoInfo.main = parsed.main;
      }
    }

    // Prefer the repo's REAL identity (GitHub metadata + actual README) over
    // generic starter-template values from package.json.
    const readmeContent = [...fetchedFiles.entries()].find(
      ([p, t]) => /(^|\/)(readme\.md|readme)$/i.test(p) && t.trim().length > 0,
    )?.[1];
    const readmeIdentity = readmeContent
      ? extractReadmeIdentity(readmeContent)
      : { title: "", summary: "" };

    const repoNameHumanized = repo.repo
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Title priority: README heading > repo name (humanized)
    if (readmeIdentity.title) {
      repoInfo.title = readmeIdentity.title;
    } else {
      repoInfo.title = repoNameHumanized;
    }

    // Description priority: GitHub description > README summary > package.json description
    if (githubMeta.description && githubMeta.description.trim().length > 0) {
      repoInfo.description = githubMeta.description.trim();
    } else if (readmeIdentity.summary) {
      repoInfo.description = readmeIdentity.summary;
    }
    if (repoInfo.description.toLowerCase().includes("starter") && readmeIdentity.summary) {
      repoInfo.description = readmeIdentity.summary || repoInfo.description;
    }
  }

  const projectTitle =
    repoInfo.title ||
    (data.description
      ? data.description
          .split("\n")[0]
          .replace(/^#+\s*/, "")
          .trim()
      : "Project");
  const projectDesc = repoInfo.description || data.description || "";

  // Grounded fact extraction
  let facts: RepoFacts;
  if (repo) {
    facts = buildRepoFacts({
      allFilePaths,
      fetchedFiles,
      packageManager: repoInfo.packageManager,
      folderStructure,
      hasDocker,
      hasTests,
      hasCi,
      languageBytes,
      githubLanguage: githubMeta?.language,
      license: githubMeta?.license,
    });
  } else {
    const synthesized = synthesizeFromDescription(data.description);
    facts = {
      languages: synthesized.languages,
      frameworks: synthesized.frameworks,
      package_manager: synthesized.packageManager,
      entry_point: synthesized.entryPoint,
      scripts: synthesized.scripts,
      dependencies: synthesized.dependencies,
      devDependencies: [],
      has_docker: synthesized.frameworks.includes("Docker"),
      has_tests: true,
      has_ci: false,
      license: "MIT",
      folder_structure: [],
      env_vars: [],
      readme_excerpt: "",
    };
  }

  const sourceSnippets = extractSourceSnippets(fetchedFiles);
  const exportedSymbols = extractExportedSymbols(fetchedFiles);

  const componentCount = allFilePaths.filter((p) =>
    /\/(components|views|widgets|ui|modules|pkg|lib)\/.*\.(tsx|jsx|vue|svelte|py|go|rs|c|cpp)$/i.test(
      p,
    ),
  ).length;

  const apiRoutes = allFilePaths.filter((p) =>
    /\/(routes|api|controllers|endpoints|handlers|cmd)\/.*\.(ts|js|py|go|rs|c|cpp)$/i.test(p),
  ).length;

  const databaseModels = allFilePaths.filter((p) =>
    /\/(models|schema|entities|db|types)\/.*$/i.test(p),
  ).length;

  const discovery: ReadmeDiscovery = {
    inferredTitle: projectTitle,
    inferredDescription: projectDesc,
    detectedStack: facts.languages.slice(0, 8).concat(facts.frameworks.slice(0, 6)),
    fileCount: allFilePaths.length || (repo ? fetchedFiles.size : 12),
    componentCount: repo
      ? componentCount
      : facts.frameworks.includes("React") || facts.frameworks.includes("Vue")
        ? 8
        : 0,
    apiRoutes: repo
      ? apiRoutes
      : facts.frameworks.includes("Express") || facts.frameworks.includes("FastAPI")
        ? 6
        : 0,
    databaseModels: repo
      ? databaseModels
      : facts.frameworks.includes("PostgreSQL") || facts.frameworks.includes("MongoDB")
        ? 4
        : 0,
  };

  // Build filter instructions
  const styleProfiles = {
    minimal: {
      targetWords: "300-500 words",
      guidance:
        "Crisp, punchy, quickstart-focused. Short paragraphs, zero filler, essential install commands, and a single minimal code example.",
    },
    standard: {
      targetWords: "750-1100 words",
      guidance:
        "Balanced, production-grade open-source README. Clear architecture summary, well-structured features, prerequisites, realistic step-by-step setup, realistic usage examples, and development commands.",
    },
    comprehensive: {
      targetWords: "1200-2000 words",
      guidance:
        "Deep-dive technical documentation. Comprehensive architectural breakdown (data flow, components), full API reference with parameter details, environment configuration tables, testing & security guides, and production deployment instructions.",
    },
  };

  const toneProfiles = {
    technical:
      "Precise, engineer-to-engineer, CLI-driven, rigorous architectural terminology. Code-first, zero marketing buzzwords, authoritative.",
    friendly:
      "Approachable, welcoming, community-oriented. Conversational yet capable, clear analogies, helpful tips/callouts (> [!TIP], > [!NOTE]), encouraging contributors.",
    enterprise:
      "Formal, robust, production-grade, compliance & security-focused. Emphasizes enterprise architecture, high availability, environment isolation, SLAs, and auditability.",
  };

  const selectedSections = data.sections;
  const includeBadges = selectedSections.includes("Badges");
  const includeFolderStructure =
    selectedSections.includes("Folder Structure") || selectedSections.includes("Project Structure");

  // Format section prompt instructions
  const sectionPromptList = selectedSections
    .filter((s) => s !== "Badges")
    .map(
      (s) => `- ## ${s}: ${SECTION_INSTRUCTIONS[s] || "Thorough, project-specific documentation."}`,
    )
    .join("\n");

  // Token budget tuned by style
  const maxTokens = data.style === "comprehensive" ? 4200 : data.style === "standard" ? 3200 : 1800;

  // Clamp deep-fetch context to fit the provider token-per-minute budget.
  const clamped = clampContextToBudget(
    sourceSnippets,
    exportedSymbols,
    facts.readme_excerpt || "",
    maxTokens,
  );

  const systemPrompt = `You are a principal software engineer and world-class technical writer.
Generate a beautiful, accurate, developer-grade README.md grounded deeply in the provided project context.

### MANDATORY RULES:
1. FILTER 1 - STYLE (${data.style.toUpperCase()}):
   - Target length: ${styleProfiles[data.style].targetWords}
   - Style direction: ${styleProfiles[data.style].guidance}

2. FILTER 2 - TONE (${data.tone.toUpperCase()}):
   - Tone direction: ${toneProfiles[data.tone]}

3. FILTER 3 - SECTIONS (STRICT ADHERENCE):
   - You must ONLY include sections explicitly requested by the user:
${sectionPromptList}
   ${includeBadges ? `- BADGES: Include a neat, aligned Markdown row of Shields.io badges immediately below the \`# ${projectTitle}\` header and tagline. ALLOWED badges (use ONLY these, from the provided facts): License (${facts.license || "see LICENSE"}), primary language (${facts.languages[0] || "see facts"}). Do NOT create badges for package name, version, bundler, or any other invented label. Do NOT create a separate '## Badges' heading.` : "- BADGES: The user did NOT request badges. Do NOT include any Shields.io badges or badge row."}
   ${includeFolderStructure ? "- FOLDER STRUCTURE: Include an accurate ASCII directory tree code block under '## Folder Structure' or '## Project Structure'." : "- FOLDER STRUCTURE: The user did NOT request folder structure. Do NOT include an ASCII directory tree or folder layout anywhere."}
   - CRITICAL: Do NOT generate ANY section heading that is not in the requested list above! Never add extra unsolicited sections.

4. 100% GROUNDED & ACCURATE:
   - Ground all explanations, commands, and code samples in the actual languages (${facts.languages.join(", ") || "the project's stack"}), frameworks (${facts.frameworks.join(", ") || "standard libraries"}), package manager (${facts.package_manager}), and real scripts (${Object.keys(facts.scripts).join(", ") || "standard scripts"}).
   - NEVER fabricate unrelated programming languages or frameworks (e.g. do not mention Rust, Go, Python, Docker, Kubernetes, or microservices unless explicitly present in the provided tech stack).
   - Do NOT begin sentences with the capitalized word 'Go' (use 'Navigate to', 'Proceed to', or 'Visit' instead) to prevent confusion with the Go programming language.
   - Use the REAL package name "${projectTitle}" or from the manifest when showing import statements or install commands.
   - For code examples, write realistic, working code based on the actual exported APIs and entry points shown in the source snippets.
   - Reference ONLY symbols listed in 'PUBLIC API SYMBOLS' and file paths that appear in the 'KEY SOURCE CODE SNIPPETS' or 'REPOSITORY STRUCTURE' sections. NEVER invent function names, class names, file names, or commands that are not present in the provided context.
   - Version honesty: when 'Dependencies (exact versions)' is listed, derive ALL version numbers in the Tech Stack / prerequisites from it verbatim (e.g. react@19.2.0 means React 19, never 18). Never guess a version that is not in the provided manifest.
   - Command honesty: use ONLY the package manager(s) and script names listed under 'Package Manager' and 'Scripts'. If the package manager is 'multiple (X + Y)', use YAML-style wording like 'npm or bun' and show the command for the manager referenced, or write 'npm (or bun) run dev'. Never claim commands that do not exist in the provided scripts.
   - Path honesty: do NOT state build output paths (e.g. 'dist/'), port numbers, configuration file names, or directory layouts that are not present in 'REPOSITORY STRUCTURE' or the file list. When a detail is unknown, describe it generically.

5. ZERO FLUKE TEXTS:
   - NEVER write phrases like "As evidenced by fact JSON", "The repository is flagged as...", "None configured", or "[Insert description here]".
   - Write natural, cohesive, professional technical prose without awkward robotic boilerplate.
   - Start immediately with "# ${projectTitle}" (do NOT wrap the entire README in markdown code fences).`;

  // Build grounded context dossier
  const versioned = versionedDeps(fetchedFiles);
  const contextDossier = [
    `# PROJECT IDENTITY`,
    `Title: ${projectTitle}`,
    `Description: ${projectDesc || "None provided"}`,
    repoInfo.owner ? `GitHub Repository: ${repoInfo.owner}/${repoInfo.repo}` : "",
    repoInfo.version ? `Version: ${repoInfo.version}` : "",
    repoInfo.main ? `Primary Entry: ${repoInfo.main}` : `Primary Entry: ${facts.entry_point}`,
    ``,
    `# TECH STACK & ECOSYSTEM`,
    `Primary Languages: ${facts.languages.join(", ") || "General"}`,
    facts.frameworks.length > 0 ? `Frameworks & Tools: ${facts.frameworks.join(", ")}` : "",
    `Package Manager: ${facts.package_manager}`,
    facts.license ? `License: ${facts.license}` : "License: MIT (or see repository)",
    versioned.deps.length > 0
      ? `Dependencies (exact versions): ${versioned.deps.join(", ")}`
      : facts.dependencies.length > 0
        ? `Dependencies: ${facts.dependencies.join(", ")}`
        : "",
    versioned.devDeps.length > 0
      ? `Dev Dependencies (exact versions): ${versioned.devDeps.join(", ")}`
      : facts.devDependencies.length > 0
        ? `Dev Dependencies: ${facts.devDependencies.join(", ")}`
        : "",
    Object.keys(facts.scripts).length > 0
      ? `Scripts:\n${Object.entries(facts.scripts)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n")}`
      : "",
    facts.env_vars.length > 0 ? `Environment Variables: ${facts.env_vars.join(", ")}` : "",
    ``,
    clamped.readmeExcerpt ? `# EXISTING README SUMMARY / PURPOSE\n${clamped.readmeExcerpt}\n` : "",
    clamped.sourceSnippets.length > 0
      ? `# KEY SOURCE CODE SNIPPETS & EXPORTS\n${clamped.sourceSnippets.map((s) => `--- File: ${s.path} ---\n${s.snippet}`).join("\n\n")}\n`
      : "",
    clamped.exportedSymbols.length > 0
      ? `# PUBLIC API SYMBOLS (REAL — DO NOT INVENT OTHERS)\n${clamped.exportedSymbols.map((s) => `${s.file} :: ${s.kind} ${s.symbol}`).join("\n")}\n`
      : "",
    includeFolderStructure
      ? `# REPOSITORY STRUCTURE (ASCII TREE)\n\`\`\`\n${repoTree || facts.folder_structure.join("\n")}\n\`\`\``
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${contextDossier}

---

# INSTRUCTION:
Write the complete README.md now.
- Adhere strictly to the Style (${data.style}), Tone (${data.tone}), and requested Sections (${selectedSections.join(", ")}).
- Start directly with "# ${projectTitle}".`;

  const { primary: primaryModel, fallback: fallbackModel } = getModelCandidates(
    process.env.AI_MODEL,
    key,
  );
  const modelCandidates = [primaryModel, fallbackModel];

  let text = "";
  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    try {
      const result = await groqChatComplete({
        apiKey: key,
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens,
        maxRetries: 2,
      });

      if (result.text && result.text.trim().length > 60) {
        text = result.text.trim();
        break;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[generateReadme] Model ${model} failed: ${msg}`);
      lastError = err instanceof Error ? err : new Error(msg);
    }
  }

  if (!text) {
    const rawMsg = lastError?.message || "Generation returned empty";
    if (rawMsg.includes("429") || rawMsg.includes("rate_limit") || rawMsg.includes("quota")) {
      throw new Error("AI rate limit reached. Please wait a moment and try again.");
    }
    if (rawMsg.includes("401") || rawMsg.includes("403") || rawMsg.includes("API key")) {
      throw new Error("Invalid AI API key. Please check GENERATIVE_KEY in your .env file.");
    }
    throw new Error(`README generation failed: ${rawMsg.slice(0, 120)}`);
  }

  // Sanitize Markdown cleanly (non-destructive)
  const cleanReadme = cleanWrappingFences(text);

  const finalResult: ReadmeResult = {
    readme: cleanReadme,
    discovery,
  };

  cacheSet(cacheKeyStr, finalResult);
  return finalResult;
}
