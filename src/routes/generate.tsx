import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link as LinkIcon,
  Warning,
  MagnifyingGlass,
  Check,
  CircleNotch,
  ArrowRight as ArrowRightIcon,
  Download,
  Copy,
  FileCode,
  SignOut,
  CaretDown,
  MagnifyingGlass as SearchIcon,
  CaretUp,
  CheckSquare,
  Square,
  Eye,
  Code as CodeIcon,
  PencilSimple,
} from "@phosphor-icons/react";

import { useAuth } from "@/hooks/useAuth";
import { useGenerate } from "@/hooks/useGenerate";
import { SignInScreen } from "@/components/auth/SignInScreen";
import { CooldownTimer } from "@/components/auth/CooldownTimer";
import { AutoDetectionPanel } from "@/components/auto-detect/AutoDetectionPanel";

function headingId(text: string) {
  const cleaned = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1");
  return cleaned.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function countWords(text: string) { return text.trim() ? text.trim().split(/\s+/).length : 0; }
function countLines(text: string) { return text ? text.split("\n").length : 0; }

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "Generate a README — Caveman" },
      { name: "description", content: "Paste a GitHub URL or describe your project. Caveman generates a polished README.md in seconds." },
    ],
  }),
  component: GeneratePage,
});

type Style = "minimal" | "standard" | "comprehensive";
type Tone = "technical" | "friendly" | "enterprise";
type Tab = "url" | "describe";

const ALL_SECTIONS = [
  "Installation", "Usage", "API Docs", "Contributing", "License", "Badges",
  "Tech Stack", "Folder Structure", "Features", "Architecture", "Performance",
  "Security", "Deployment", "Testing", "FAQ", "Changelog", "Authors",
];

const STYLE_META: Record<Style, { desc: string }> = {
  minimal: { desc: "Quick start, bare essentials" },
  standard: { desc: "Balanced overview, good for most projects" },
  comprehensive: { desc: "Deep docs, API refs, full structure" },
};

const TONE_OPTIONS = [
  { value: "technical" as Tone, label: "Technical", desc: "Precise, developer-focused" },
  { value: "friendly" as Tone, label: "Friendly", desc: "Approachable, conversational" },
  { value: "enterprise" as Tone, label: "Enterprise", desc: "Formal, professional tone" },
];

const LOADING_MESSAGES = ["Analyzing repository...", "Detecting tech stack...", "Writing README..."];

