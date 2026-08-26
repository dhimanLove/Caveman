import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkIpLimit, getClientIp, isSameOrigin } from "./request-guard.server";

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

    // Secondary per-IP limit (public endpoint - no auth required)
    if (!checkIpLimit(getClientIp(), "graph")) {
      throw new Error("Too many requests. Please try again later.");
    }

    const { url } = data;

    const match = url.match(/github\.com\/([^\/\s?#]+)\/([^\/\s?#]+)/);
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
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
      { headers },
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

    const commits: any[] = await commitRes.json();

    const nodes: CommitNode[] = commits.map((c: any) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      author: c.commit.author?.name || "Unknown",
      avatar: c.author?.avatar_url || "",
      date: c.commit.author?.date || "",
      parents: c.parents?.map((p: any) => p.sha) || [],
    }));

    // Build edges from parent relationships
    const edgeSet = new Set<string>();
    const edges: { source: string; target: string }[] = [];
    for (const node of nodes) {
      for (const parentSha of node.parents) {
        // Only include edges where both nodes are in our set
        if (nodes.some((n) => n.sha === parentSha)) {
          const key = `${node.sha}-${parentSha}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ source: node.sha, target: parentSha });
          }
        }
      }
    }

    // Get repo info and default branch
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    const repoData = repoRes.ok ? await repoRes.json() : {};
    const branch = repoData.default_branch || "main";

    return {
      nodes,
      edges,
      repoName: `${owner}/${repo}`,
      branch,
    };
  });
