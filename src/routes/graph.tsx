import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconLink as LinkIcon,
  IconLoader as CircleNotch,
  IconWarning as Warning,
  IconArrowLeft as ArrowLeft,
} from "@/components/icons";
import gsap from "gsap";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CommitGraph } from "@/components/graph/CommitGraph";
import { CommitDetail } from "@/components/graph/CommitDetail";
import { fetchCommitGraph } from "@/lib/graph.server";

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
  const emptyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (graphData || loading) return;

    const ctx = gsap.context(() => {
      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!isReduced) {
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

        tl.fromTo(
          ".graph-intro-icon",
          { opacity: 0, scale: 0.5, rotate: -10 },
          { opacity: 1, scale: 1, rotate: 0, duration: 0.8, ease: "elastic.out(1, 0.6)" },
        )
          .fromTo(
            ".graph-title-word",
            { opacity: 0, y: 50, filter: "blur(6px)" },
            { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.08 },
            "-=0.4",
          )
          .fromTo(
            ".graph-sub",
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.7 },
            "-=0.5",
          )
          .fromTo(
            ".graph-input-wrap",
            { opacity: 0, y: 20, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.7 },
            "-=0.4",
          )
          .fromTo(
            ".graph-float",
            { opacity: 0, scale: 0.5, y: 60 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 1.2,
              stagger: 0.12,
              ease: "back.out(1.4)",
            },
            "-=0.5",
          )
          .fromTo(
            ".graph-feature",
            { opacity: 0, y: 30, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.08 },
            "-=0.6",
          );

        gsap.to(".graph-float", {
          y: "-=12",
          duration: 3.5,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
          stagger: 0.4,
        });
      } else {
        gsap.set(
          [
            ".graph-intro-icon",
            ".graph-title-word",
            ".graph-sub",
            ".graph-input-wrap",
            ".graph-float",
            ".graph-feature",
          ],
          { opacity: 1, filter: "blur(0px)", scale: 1, y: 0 },
        );
      }
    }, emptyRef);

    return () => ctx.revert();
  }, [graphData, loading]);

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
        <section className="relative py-12 md:py-16 overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-[0.03] pointer-events-none" />

          <div className="relative mx-auto max-w-[1200px] px-6">
            <div className="max-w-3xl mx-auto text-center">
              {/* Animated network icon */}
              <div className="graph-intro-icon flex items-center justify-center mb-6">
                <div className="relative">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-ink"
                  >
                    <circle cx="12" cy="32" r="5" fill="currentColor" opacity="0.9" />
                    <circle cx="32" cy="12" r="5" fill="currentColor" opacity="0.7" />
                    <circle cx="52" cy="20" r="5" fill="currentColor" opacity="0.8" />
                    <circle cx="52" cy="44" r="5" fill="currentColor" opacity="0.8" />
                    <circle cx="32" cy="52" r="5" fill="currentColor" opacity="0.7" />
                    <circle cx="32" cy="32" r="7" fill="var(--color-electric-iris)" />
                    <line x1="16" y1="30" x2="27" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                    <line x1="35" y1="14" x2="48" y2="19" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                    <line x1="52" y1="25" x2="52" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                    <line x1="48" y1="44" x2="35" y2="51" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                    <line x1="29" y1="52" x2="16" y2="35" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                    <line x1="16" y1="32" x2="27" y2="32" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                    <line x1="37" y1="32" x2="48" y2="22" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                    <line x1="37" y1="32" x2="48" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                    <line x1="27" y1="32" x2="32" y2="48" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                  </svg>
                </div>
              </div>

              <h1 className="editorial-display text-ink" style={{ fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.1 }}>
                <span className="graph-title-word block">Commit</span>
                <span className="graph-title-word block">
                  <span className="gradient-text font-normal">Graph</span>
                </span>
              </h1>

              <p className="graph-sub mt-4 text-sm text-fog max-w-[52ch] mx-auto leading-relaxed">
                Paste any GitHub repo URL to see its commit history as an interactive, animated map.
                Drag nodes, watch them spring, click to inspect.
              </p>

              {/* Input */}
              <div className="graph-input-wrap mt-8 max-w-md mx-auto w-full">
                <div className="flex gap-2 justify-center items-center">
                  <div className="relative flex-1 min-w-0">
                    <LinkIcon
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog"
                    />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                      placeholder="github.com/user/repo"
                      className="h-10 w-full pl-10 pr-3 text-sm bg-paper text-ink placeholder:text-fog border border-bone rounded-[4px] outline-none focus:border-ink transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !url.trim()}
                    className="btn-primary h-10 shrink-0 disabled:opacity-40 !px-4 text-sm cursor-pointer"
                  >
                    {loading ? (
                      <CircleNotch size={15} className="animate-spin" />
                    ) : (
                      "Map it"
                    )}
                  </button>
                </div>

                {/* Quick examples */}
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-fog">
                  <span>Try:</span>
                  {["facebook/react", "vercel/next.js", "torvalds/linux"].map((repo, i) => (
                    <span key={repo} className="flex items-center gap-2">
                      {i > 0 && <span>·</span>}
                      <button
                        onClick={() => setUrl(`github.com/${repo}`)}
                        className="hover:text-ink transition-colors underline underline-offset-2"
                      >
                        {repo}
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="mt-6 max-w-lg mx-auto flex items-start gap-2 rounded-lg border border-err/30 p-3 text-err bg-err/5"
                  >
                    <Warning size={14} className="shrink-0 mt-0.5" />
                    <span className="text-xs font-medium">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Graph section */}
        {graphData && (
          <section className="py-10 md:py-14">
            <div className="mx-auto max-w-[1200px] px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs text-fog">Showing</span>
                  <span className="text-sm font-medium text-ink truncate max-w-[200px] sm:max-w-none">
                    {graphData.repoName}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-bone text-fog">
                    {graphData.branch}
                  </span>
                  <span className="text-xs text-fog">· {graphData.nodes.length} commits</span>
                </div>
                <button
                  onClick={() => setGraphData(null)}
                  className="btn-outline h-8 gap-1 text-xs self-start sm:self-auto cursor-pointer"
                >
                  <ArrowLeft size={12} /> New search
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-5">
                <div className="flex-1 min-w-0">
                  <CommitGraph
                    nodes={graphData.nodes}
                    edges={graphData.edges}
                    onSelect={(node) => setSelectedNode(node)}
                  />
                </div>

                <div className="lg:w-[300px] shrink-0 flex flex-col gap-3">
                  <div className="max-h-[500px] md:max-h-none overflow-auto rounded-2xl">
                    <CommitDetail node={selectedNode} onClose={() => setSelectedNode(null)} />

                    {!selectedNode && (
                      <div className="rounded-2xl border border-bone bg-paper p-6 text-center">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="text-fog mx-auto mb-2"
                        >
                          <circle cx="5" cy="12" r="3" fill="currentColor" />
                          <circle cx="19" cy="6" r="3" fill="currentColor" />
                          <circle cx="19" cy="18" r="3" fill="currentColor" />
                          <line x1="8" y1="11" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5" />
                          <line x1="8" y1="13" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <p className="text-xs text-fog">Click any node to inspect its commit details</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-bone bg-paper p-4">
                    <p className="text-[10px] font-medium text-fog uppercase tracking-widest mb-2">
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
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Empty state — redesigned with floating SVGs */}
        {!graphData && !loading && (
          <section ref={emptyRef} className="relative py-16 md:py-24 overflow-hidden">
            <div className="mx-auto max-w-[1000px] px-6">
              {/* Floating SVGs — network / graph / commits */}
              <div className="absolute inset-0 pointer-events-none hidden md:block">
                {/* Network graph SVG — top left */}
                <div
                  className="graph-float absolute left-[5%] top-[15%] w-[100px] lg:w-[130px]"
                  style={{ rotate: "-5deg" }}
                >
                  <svg
                    viewBox="0 0 150 150"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-auto text-ink"
                  >
                    <circle cx="25" cy="50" r="12" fill="currentColor" opacity="0.15" />
                    <circle cx="75" cy="25" r="10" fill="currentColor" opacity="0.12" />
                    <circle cx="125" cy="55" r="11" fill="currentColor" opacity="0.14" />
                    <circle cx="110" cy="110" r="9" fill="currentColor" opacity="0.11" />
                    <circle cx="40" cy="115" r="10" fill="currentColor" opacity="0.13" />
                    <circle cx="75" cy="75" r="16" fill="var(--color-electric-iris)" opacity="0.25" />
                    <line x1="35" y1="52" x2="65" y2="30" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
                    <line x1="82" y1="30" x2="118" y2="50" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
                    <line x1="122" y1="62" x2="115" y2="103" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
                    <line x1="105" y1="112" x2="50" y2="114" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
                    <line x1="33" y1="108" x2="30" y2="58" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
                    <line x1="35" y1="52" x2="65" y2="68" stroke="currentColor" strokeWidth="0.8" opacity="0.08" />
                    <line x1="85" y1="68" x2="118" y2="50" stroke="currentColor" strokeWidth="0.8" opacity="0.08" />
                  </svg>
                </div>

                {/* Git branch SVG — top right */}
                <div
                  className="graph-float absolute right-[4%] top-[10%] w-[90px] lg:w-[110px]"
                  style={{ rotate: "3deg" }}
                >
                  <svg
                    viewBox="0 0 120 180"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-auto text-ink"
                  >
                    <circle cx="30" cy="30" r="8" fill="currentColor" opacity="0.7" />
                    <circle cx="30" cy="70" r="8" fill="currentColor" opacity="0.6" />
                    <circle cx="30" cy="110" r="8" fill="currentColor" opacity="0.5" />
                    <circle cx="30" cy="150" r="8" fill="currentColor" opacity="0.4" />
                    <line x1="30" y1="38" x2="30" y2="142" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                    <circle cx="80" cy="50" r="8" fill="var(--color-electric-iris)" opacity="0.6" />
                    <circle cx="80" cy="90" r="8" fill="currentColor" opacity="0.5" />
                    <line x1="80" y1="58" x2="80" y2="82" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                    <line x1="38" y1="70" x2="72" y2="50" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.25" />
                    <line x1="38" y1="110" x2="72" y2="90" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.2" />
                  </svg>
                </div>

                {/* Commit nodes — bottom left */}
                <div
                  className="graph-float absolute left-[8%] bottom-[12%] w-[80px] lg:w-[100px]"
                  style={{ rotate: "4deg" }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-auto text-ink"
                  >
                    <circle cx="20" cy="50" r="14" fill="currentColor" opacity="0.08" />
                    <circle cx="50" cy="25" r="12" fill="currentColor" opacity="0.07" />
                    <circle cx="80" cy="50" r="13" fill="currentColor" opacity="0.09" />
                    <circle cx="50" cy="75" r="11" fill="currentColor" opacity="0.06" />
                    <line x1="32" y1="48" x2="40" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
                    <line x1="60" y1="28" x2="70" y2="48" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
                    <line x1="78" y1="60" x2="58" y2="70" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
                    <line x1="35" y1="60" x2="45" y2="70" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
                    <circle cx="50" cy="50" r="6" fill="var(--color-electric-iris)" opacity="0.35" />
                  </svg>
                </div>

                {/* Tree structure — bottom right */}
                <div
                  className="graph-float absolute right-[6%] bottom-[15%] w-[85px] lg:w-[105px]"
                  style={{ rotate: "-3deg" }}
                >
                  <svg
                    viewBox="0 0 140 130"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-auto text-ink"
                  >
                    <circle cx="70" cy="20" r="9" fill="currentColor" opacity="0.5" />
                    <circle cx="40" cy="55" r="8" fill="currentColor" opacity="0.4" />
                    <circle cx="100" cy="55" r="8" fill="currentColor" opacity="0.45" />
                    <circle cx="25" cy="90" r="7" fill="currentColor" opacity="0.35" />
                    <circle cx="55" cy="90" r="7" fill="currentColor" opacity="0.3" />
                    <circle cx="85" cy="90" r="7" fill="var(--color-electric-iris)" opacity="0.4" />
                    <circle cx="115" cy="90" r="7" fill="currentColor" opacity="0.35" />
                    <line x1="65" y1="28" x2="44" y2="48" stroke="currentColor" strokeWidth="1.2" opacity="0.2" />
                    <line x1="75" y1="28" x2="96" y2="48" stroke="currentColor" strokeWidth="1.2" opacity="0.2" />
                    <line x1="36" y1="62" x2="28" y2="84" stroke="currentColor" strokeWidth="1" opacity="0.15" />
                    <line x1="44" y1="62" x2="52" y2="84" stroke="currentColor" strokeWidth="1" opacity="0.15" />
                    <line x1="96" y1="62" x2="88" y2="84" stroke="currentColor" strokeWidth="1" opacity="0.15" />
                    <line x1="104" y1="62" x2="112" y2="84" stroke="currentColor" strokeWidth="1" opacity="0.15" />
                  </svg>
                </div>
              </div>

              {/* Feature cards — centered content */}
              <div className="relative z-10 max-w-[600px] mx-auto text-center">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-electric-iris">
                          <circle cx="5" cy="12" r="3" fill="currentColor" />
                          <circle cx="19" cy="6" r="3" fill="currentColor" />
                          <circle cx="19" cy="18" r="3" fill="currentColor" />
                          <line x1="8" y1="11" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5" />
                          <line x1="8" y1="13" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      ),
                      label: "Elastic edges",
                      desc: "Springs connect parents to children",
                    },
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-electric-iris">
                          <path
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                      label: "Drag & drop",
                      desc: "Pull nodes around, they spring back",
                    },
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-electric-iris">
                          <circle cx="12" cy="12" r="3" fill="currentColor" />
                          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
                        </svg>
                      ),
                      label: "Click to inspect",
                      desc: "Tap any commit for full details",
                    },
                    {
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-electric-iris">
                          <path
                            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                      label: "Live physics",
                      desc: "Force simulation runs in real-time",
                    },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="graph-feature rounded-[4px] border border-bone bg-paper p-4 text-left hover:border-electric-iris/40 transition-colors"
                    >
                      {f.icon}
                      <p className="text-sm font-medium text-ink mt-2">{f.label}</p>
                      <p className="text-[11px] text-fog mt-0.5">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