function SectionPicker({ selected, onChange }: { selected: string[]; onChange: (s: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search ? ALL_SECTIONS.filter((s) => s.toLowerCase().includes(search.toLowerCase())) : ALL_SECTIONS;

  const toggle = (s: string) => {
    onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-9 px-3 text-xs bg-cream-paper border border-ink rounded-full text-ink flex items-center justify-between gap-2 hover:bg-ink/5 transition-colors"
      >
        <span className="truncate">
          {selected.length === 0 ? "Select sections" : selected.length === ALL_SECTIONS.length ? "All sections" : `${selected.length} section${selected.length > 1 ? "s" : ""} selected`}
        </span>
        {open ? <CaretUp size={10} /> : <CaretDown size={10} />}
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full mt-1 left-0 right-0 z-10 bg-cream-paper border border-ink rounded-2xl shadow-lg overflow-hidden">
          <div className="relative border-b border-ink">
            <SearchIcon size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sections..." className="w-full h-9 pl-8 pr-3 text-xs bg-cream-paper text-ink placeholder:text-graphite outline-none" />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.map((s) => {
              const active = selected.includes(s);
              return (
                <button key={s} type="button" onClick={() => toggle(s)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-ink/5 transition-colors text-left">
                  {active ? <CheckSquare size={12} className="text-ink shrink-0" weight="fill" /> : <Square size={12} className="text-graphite shrink-0" />}
                  <span className={active ? "text-ink font-medium" : "text-graphite"}>{s}</span>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="px-3 py-3 text-xs text-graphite text-center">No sections found</p>}
          </div>
          <div className="flex items-center justify-between border-t border-ink px-3 py-1.5">
            <button type="button" onClick={() => onChange(selected.length === ALL_SECTIONS.length ? [] : [...ALL_SECTIONS])} className="text-[10px] font-medium text-graphite hover:text-ink transition-colors">
              {selected.length === ALL_SECTIONS.length ? "Deselect all" : "Select all"}
            </button>
            <span className="text-[10px] text-graphite">{selected.length}/{ALL_SECTIONS.length}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex bg-cream-paper p-0.5 rounded-full border border-ink">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${value === o.value ? "bg-ink text-cream-paper" : "text-graphite hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function getStoredRemaining(): number {
  try {
    const raw = localStorage.getItem("caveman_usage");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.remaining === "number" && parsed.cooldownEnd > Date.now()) return 0;
      if (typeof parsed.remaining === "number") return parsed.remaining;
    }
  } catch {}
  return 10;
}

function GeneratePage() {
  const { user, loading, error: authError, signIn, signOut } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-cream-paper flex items-center justify-center"><CircleNotch size={20} className="text-ink animate-spin" /></div>;
  }

  if (!user) {
    return <SignInScreen onSignIn={signIn} error={authError} />;
  }

  return <AuthenticatedApp user={user} onSignOut={signOut} />;
}

function AuthenticatedApp({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<Style>("comprehensive");
  const [tone, setTone] = useState<Tone>("technical");
  const [sections, setSections] = useState<string[]>(ALL_SECTIONS);
  const [view, setView] = useState<"preview" | "raw" | "edit">("preview");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [editableReadme, setEditableReadme] = useState("");
  const [loadMsgIdx, setLoadMsgIdx] = useState(0);

  const { isPending, data, error, cooldownExpiry, generate } = useGenerate();

  const readme = data?.readme ?? "";
  useEffect(() => {
    if (readme) setEditableReadme(readme);
  }, [readme]);
  const disabled = isPending || (tab === "url" ? !url : !description);
  const inCooldown = cooldownExpiry > Date.now();

  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => {
      setLoadMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isPending]);

  const onCopy = async () => {
    if (!readme) return;
    setCopyError("");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(editableReadme || readme);
      } else {
        // Fallback for insecure contexts
        const textarea = document.createElement("textarea");
        textarea.value = editableReadme || readme;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      setCopyError("Failed to copy to clipboard");
      setTimeout(() => setCopyError(""), 3000);
    }
  };

  const onDownload = () => {
    if (!readme) return;
    setDownloadError("");
    try {
      const blob = new Blob([editableReadme || readme], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "README.md";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    } catch (err) {
      console.error("Download failed:", err);
      setDownloadError("Failed to download file");
      setTimeout(() => setDownloadError(""), 3000);
    }
  };

  const handleGenerate = () => {
    generate({
      projectUrl: tab === "url" ? url : "",
      description: tab === "describe" ? description : "",
      style, sections, tone,
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); onDownload(); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "c") { e.preventDefault(); onCopy(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); setView((v) => (v === "edit" ? "preview" : "edit")); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readme, editableReadme]);

  const [leftOpen, setLeftOpen] = useState(true);

  const viewIcons = { preview: Eye, raw: CodeIcon, edit: PencilSimple } as const;

  return (
    <div className="h-screen bg-cream-paper flex flex-col">
      <header className="h-11 border-b border-ink bg-cream-paper flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink font-medium uppercase tracking-[0.286em]">Caveman</span>
          <span className="w-px h-3 bg-ink/30" />
          <span className="text-xs text-graphite">README Generator</span>
        </div>
        <div className="flex items-center gap-3">
          {data ? (
            <span className="text-[10px] text-graphite">{data.remaining}/10 remaining</span>
          ) : (
            <span className="text-[10px] text-graphite">{getStoredRemaining()}/10 remaining</span>
          )}
          {user?.photoURL && <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full border border-ink" referrerPolicy="no-referrer" />}
          <button onClick={onSignOut} className="text-[10px] text-graphite hover:text-ink flex items-center gap-1"><SignOut size={11} /> Sign out</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {inCooldown ? (
            <motion.div key="cooldown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center">
              <CooldownTimer cooldownEnd={cooldownExpiry} />
            </motion.div>
          ) : (
            <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex overflow-hidden">
              <div className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-ink bg-cream-paper overflow-y-auto">
                {leftOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                    <div className="p-4 space-y-5 border-b border-ink">
                      <div className="space-y-2">
                        <label className="text-[10px] font-medium text-graphite uppercase tracking-[0.286em]">Source</label>
                        <Segmented value={tab} onChange={setTab} options={[{ value: "url", label: "URL" }, { value: "describe", label: "Describe" }]} />
                        {tab === "url" ? (
                          <div className="relative">
                            <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite" />
                            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="github.com/user/repo"
                              className="w-full h-9 pl-9 pr-3 text-xs bg-cream-paper border border-ink rounded-full text-ink placeholder:text-graphite outline-none focus:border-ink" />
                          </div>
                        ) : (
                          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your project..." rows={3}
                            className="w-full px-3 py-2 text-xs bg-cream-paper border border-ink rounded-2xl text-ink placeholder:text-graphite outline-none focus:border-ink resize-none" />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-graphite uppercase tracking-[0.286em]">Style</label>
                        <div className="space-y-1">
                          {(["minimal", "standard", "comprehensive"] as Style[]).map((s) => (
                            <button key={s} type="button" onClick={() => setStyle(s)}
                              className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${style === s ? "bg-ink text-cream-paper border-ink" : "bg-cream-paper text-graphite border-ink hover:bg-ink/5"}`}
                            >
                              <span className={`w-2 h-2 rounded-full border shrink-0 ${style === s ? "border-cream-paper bg-cream-paper" : "border-graphite"}`} />
                              <div className="min-w-0">
                                <span className="text-xs font-medium capitalize block truncate">{s}</span>
                                <span className={`text-[10px] block truncate ${style === s ? "text-cream-paper/70" : "text-graphite"}`}>{STYLE_META[s].desc}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-graphite uppercase tracking-[0.286em]">Sections</label>
                        <SectionPicker selected={sections} onChange={setSections} />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-graphite uppercase tracking-[0.286em]">Tone</label>
                        <div className="space-y-1">
                          {TONE_OPTIONS.map((o) => (
                            <button key={o.value} type="button" onClick={() => setTone(o.value)}
                              className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${tone === o.value ? "bg-ink text-cream-paper border-ink" : "bg-cream-paper text-graphite border-ink hover:bg-ink/5"}`}
                            >
                              <span className={`w-2 h-2 rounded-full border shrink-0 ${tone === o.value ? "border-cream-paper bg-cream-paper" : "border-graphite"}`} />
                              <div className="min-w-0">
                                <span className="text-xs font-medium block truncate">{o.label}</span>
                                <span className={`text-[10px] block truncate ${tone === o.value ? "text-cream-paper/70" : "text-graphite"}`}>{o.desc}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <motion.button
                        onClick={handleGenerate}
                        disabled={disabled}
                        whileTap={{ scale: 0.97 }}
                        className="w-full h-10 text-xs font-medium bg-sunshine-highlight text-ink rounded-full disabled:opacity-30 transition-opacity flex items-center justify-center gap-2 relative overflow-hidden"
                      >
                        {isPending ? (
                          <motion.span key={loadMsgIdx} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-2">
                            <CircleNotch size={13} className="animate-spin" /> {LOADING_MESSAGES[loadMsgIdx]}
                          </motion.span>
                        ) : (
                          <><MagnifyingGlass size={13} weight="bold" /> Generate README <ArrowRightIcon size={11} /></>
                        )}
                      </motion.button>

                      {error && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-2xl border border-ink p-3 text-ink">
                          <Warning size={13} className="shrink-0 mt-0.5" />
                          <span className="text-xs font-medium">{error}</span>
                        </motion.div>
                      )}
                    </div>
                    {data?.discovery && <AutoDetectionPanel discovery={data.discovery} />}
                  </motion.div>
                )}
              </div>

              <div className="flex-1 flex flex-col min-w-0 bg-cream-paper overflow-y-auto">
                {isPending && (
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-ink bg-cream-paper shrink-0">
                    <div className="flex items-center gap-2 text-xs text-graphite">
                      <CircleNotch size={13} className="animate-spin text-ink" />
                      <motion.span key={loadMsgIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{LOADING_MESSAGES[loadMsgIdx]}</motion.span>
                    </div>
                    <div className="flex-1 h-[2px] bg-ink/10 rounded-full overflow-hidden max-w-[160px]">
                      <motion.div className="h-full bg-ink rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 3, ease: "linear" }} />
                    </div>
                  </div>
                )}

                {!readme && !isPending && (
                  <div className="flex-1 flex items-center justify-center">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center px-4">
                      <div className="w-10 h-10 rounded-2xl border border-ink bg-cream-paper flex items-center justify-center mb-3 mx-auto">
                        <FileCode size={18} className="text-ink" />
                      </div>
                      <h3 className="text-sm font-medium text-ink">Ready to Generate</h3>
                      <p className="mt-1 text-xs text-graphite max-w-xs leading-relaxed mx-auto">Configure your options in the sidebar, then click generate.</p>
                    </motion.div>
                  </div>
                )}

                {readme && (
                  <div className="flex flex-col min-h-0">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-ink bg-cream-paper shrink-0">
                      <div className="flex items-center gap-2">
                        <FileCode size={14} className="text-ink" />
                        <span className="text-xs font-medium text-ink">README.md</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-ink rounded-full p-0.5">
                          {(["preview", "raw", "edit"] as const).map((v) => {
                            const Icon = viewIcons[v];
                            return (
                              <button key={v} onClick={() => setView(v)}
                                className={`flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full transition-all ${view === v ? "bg-ink text-cream-paper" : "text-graphite hover:text-ink"}`}
                              >
                                <Icon size={10} /> {v === "preview" ? "Preview" : v === "raw" ? "Raw" : "Edit"}
                              </button>
                            );
                          })}
                        </div>
                        <button onClick={onCopy} disabled={!readme}
                          className={`h-7 text-[10px] font-medium rounded-full border px-3 flex items-center gap-1 transition-all ${copied ? "bg-mint-signal/10 text-mint-signal border-mint-signal" : "bg-cream-paper text-graphite border-ink hover:text-ink disabled:opacity-30"}`}
                        >
                          {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                        </button>
                        <button onClick={onDownload} disabled={!readme}
                          className="h-7 text-[10px] font-medium rounded-full border border-ink bg-cream-paper text-graphite hover:text-ink disabled:opacity-30 px-3 flex items-center gap-1"
                        >
                          <Download size={10} /> Download
                        </button>
                      </div>
                    </div>

                    <div className="px-5 py-6">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={view}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {view === "preview" ? (
                            <div className="border border-ink rounded-3xl bg-cream-paper overflow-hidden">
                              <div className="flex items-center gap-1.5 border-b border-ink px-4 py-2.5 bg-cream-paper">
                                <span className="w-2.5 h-2.5 rounded-full border border-ink" />
                                <span className="w-2.5 h-2.5 rounded-full border border-ink" />
                                <span className="w-2.5 h-2.5 rounded-full border border-ink" />
                                <span className="ml-3 text-[10px] text-graphite">README.md</span>
                              </div>
                              <div className="p-6 lg:p-8">
                                <MarkdownRender text={editableReadme || readme} />
                              </div>
                            </div>
                          ) : view === "raw" ? (
                            <pre className="whitespace-pre-wrap font-mono text-sm text-ink leading-relaxed max-w-none">{editableReadme || readme}</pre>
                          ) : (
                            <textarea value={editableReadme} onChange={(e) => setEditableReadme(e.target.value)}
                              className="w-full min-h-[400px] font-mono text-sm text-ink leading-relaxed bg-cream-paper outline-none resize-none py-4 border-0 focus:ring-0"
                              spellCheck={false}
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-4 px-5 py-3 border-t border-ink text-[10px] text-graphite bg-cream-paper shrink-0">
                      <span>{countWords(editableReadme || readme)} words</span>
                      <span className="w-px h-3 bg-ink/20" />
                      <span>{(editableReadme || readme).length} chars</span>
                      <span className="w-px h-3 bg-ink/20" />
                      <span>{countLines(editableReadme || readme)} lines</span>
                      <span className="ml-auto text-[10px] text-graphite">
                        {view === "edit" ? "Ctrl+E: Preview" : "Ctrl+E: Edit"} &middot; Ctrl+S: Download
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MarkdownRender({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0, key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      const isTree = lang === "text" || buf.some((l) => l.includes("├──") || l.includes("└──"));
      out.push(
        <div key={key++} className="my-5 rounded-3xl overflow-hidden border border-ink">
          {lang && (
            <div className="px-4 py-2 bg-cream-paper border-b border-ink flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.286em] text-graphite">{lang}</span>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full border border-ink" />
                <span className="w-2 h-2 rounded-full border border-ink" />
                <span className="w-2 h-2 rounded-full border border-ink" />
              </div>
            </div>
          )}
          <pre className={`p-4 font-mono text-sm overflow-x-auto leading-relaxed ${isTree ? "bg-cream-paper text-ink" : "bg-ink text-cream-paper"}`}>
            <code>{buf.join("\n")}</code>
          </pre>
        </div>,
      );
      continue;
    }

    if (line.startsWith("|") && lines[i + 1]?.includes("|") && lines[i + 1]?.includes("-")) {
      const headers = line.split("|").map((h) => h.trim()).filter(Boolean);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i].split("|").map((r) => r.trim()).filter(Boolean));
        i++;
      }
      out.push(
        <div key={key++} className="my-5 overflow-x-auto border border-ink rounded-3xl bg-cream-paper">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-ink">
                {headers.map((h, idx) => <th key={idx} className="p-3 font-medium text-ink text-sm">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-ink/5">
                  {row.map((cell, cIdx) => <td key={cIdx} className="p-3 text-graphite text-sm">{inline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith("> ")) {
      out.push(
        <blockquote key={key++} className="my-4 pl-4 border-l-2 border-ink p-3 text-sm italic text-graphite">{inline(line.slice(2))}</blockquote>,
      );
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      const h1Text = line.slice(2);
      out.push(<h1 key={key++} id={headingId(h1Text)} className="mt-8 mb-4 text-3xl font-medium text-ink border-b border-ink pb-3">{inline(h1Text)}</h1>);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      const h2Text = line.slice(3);
      out.push(<h2 key={key++} id={headingId(h2Text)} className="mt-7 mb-3 text-xl font-medium text-ink">{inline(h2Text)}</h2>);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      const h3Text = line.slice(4);
      out.push(<h3 key={key++} id={headingId(h3Text)} className="mt-6 mb-2 text-lg font-medium text-ink">{inline(h3Text)}</h3>);
      i++;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) items.push(lines[i++].slice(2));
      out.push(
        <ul key={key++} className="my-3 ml-5 list-disc space-y-1.5 text-sm text-graphite">
          {items.map((it, idx) => <li key={idx} className="leading-relaxed">{inline(it)}</li>)}
        </ul>,
      );
      continue;
    }

    if (line.trim() === "") { i++; continue; }
    out.push(<p key={key++} className="my-3 text-sm text-graphite leading-relaxed">{inline(line)}</p>);
    i++;
  }
  return <div className="max-w-none">{out}</div>;
}

function inline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) nodes.push(<strong key={k++} className="font-medium text-ink">{tok.slice(2, -2)}</strong>);
    else nodes.push(<code key={k++} className="bg-cream-paper border border-ink px-1.5 py-0.5 font-mono text-xs text-ink rounded-md">{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
