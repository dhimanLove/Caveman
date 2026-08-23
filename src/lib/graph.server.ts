import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

const Input = z.object({
  url: z.string().min(1, "URL is required"),
});

export const fetchCommitGraph = createServerFn({ method: "GET" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<GraphData> => {
    const { url } = data;

    // Parse GitHub URL: github.com/owner/repo or full URL
    const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (!match) throw new Error("Invalid GitHub URL. Expected format: github.com/owner/repo");

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, "");

    const token = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN || "";
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "caveman-graph",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    // Fetch commits (up to 100 for performance)
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
      { headers }
    );

    if (!commitRes.ok) {
      const errText = await commitRes.text();
      if (commitRes.status === 403) throw new Error("GitHub API rate limit exceeded. Try again later or set GITHUB_TOKEN.");
      if (commitRes.status === 404) throw new Error(`Repository ${owner}/${repo} not found.`);
      throw new Error(`GitHub API error (${commitRes.status}): ${errText}`);
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
