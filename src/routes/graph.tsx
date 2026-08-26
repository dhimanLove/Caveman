import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconLink as LinkIcon, IconLoader as CircleNotch, IconWarning as Warning, IconArrowLeft as ArrowLeft } from "@/components/icons";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CommitGraph } from "@/components/graph/CommitGraph";
import { CommitDetail } from "@/components/graph/CommitDetail";
import { fetchCommitGraph } from "@/lib/graph.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommitNode {
  sha: string;
  message: string;
  author: string;
  avatar: string;
  date: string;
  parents: string[];
}

interface GraphData {
  nodes: CommitNode[];
  edges: { source: string; target: string }[];
  repoName: string;
  branch: string;
}

export const Route = createFileRoute("/graph")({
  head: () => {
    const url = "https://caveman-lilac.vercel.app/graph";
    return {
      meta: [
        { title: "Graph - Caveman" },
        {
          name: "description",
          content:
            "Visualize any GitHub repo's commit history as an interactive force-directed graph. Drag nodes, explore connections.",
        },
        { property: "og:title", content: "Commit Graph - Caveman" },
        {
          property: "og:description",
          content:
            "Visualize any GitHub repo's commit history as an interactive, animated force-directed graph. Drag nodes, explore connections.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: "https://caveman-lilac.vercel.app/og-image.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:site_name", content: "Caveman" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Commit Graph - Caveman" },
        {
          name: "twitter:description",
          content:
            "Visualize any GitHub repo's commit history as an interactive, animated force-directed graph.",
        },
        { name: "twitter:image", content: "https://caveman-lilac.vercel.app/og-image.png" },
        { name: "robots", content: "index, follow" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: GraphPage,
});

function GraphPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<CommitNode | null>(null);

  const handleGenerate = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setGraphData(null);
    setSelectedNode(null);

    try {
      const data = await fetchCommitGraph({ data: { url: url.trim() } });
      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch commit data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header section */}
        <section className="py-12 md:py-16 bg-paper border-b border-bone">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-cream animate-float transition-colors duration-300 hover:bg-electric-iris">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="5" cy="12" r="3" fill="currentColor"/>
                    <circle cx="19" cy="6" r="3" fill="currentColor"/>
                    <circle cx="19" cy="18" r="3" fill="currentColor"/>
                    <line x1="8" y1="11" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="8" y1="13" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
              </div>
              <h1 className="text-[clamp(36px,5vw,48px)] text-ink leading-[1.1] font-light text-center">
                Commit <span className="gradient-text">Graph</span>
              </h1>
              <p className="mt-2 text-sm text-ink/70 max-w-[56ch] mx-auto leading-relaxed text-center">
                Paste any GitHub repo URL to see its commit history as an interactive, animated map. Drag
                nodes, watch them spring, click to inspect.
              </p>

              {/* Input */}
              <div className="mt-8 max-w-md mx-auto w-full">
                <div className="flex gap-2 justify-center items-center flex-wrap">
                  <div className="relative flex-1 min-w-0">
                    <LinkIcon
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40"
                    />
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                      placeholder="github.com/user/repo"
                      className="h-10 pl-10 pr-3 text-sm bg-paper text-ink placeholder:text-ink/40 border-bone shadow-none w-full"
                    />
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !url.trim()}
                    className="h-10 shrink-0 disabled:opacity-40 px-4 text-sm rounded-lg shadow-md bg-ink text-cream hover:bg-electric-iris ml-2"
                  >
                    {loading ? <CircleNotch size={15} className="animate-spin" /> : <>Map it</>}
                  </Button>
                </div>

                {/* Quick examples */}
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-ink/30">
                  <span>Try:</span>
                  <button
                    onClick={() => setUrl("github.com/facebook/react")}
                    className="hover:text-ink transition-colors underline underline-offset-2"
                  >
                    facebook/react
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => setUrl("github.com/vercel/next.js")}
                    className="hover:text-ink transition-colors underline underline-offset-2"
                  >
                    vercel/next.js
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => setUrl("github.com/torvalds/linux")}
                    className="hover:text-ink transition-colors underline underline-offset-2"
                  >
                    torvalds/linux
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 max-w-lg mx-auto flex items-start gap-2 rounded-lg border border-err/30 p-3 text-err bg-err/5"
              >
                <Warning size={14} className="shrink-0 mt-0.5" />
                <span className="text-xs font-medium">{error}</span>
              </motion.div>
            )}
          </div>
        </section>

        {/* Graph section */}
        {graphData && (
          <section className="py-10 md:py-14">
            <div className="mx-auto max-w-[1200px] px-6">
              {/* Repo info bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs text-ink/60">Showing</span>
                  <span className="text-sm font-medium text-ink truncate max-w-[200px] sm:max-w-none">{graphData.repoName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-bone text-ink/40">
                    {graphData.branch}
                  </span>
                  <span className="text-xs text-ink/40">· {graphData.nodes.length} commits</span>
                </div>
                <Button
                  onClick={() => setGraphData(null)}
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs self-start sm:self-auto"
                >
                  <ArrowLeft size={12} /> New search
                </Button>
              </div>

              {/* Graph + Detail side by side */}
              <div className="flex flex-col lg:flex-row gap-5">
                <div className="flex-1 min-w-0">
                  <CommitGraph
                    nodes={graphData.nodes}
                    edges={graphData.edges}
                    onSelect={(node) => setSelectedNode(node)}
                  />
                </div>

                <div className="lg:w-[300px] shrink-0 flex flex-col gap-3">
                  <ScrollArea className="max-h-[500px] md:max-h-none rounded-2xl">
                    <CommitDetail node={selectedNode} onClose={() => setSelectedNode(null)} />

                    {!selectedNode && (
                      <Card className="rounded-2xl border-bone bg-paper shadow-none">
                        <CardContent className="p-6 text-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-ink/20 mx-auto mb-2">
                            <circle cx="5" cy="12" r="3" fill="currentColor"/>
                            <circle cx="19" cy="6" r="3" fill="currentColor"/>
                            <circle cx="19" cy="18" r="3" fill="currentColor"/>
                            <line x1="8" y1="11" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5"/>
                            <line x1="8" y1="13" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                          <p className="text-xs text-ink/40">
                            Click any node to inspect its commit details
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </ScrollArea>

                  {/* Legend */}
                  <Card className="rounded-lg border-bone bg-paper shadow-none">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-medium text-ink/40 uppercase tracking-widest mb-2">
                        Legend
                      </p>
                      <div className="space-y-1.5 text-xs text-ink/60">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-electric-iris shrink-0" />
                          <span>Commit node</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-0.5 bg-ink/20 shrink-0" />
                          <span>Parent-child edge</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-ink ring-2 ring-electric-iris/50 shrink-0" />
                          <span>Merge commit (2+ parents)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Empty state */}
        {!graphData && !loading && (
          <section className="py-20">
            <div className="mx-auto max-w-[600px] px-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-paper border border-bone flex items-center justify-center mx-auto mb-6">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2L2 22H22L12 2Z" fill="var(--color-ink)" opacity="0.6" />
                </svg>
              </div>
              <h2 className="text-xl font-light text-ink mb-2">See the shape of your repo</h2>
              <p className="text-sm text-ink/60 max-w-md mx-auto leading-relaxed">
                Every commit is a dot. Every connection is an elastic spring. Drag them, watch them
                snap back - explore your repo's history like never before.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
                {[
                  { glyph: "-", label: "Elastic edges" },
                  { glyph: "+", label: "Drag & drop" },
                  { glyph: "•", label: "Click to inspect" },
                  { glyph: "/", label: "Live physics" },
                ].map((f) => (
                  <Card key={f.label} className="rounded-lg border-bone bg-paper shadow-none">
                    <CardContent className="p-3">
                      <p className="text-lg text-ink">{f.glyph}</p>
                      <p className="text-[10px] text-ink/60 mt-1">{f.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
