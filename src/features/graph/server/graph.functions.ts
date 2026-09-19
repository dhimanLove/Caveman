import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkIpLimit, getClientIp, isSameOrigin } from "@/shared/lib/request-guard.server";
import { fetchWithTimeout, isRecord } from "@/shared/lib/http.server";

interface CommitNode {
  sha: string;
  message: string;
  author: string;
  avatar: string;
  date: string;
  parents: string[];
  additions?: number;
  deletions?: number;
}

interface GraphData {
  nodes: CommitNode[];
  edges: { source: string; target: string }[];
  repoName: string;
  branch: string;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

// GitHub owner/repo names only - blocks traversal and odd hosts before any fetch
const GH_NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/;

const Input = z.object({
  url: z.string().min(1, "URL is required").max(200),
});

export const fetchCommitGraph = createServerFn({ method: "GET" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<GraphData> => {
    if (!isSameOrigin()) {
      throw new Error("Invalid request.");
    }

    // Per-IP secondary limit (unauthenticated endpoint - primary abuse shield)
    if (!checkIpLimit(getClientIp(), "graph").allowed) {
      throw new Error("Too many requests. Please try again later.");
    }

    const { url } = data;

    const match = url.match(/github\.com\/([^/\s?#]+)\/([^/\s?#]+)/);
    if (!match || !GH_NAME_RE.test(match[1]) || !GH_NAME_RE.test(match[2].replace(/\.git$/, ""))) {
      throw new Error("Invalid GitHub URL. Expected format: github.com/owner/repo");
    }

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, "");

    const token = process.env.GITHUB_TOKEN || "";
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "caveman-graph",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    // Fetch commits (up to 100 for performance)
    const commitRes = await fetchWithTimeout(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
      { headers },
      8_000,
    );

    if (!commitRes.ok) {
      // Log status server-side; return a generic client-safe message
      console.warn(`[graph] GitHub API ${commitRes.status} for ${owner}/${repo}`);
      if (commitRes.status === 404) throw new Error(`Repository ${owner}/${repo} not found.`);
      if (commitRes.status === 403 || commitRes.status === 429) {
        throw new Error("GitHub API rate limit exceeded. Try again later.");
      }
      throw new Error("Could not load commit data. Try again later.");
    }

    const commitsPayload: unknown = await commitRes.json();
    if (!Array.isArray(commitsPayload)) {
      throw new Error("GitHub returned an invalid commit response.");
    }

    const nodes: CommitNode[] = commitsPayload
      .map((raw): CommitNode | null => {
        const commit = asRecord(raw);
        const details = asRecord(commit.commit);
        const author = asRecord(details.author);
        const sha = asString(commit.sha);
        if (!sha) return null;
        const message = asString(details.message, "(no commit message)").split("\n")[0];
        const parents = Array.isArray(commit.parents)
          ? commit.parents
              .map((parent) => asString(asRecord(parent).sha))
              .filter((parentSha): parentSha is string => parentSha.length > 0)
          : [];
        return {
          sha,
          message,
          author: asString(author.name, "Unknown"),
          avatar: asString(asRecord(commit.author).avatar_url),
          date: asString(author.date),
          parents,
        };
      })
      .filter((node): node is CommitNode => node !== null);

    // Build edges from parent relationships
    const edgeSet = new Set<string>();
    const nodeShas = new Set(nodes.map((node) => node.sha));
    const edges: { source: string; target: string }[] = [];
    for (const node of nodes) {
      for (const parentSha of node.parents) {
        // Only include edges where both nodes are in our set
        if (nodeShas.has(parentSha)) {
          const key = `${node.sha}-${parentSha}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ source: node.sha, target: parentSha });
          }
        }
      }
    }

    // Get repo info and default branch
    const repoRes = await fetchWithTimeout(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers },
      8_000,
    );
    const repoPayload: unknown = repoRes.ok ? await repoRes.json() : {};
    const branch = asString(asRecord(repoPayload).default_branch, "main");

    return {
      nodes,
      edges,
      repoName: `${owner}/${repo}`,
      branch,
    };
  });
