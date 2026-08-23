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
  Eye,
  Code as CodeIcon,
  PencilSimple,
  Image,
} from "@phosphor-icons/react";

import { useAuth } from "@/hooks/useAuth";
import { useGenerate } from "@/hooks/useGenerate";
import { SignInScreen } from "@/components/auth/SignInScreen";
import { CooldownTimer } from "@/components/auth/CooldownTimer";
import { AutoDetectionPanel } from "@/components/auto-detect/AutoDetectionPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function headingId(text: string) {
  const cleaned = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1");
  return cleaned
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
function countLines(text: string) {
  return text ? text.split("\n").length : 0;
}

export const Route = createFileRoute("/generate")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : undefined,
  }),
  head: () => {
    const url = "https://caveman-lilac.vercel.app/generate";
    const description =
      "Paste a GitHub URL or describe your project. Caveman generates a polished README.md in seconds.";
    return {
      meta: [
        { title: "Generate a README - Caveman" },
        { name: "description", content: description },
        { property: "og:title", content: "Generate a README - Caveman" },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: "https://caveman-lilac.vercel.app/og-image.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:site_name", content: "Caveman" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Generate a README - Caveman" },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: "https://caveman-lilac.vercel.app/og-image.png" },
        { name: "robots", content: "index, follow" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: GeneratePage,
});

type Style = "minimal" | "standard" | "comprehensive";
type Tone = "technical" | "friendly" | "enterprise";
type Tab = "url" | "describe";

const ALL_SECTIONS = [
  "Installation",
  "Usage",
  "API Docs",
  "Contributing",
  "License",
  "Badges",
  "Tech Stack",
  "Folder Structure",
  "Features",
  "Architecture",
  "Performance",
  "Security",
  "Deployment",
  "Testing",
  "FAQ",
  "Changelog",
  "Authors",
];

const STYLE_META: Record<Style, { desc: string }> = {
  minimal: { desc: "Quick start, bare essentials" },
  standard: { desc: "Balanced, good for most projects" },
  comprehensive: { desc: "Deep docs, full structure" },
};

const TONE_OPTIONS = [
  { value: "technical" as Tone, label: "Technical", desc: "Precise, developer-focused" },
  { value: "friendly" as Tone, label: "Friendly", desc: "Approachable, conversational" },
  { value: "enterprise" as Tone, label: "Enterprise", desc: "Formal, professional" },
];

const LOADING_MESSAGES = [
  "Fetching repository file tree...",
  "Reading source files...",
  "Detecting tech stack...",
  "Analyzing architecture...",
  "Writing README...",
];

function SectionPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (s: string[]) => void;
}) {
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

  const filtered = search
    ? ALL_SECTIONS.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : ALL_SECTIONS;

  const toggle = (s: string) => {
    onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn-ghost w-full justify-between text-xs !rounded-full !py-2"
      >
        <span className="truncate">
          {selected.length === 0
            ? "Select sections"
            : selected.length === ALL_SECTIONS.length
              ? "All sections"
              : `${selected.length} section${selected.length > 1 ? "s" : ""} selected`}
        </span>
        {open ? <CaretUp size={10} /> : <CaretDown size={10} />}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-1 left-0 right-0 z-10 bg-paper border border-bone rounded-[4px] overflow-hidden"
        >
          <div className="relative border-b border-bone">
            <SearchIcon
              size={11}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sections..."
              className="h-9 pl-8 text-xs bg-paper text-ink placeholder:text-ink/40 border-0 shadow-none rounded-none"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.map((s) => {
              const active = selected.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(s)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-[4px] hover:bg-cream transition-colors text-left"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-electric-iris border-electric-iris" : "border-ink/30"}`}
                  >
                    {active && <Check size={9} weight="bold" className="text-white" />}
                  </div>
                  <span className={active ? "text-ink font-medium" : "text-ink/60"}>{s}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-ink/40 text-center">No sections found</p>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-bone px-3 py-1.5">
            <button
              type="button"
              onClick={() =>
                onChange(selected.length === ALL_SECTIONS.length ? [] : [...ALL_SECTIONS])
              }
              className="text-[10px] font-medium text-ink/40 hover:text-ink transition-colors"
            >
              {selected.length === ALL_SECTIONS.length ? "Deselect all" : "Select all"}
            </button>
            <span className="text-[10px] text-ink/40">
              {selected.length}/{ALL_SECTIONS.length}
            </span>
          </div>
        </motion.div>
      )}
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
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-cream border border-bone flex items-center justify-center mx-auto">
          <img src="/logo-256.png" alt="Caveman logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="mt-5 text-2xl font-light text-ink text-center">
          Generate a README from any GitHub repo
        </h1>
        <p className="mt-2 text-sm text-fog max-w-md text-center leading-relaxed">
          Paste a GitHub URL or describe your project. Caveman scans your file tree and writes a
          production-ready README.md in about 47 seconds.
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs text-fog">
          <CircleNotch size={14} className="text-ink animate-spin" />
          Loading generator…
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignInScreen onSignIn={signIn} error={authError} />;
  }

  return <AuthenticatedApp user={user} onSignOut={signOut} />;
}

const viewIcons = { preview: Eye, raw: CodeIcon, edit: PencilSimple } as const;

function AuthenticatedApp({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState(search.url ?? "");
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
  const [elapsed, setElapsed] = useState(0);
  const [leftOpen, setLeftOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    if (!isPending) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [isPending]);

  // Fake-determinate progress toward ~47s average
  const progressPct = Math.min(95, Math.floor((elapsed / 47) * 100));

  const onCopy = async () => {
    if (!readme) return;
    setCopyError("");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(editableReadme || readme);
      } else {
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
      style,
      sections,
      tone,
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onDownload();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "c") {
        e.preventDefault();
        onCopy();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        setView((v) => (v === "edit" ? "preview" : "edit"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readme, editableReadme]);

  const sidebarContent = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
      <div className="p-4 space-y-4 border-b border-bone">
        {/* Source */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-ink/40 uppercase tracking-[0.286em]">
            Source
          </label>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-9 bg-cream">
              <TabsTrigger
                value="url"
                className="text-xs data-[state=active]:bg-electric-iris data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                URL
              </TabsTrigger>
              <TabsTrigger
                value="describe"
                className="text-xs data-[state=active]:bg-electric-iris data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                Describe
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === "url" ? (
            <div className="relative">
              <LinkIcon
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
              />
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="github.com/user/repo"
                className="h-9 pl-9 text-xs bg-paper text-ink placeholder:text-ink/40 border-bone shadow-none"
              />
            </div>
          ) : (
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-paper border border-bone rounded-lg text-ink placeholder:text-ink/40 outline-none focus:border-ink transition-colors resize-none"
              />
            </div>
          )}
          <p className="text-[10px] text-ink/40 leading-relaxed">
            Sign in with Google to access private repos. Public repos work without any extra setup.
          </p>
        </div>

        {/* Style */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-ink/40 uppercase tracking-[0.286em]">
            Style
          </label>
          <div className="space-y-1">
            {(["minimal", "standard", "comprehensive"] as Style[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`w-full flex items-center gap-2.5 rounded-[4px] border px-3 py-2 text-left transition-all cursor-pointer ${style === s ? "bg-electric-iris text-white border-electric-iris" : "bg-paper text-ink/60 border-bone hover:border-ink/30"}`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium capitalize block truncate">{s}</span>
                  <span
                    className={`text-[10px] block truncate ${style === s ? "text-cream/70" : "text-ink/40"}`}
                  >
                    {STYLE_META[s].desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-ink/40 uppercase tracking-[0.286em]">
            Sections
          </label>
          <SectionPicker selected={sections} onChange={setSections} />
        </div>

        {/* Tone */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-ink/40 uppercase tracking-[0.286em]">
            Tone
          </label>
          <div className="space-y-1">
            {TONE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setTone(o.value)}
                className={`w-full flex items-center gap-2.5 rounded-[4px] border px-3 py-2 text-left transition-all cursor-pointer ${tone === o.value ? "bg-electric-iris text-white border-electric-iris" : "bg-paper text-ink/60 border-bone hover:border-ink/30"}`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium block truncate">{o.label}</span>
                  <span
                    className={`text-[10px] block truncate ${tone === o.value ? "text-cream/70" : "text-ink/40"}`}
                  >
                    {o.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <Button
          onClick={handleGenerate}
          disabled={disabled}
          className="w-full justify-center text-xs h-10 disabled:opacity-40"
        >
          {isPending ? (
            <motion.span
              key={loadMsgIdx}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="relative z-10 flex items-center gap-2"
            >
              <CircleNotch size={13} className="animate-spin" /> {LOADING_MESSAGES[loadMsgIdx]}
            </motion.span>
          ) : (
            <span className="relative z-10 flex items-center gap-2">
              <MagnifyingGlass size={13} weight="bold" /> Generate README{" "}
              <ArrowRightIcon size={11} />
            </span>
          )}
        </Button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-lg border border-err/30 p-3 text-err bg-err/5"
          >
            <Warning size={13} className="shrink-0 mt-0.5" />
            <span className="text-xs font-medium">{error}</span>
          </motion.div>
        )}
      </div>
      {data?.discovery && <AutoDetectionPanel discovery={data.discovery} />}
    </motion.div>
  );

  return (
    <div className="h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="h-11 border-b border-bone bg-paper flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 rounded-[4px] overflow-hidden bg-cream border border-bone flex items-center justify-center">
            <img src="/logo-256.png" alt="Caveman logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-[10px] font-medium text-ink uppercase tracking-[0.286em]">
            Caveman
          </span>
          <span className="w-px h-3 bg-bone" />
          <span className="hidden md:inline text-[10px] text-ink/40">README Generator</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-ink/40 tabular-nums">
            {data?.remaining ?? getStoredRemaining()}/10 remaining
          </span>
          <Button
            onClick={() => setMobileOpen(true)}
            variant="outline"
            size="sm"
            className="lg:hidden h-7 gap-1 text-[10px] px-3"
          >
            <FileCode size={10} /> Options
          </Button>
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              className="w-5 h-5 rounded-full border border-bone hover:scale-110 transition-transform duration-200"
              referrerPolicy="no-referrer"
            />
          )}
          <Button
            onClick={onSignOut}
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[10px] px-3"
          >
            <SignOut size={10} /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      {/* Mobile options sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="lg:hidden w-[300px] max-w-[85vw] bg-paper border-r border-bone p-0 gap-0 flex flex-col"
        >
          <SheetHeader className="px-4 py-3 border-b border-bone text-left">
            <SheetTitle className="text-[10px] font-medium uppercase tracking-[0.286em] text-ink/40">
              Options
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">{sidebarContent}</ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {inCooldown ? (
            <motion.div
              key="cooldown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <CooldownTimer cooldownEnd={cooldownExpiry} />
            </motion.div>
          ) : (
            <motion.div
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Sidebar - desktop */}
              <div className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-bone bg-paper overflow-y-auto">
                {leftOpen && sidebarContent}
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col min-w-0 bg-paper overflow-y-auto">
                {isPending && (
                  <div className="px-4 py-3 border-b border-bone bg-paper shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-ink/60 min-w-0 flex-1">
                        <CircleNotch size={13} className="animate-spin text-ink shrink-0" />
                        <motion.span
                          key={loadMsgIdx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="truncate"
                        >
                          {LOADING_MESSAGES[loadMsgIdx]}
                        </motion.span>
                      </div>
                      <span className="text-[10px] text-ink/40 shrink-0 tabular-nums">
                        {elapsed}s · ~{Math.max(1, 47 - elapsed)}s left
                      </span>
                    </div>
                    <div className="mt-2.5 h-1 bg-bone rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-electric-iris rounded-full transition-[width] duration-1000"
                        animate={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-ink/30">
                      Deep scan of up to 25 source files - this is the slow, accurate part.
                    </p>
                  </div>
                )}

                {!readme && !isPending && (
                  <div className="flex-1 flex items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center px-4"
                    >
                      <div className="w-10 h-10 rounded-lg border border-bone bg-cream flex items-center justify-center mb-3 mx-auto">
                        <FileCode size={16} className="text-ink/60" />
                      </div>
                      <h3 className="text-sm font-medium text-ink">Ready to Generate</h3>
                      <p className="mt-1 text-xs text-ink/40 max-w-xs leading-relaxed mx-auto">
                        Configure your options in the sidebar, then click generate.
                      </p>
                    </motion.div>
                  </div>
                )}

                {readme && (
                  <div className="flex flex-col min-h-0">
                    {/* Toolbar */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 border-b border-bone bg-paper shrink-0">
                      <div className="flex items-center gap-2">
                        <FileCode size={14} className="text-ink shrink-0" />
                        <span className="text-xs font-medium text-ink">README.md</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tabs
                          value={view}
                          onValueChange={(v) => setView(v as "preview" | "raw" | "edit")}
                        >
                          <TabsList className="h-8 bg-cream">
                            {(["preview", "raw", "edit"] as const).map((v) => {
                              const Icon = viewIcons[v];
                              return (
                                <TabsTrigger
                                  key={v}
                                  value={v}
                                  className="h-6 gap-1 text-[10px] px-2.5 data-[state=active]:bg-electric-iris data-[state=active]:text-white data-[state=active]:shadow-none"
                                >
                                  <Icon size={10} />{" "}
                                  {v === "preview" ? "Preview" : v === "raw" ? "Raw" : "Edit"}
                                </TabsTrigger>
                              );
                            })}
                          </TabsList>
                        </Tabs>
                        <Button
                          onClick={onCopy}
                          disabled={!readme}
                          variant={copied ? "outline" : "outline"}
                          size="sm"
                          className={`h-7 gap-1 text-[10px] px-3 ${copied ? "bg-paper text-ink/60" : ""}`}
                        >
                          {copied ? (
                            <>
                              <Check size={10} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={10} /> Copy
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={onDownload}
                          disabled={!readme}
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-[10px] px-3"
                        >
                          <Download size={10} /> Download
                        </Button>
                      </div>
                    </div>

                    {/* README content */}
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
                            <div className="border border-bone rounded-2xl bg-paper overflow-hidden">
                              <div className="flex items-center gap-1.5 border-b border-bone px-4 py-2.5 bg-cream">
                                <span className="w-2.5 h-2.5 rounded-full bg-bone" />
                                <span className="w-2.5 h-2.5 rounded-full bg-bone" />
                                <span className="w-2.5 h-2.5 rounded-full bg-bone" />
                                <span className="ml-3 text-[10px] text-ink/40">README.md</span>
                              </div>
                              <div className="p-6 lg:p-8">
                                <MarkdownRender text={editableReadme || readme} />
                              </div>
                            </div>
                          ) : view === "raw" ? (
                            <pre className="whitespace-pre-wrap font-mono text-sm text-ink leading-relaxed max-w-none">
                              {editableReadme || readme}
                            </pre>
                          ) : (
                            <textarea
                              value={editableReadme}
                              onChange={(e) => setEditableReadme(e.target.value)}
                              className="w-full min-h-[400px] font-mono text-sm text-ink leading-relaxed bg-paper outline-none resize-none py-4 border-0 focus:ring-0"
                              spellCheck={false}
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Status bar */}
                    <div className="flex items-center gap-4 px-5 py-3 border-t border-bone text-[10px] text-ink/40 bg-paper shrink-0">
                      <span>{countWords(editableReadme || readme)} words</span>
                      <Separator orientation="vertical" className="h-3 bg-bone" />
                      <span>{(editableReadme || readme).length} chars</span>
                      <Separator orientation="vertical" className="h-3 bg-bone" />
                      <span>{countLines(editableReadme || readme)} lines</span>
                      <span className="ml-auto">
                        {view === "edit" ? "Ctrl+E: Preview" : "Ctrl+E: Edit"} &middot; Ctrl+S:
                        Download
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
  let i = 0,
    key = 0;

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
        <div key={key++} className="my-5 rounded-2xl overflow-hidden border border-bone">
          {lang && (
            <div className="px-4 py-2 bg-cream border-b border-bone flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.286em] text-ink/40">
                {lang}
              </span>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-bone" />
                <span className="w-2 h-2 rounded-full bg-bone" />
                <span className="w-2 h-2 rounded-full bg-bone" />
              </div>
            </div>
          )}
          <pre
            className={`p-4 font-mono text-sm overflow-x-auto leading-relaxed ${isTree ? "bg-paper text-ink" : "bg-ink text-paper"}`}
          >
            <code>{buf.join("\n")}</code>
          </pre>
        </div>,
      );
      continue;
    }

    if (line.startsWith("|") && lines[i + 1]?.includes("|") && lines[i + 1]?.includes("-")) {
      const headers = line
        .split("|")
        .map((h) => h.trim())
        .filter(Boolean);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(
          lines[i]
            .split("|")
            .map((r) => r.trim())
            .filter(Boolean),
        );
        i++;
      }
      out.push(
        <div key={key++} className="my-5 overflow-x-auto border border-bone rounded-2xl bg-paper">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-bone">
                {headers.map((h, idx) => (
                  <th key={idx} className="p-3 font-medium text-ink text-sm">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bone">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-cream">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 text-ink/60 text-sm">
                      {inline(cell)}
                    </td>
                  ))}
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
        <blockquote
          key={key++}
          className="my-4 pl-4 border-l-2 border-ink p-3 text-sm italic text-ink/60"
        >
          {inline(line.slice(2))}
        </blockquote>,
      );
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      const h1Text = line.slice(2);
      out.push(
        <h1
          key={key++}
          id={headingId(h1Text)}
          className="mt-8 mb-4 text-3xl font-medium text-ink border-b border-bone pb-3"
        >
          {inline(h1Text)}
        </h1>,
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      const h2Text = line.slice(3);
      out.push(
        <h2 key={key++} id={headingId(h2Text)} className="mt-7 mb-3 text-xl font-medium text-ink">
          {inline(h2Text)}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      const h3Text = line.slice(4);
      out.push(
        <h3 key={key++} id={headingId(h3Text)} className="mt-6 mb-2 text-lg font-medium text-ink">
          {inline(h3Text)}
        </h3>,
      );
      i++;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* ")))
        items.push(lines[i++].slice(2));
      out.push(
        <ul key={key++} className="my-3 ml-5 list-disc space-y-1.5 text-sm text-ink/60">
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {inline(it)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }
    out.push(
      <p key={key++} className="my-3 text-sm text-ink/60 leading-relaxed">
        {inline(line)}
      </p>,
    );
    i++;
  }
  return <div className="max-w-none">{out}</div>;
}

function inline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0,
    m: RegExpExecArray | null,
    k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**"))
      nodes.push(
        <strong key={k++} className="font-medium text-ink">
          {tok.slice(2, -2)}
        </strong>,
      );
    else
      nodes.push(
        <code
          key={k++}
          className="bg-cream border border-bone px-1.5 py-0.5 font-mono text-xs text-ink rounded-md"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
