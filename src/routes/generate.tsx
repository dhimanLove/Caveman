import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import type { User } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconLink as LinkIcon,
  IconWarning as Warning,
  IconMagnifyingGlass as MagnifyingGlass,
  IconCheck as Check,
  IconArrowRight as ArrowRightIcon,
  IconDownload as Download,
  IconCopy as Copy,
  IconFileCode as FileCode,
  IconLogOut as SignOut,
  IconChevronDown as CaretDown,
  IconMagnifyingGlass as SearchIcon,
  IconChevronDown as CaretUp,
  IconEye as Eye,
  IconCode as CodeIcon,
  IconPencil as PencilSimple,
  IconPickaxe as Pickaxe,
} from "@/components/icons";

import { useAuth } from "@/hooks/useAuth";
import { useGenerate } from "@/hooks/useGenerate";
import { SignInScreen } from "@/components/auth/SignInScreen";
import { CooldownTimer } from "@/components/auth/CooldownTimer";
import { AutoDetectionPanel } from "@/components/auto-detect/AutoDetectionPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CavemanMark } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { KoboyoIllustration } from "@/components/illustrations/KoboyoIllustration";

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
  "License",
  "Tech Stack",
  "Folder Structure",
  "Components",
  "Features",
  "Architecture",
  "Security",
  "Deployment",
  "Testing",
];

// Deferred until the higher-budget AI agent is enabled:
// Configuration, Environment Variables, Data Model, Observability,
// Contributing, Performance, FAQ, Changelog, Authors, Badges.

// Start with the complete documentation set. Users can still deselect sections
// in the picker, but a fresh generation should not silently omit architecture,
// API, deployment, or maintenance documentation.
const DEFAULT_SECTIONS = [...ALL_SECTIONS];

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
        aria-expanded={open}
        aria-haspopup="listbox"
        className="btn-ghost w-full justify-between text-xs !rounded-full !py-2"
      >
        <span className="truncate">
          {selected.length === 0
            ? "Select sections"
            : selected.length === ALL_SECTIONS.length
              ? `All ${ALL_SECTIONS.length} sections`
              : `${selected.length} section${selected.length > 1 ? "s" : ""} selected`}
        </span>
        {open ? <CaretUp size={10} className="rotate-180" /> : <CaretDown size={10} />}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          role="listbox"
          aria-label="README sections"
          className="mt-2 w-full bg-paper border border-bone rounded-lg overflow-hidden shadow-subtle"
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
          <div className="section-picker-list max-h-[min(50vh,360px)] overflow-y-auto overscroll-contain p-1">
            {filtered.map((s) => {
              const active = selected.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(s)}
                  role="option"
                  aria-selected={active}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-[4px] hover:bg-cream transition-colors text-left"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-electric-iris border-electric-iris" : "border-ink/30"}`}
                  >
                    {active && <Check size={9} className="text-white" />}
                  </div>
                  <span className={active ? "text-ink font-medium" : "text-ink/85"}>{s}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="generate-helper-text px-3 py-3 text-xs text-center">
                No sections found
              </p>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-bone px-3 py-1.5">
            <button
              type="button"
              onClick={() =>
                onChange(selected.length === ALL_SECTIONS.length ? [] : [...ALL_SECTIONS])
              }
              className="generate-helper-text text-[10px] font-medium hover:text-ink transition-colors"
            >
              {selected.length === ALL_SECTIONS.length ? "Deselect all" : "Select all"}
            </button>
            <span className="generate-helper-text text-[10px]">
              {selected.length}/{ALL_SECTIONS.length} selected
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function GeneratePage() {
  const { user, loading, error: authError, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <CavemanMark className="w-12 h-12 mx-auto" iconClassName="w-7 h-7" />
        <h1 className="mt-5 text-2xl font-light text-ink text-center">
          Generate a README from any GitHub repo
        </h1>
        <p className="mt-2 text-sm text-fog max-w-md text-center leading-relaxed">
          Paste a GitHub URL or describe your project. Caveman scans your file tree and writes a
          production-ready README.md within the configured generation window.
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs text-fog">
          <Pickaxe size={15} className="text-electric-iris animate-pulse" />
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

function AuthenticatedApp({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState(search.url ?? "");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<Style>("comprehensive");
  const [tone, setTone] = useState<Tone>("technical");
  const [sections, setSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [view, setView] = useState<"preview" | "raw" | "edit">("preview");
  const [copied, setCopied] = useState(false);
  const [editableReadme, setEditableReadme] = useState("");
  const [loadMsgIdx, setLoadMsgIdx] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isPending, data, error, cooldownExpiry, localRemaining, generate } = useGenerate();

  const readme = data?.readme ?? "";
  useEffect(() => {
    if (readme) setEditableReadme(readme);
  }, [readme]);
  // The server owns the quota. localRemaining is only a cached display value;
  // never disable generation from localStorage because it can be stale.
  const disabled = isPending || (tab === "url" ? !url : !description);
  const inCooldown = cooldownExpiry > Date.now();

  useEffect(() => {
    if (!isPending) {
      setLoadMsgIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadMsgIdx((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [isPending]);

  const onCopy = async () => {
    if (!readme) return;
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
    }
  };

  const onDownload = () => {
    if (!readme) return;
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-full flex-none flex-col"
    >
      <div className="p-4 space-y-4 border-b border-bone">
        {/* Source */}
        <div className="space-y-2">
          <label className="generate-control-label text-[10px] font-medium uppercase tracking-[0.286em]">
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
          <p className="generate-helper-text text-[10px] leading-relaxed">
            Public repos work without extra setup. Private repos require a configured GitHub access
            token on the server.
          </p>
        </div>

        {/* Style */}
        <div className="generate-control-group space-y-1.5">
          <label className="generate-control-label text-[10px] font-medium uppercase tracking-[0.286em]">
            Style
          </label>
          <div className="space-y-1">
            {(["minimal", "standard", "comprehensive"] as Style[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`generate-style-option w-full flex items-center gap-2.5 rounded-[4px] border px-3 py-2 text-left transition-all cursor-pointer ${style === s ? "is-selected bg-electric-iris text-white border-electric-iris" : "bg-paper text-ink border-bone hover:border-ink/30"}`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium capitalize block truncate">{s}</span>
                  <span className="generate-style-description text-[10px] block truncate">
                    {STYLE_META[s].desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-1.5">
          <label className="generate-control-label text-[10px] font-medium uppercase tracking-[0.286em]">
            Sections
          </label>
          <SectionPicker selected={sections} onChange={setSections} />
        </div>

        {/* Tone */}
        <div className="generate-control-group space-y-1.5">
          <label className="generate-control-label text-[10px] font-medium uppercase tracking-[0.286em]">
            Tone
          </label>
          <div className="space-y-1">
            {TONE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setTone(o.value)}
                className={`generate-style-option w-full flex items-center gap-2.5 rounded-[4px] border px-3 py-2 text-left transition-all cursor-pointer ${tone === o.value ? "is-selected bg-electric-iris text-white border-electric-iris" : "bg-paper text-ink border-bone hover:border-ink/30"}`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium block truncate">{o.label}</span>
                  <span className="generate-style-description text-[10px] block truncate">
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
              <Pickaxe size={13} className="text-cream" /> {LOADING_MESSAGES[loadMsgIdx]}
            </motion.span>
          ) : (
            <span className="relative z-10 flex items-center gap-2">
              <MagnifyingGlass size={13} /> Generate README <ArrowRightIcon size={11} />
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
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-paper">
      {/* Header */}
      <header className="h-11 border-b border-bone bg-paper flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5 group">
          <CavemanMark className="w-6 h-6" iconClassName="w-4 h-4" />
          <span className="text-[10px] font-medium text-ink uppercase tracking-[0.286em]">
            Caveman
          </span>
          <span className="w-px h-3 bg-bone" />
          <span className="hidden md:inline text-[10px] font-medium text-ink/70">
            README Generator
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-ink/60 tabular-nums">
            {data?.remaining ?? localRemaining}/8 remaining
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
          <div className="ml-1 flex shrink-0 items-center sm:ml-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {isPending && (
        <div className="generation-top-loader" role="status" aria-label="Generating README" />
      )}

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
          <div
            className="generate-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
            data-lenis-prevent
          >
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
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
              className="flex min-h-0 flex-1 overflow-hidden"
            >
              {/* Sidebar - desktop */}
              <div className="generate-sidebar-scroll hidden lg:flex min-h-0 w-[280px] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-bone bg-paper">
                {sidebarContent}
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col min-w-0 bg-paper min-h-0 overflow-hidden">
                {isPending && (
                  <div className="generation-illustration-loader flex-1 flex items-center justify-center px-6">
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <div className="generation-loader-art relative mx-auto mb-6 flex h-40 w-40 items-center justify-center">
                        <span className="generation-loader-orbit generation-loader-orbit-one" />
                        <span className="generation-loader-orbit generation-loader-orbit-two" />
                        <KoboyoIllustration
                          icon="personDocumentingApi"
                          alt="Koboyo character documenting an API while generating your README"
                          className="relative z-10 h-28 w-28"
                          fallback={<CavemanMark className="h-24 w-24" iconClassName="h-16 w-16" />}
                        />
                      </div>
                      <h3 className="text-base font-medium text-ink">Building your README</h3>
                      <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink/50">
                        {LOADING_MESSAGES[loadMsgIdx]}
                      </p>
                      <div className="mt-5 flex items-center justify-center gap-1.5">
                        <span className="generation-loader-dot" />
                        <span className="generation-loader-dot" />
                        <span className="generation-loader-dot" />
                      </div>
                    </motion.div>
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
                  <div className="flex flex-col flex-1 min-h-0">
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
                    <div
                      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 readme-scroll"
                      data-lenis-prevent
                      tabIndex={0}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={view}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="min-h-full"
                        >
                          {view === "preview" ? (
                            <div className="border border-bone rounded-lg bg-paper overflow-hidden">
                              <div className="flex items-center gap-1.5 border-b border-bone px-4 py-2.5 bg-cream">
                                <span className="w-2.5 h-2.5 rounded-full bg-bone" />
                                <span className="w-2.5 h-2.5 rounded-full bg-bone" />
                                <span className="w-2.5 h-2.5 rounded-full bg-bone" />
                                <span className="ml-3 text-[10px] font-medium text-ink/60">
                                  README.md
                                </span>
                              </div>
                              <div className="mx-auto max-w-[1012px] p-6 lg:p-8">
                                <MarkdownRender
                                  text={editableReadme || readme}
                                  sourceUrl={tab === "url" ? url : undefined}
                                />
                              </div>
                            </div>
                          ) : view === "raw" ? (
                            <pre className="whitespace-pre-wrap font-mono text-sm text-ink leading-relaxed max-w-none p-2 select-text">
                              {editableReadme || readme}
                            </pre>
                          ) : (
                            <textarea
                              value={editableReadme}
                              onChange={(e) => setEditableReadme(e.target.value)}
                              className="w-full min-h-[500px] font-mono text-sm text-ink leading-relaxed bg-paper outline-none resize-none py-4 border-0 focus:ring-0"
                              spellCheck={false}
                              data-lenis-prevent
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

function MarkdownRender({ text, sourceUrl }: { text: string; sourceUrl?: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0,
    key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*<!--/.test(line)) {
      while (i < lines.length && !lines[i].includes("-->")) i++;
      if (i < lines.length) i++;
      continue;
    }

    // GitHub-style HTML blocks commonly used for README branding and hero
    // sections. Render the safe, presentational subset instead of displaying
    // the tags as literal text.
    if (/^\s*<div\b/i.test(line)) {
      const openingEnd = line.indexOf(">");
      const openingTag = openingEnd >= 0 ? line.slice(0, openingEnd + 1) : "";
      const openingAttrs = htmlAttributes(openingTag);
      const innerLines = [openingEnd >= 0 ? line.slice(openingEnd + 1) : line];
      i++;
      while (i < lines.length && !/^\s*<\/div>\s*$/i.test(lines[i])) {
        innerLines.push(lines[i++]);
      }
      if (i < lines.length) i++;

      const isCentered =
        openingAttrs.align?.toLowerCase() === "center" ||
        /(?:^|\s)text-center(?:\s|$)/i.test(openingAttrs.class || "");
      out.push(
        <div key={key++} className={isCentered ? "my-5 text-center" : "my-5"}>
          <MarkdownRender
            text={innerLines.join("\n").replace(/<\/div>\s*$/i, "")}
            sourceUrl={sourceUrl}
          />
        </div>,
      );
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      const isTree = lang === "text" || buf.some((l) => l.includes("├──") || l.includes("└──"));
      out.push(
        <div key={key++} className="my-5 rounded-lg overflow-hidden border border-bone">
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
            className={`p-4 font-mono text-sm overflow-x-auto leading-relaxed ${isTree ? "bg-paper text-ink" : "readme-code-block"}`}
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
        <div key={key++} className="my-5 overflow-x-auto border border-bone rounded-lg bg-paper">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-bone">
                {headers.map((h, idx) => (
                  <th key={idx} className="p-3 font-medium text-ink text-sm">
                    {inline(h, sourceUrl)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bone">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-cream">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 text-ink/60 text-sm">
                      {inline(cell, sourceUrl)}
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

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      out.push(<hr key={key++} className="my-6 border-0 border-t border-bone" />);
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      out.push(
        <blockquote
          key={key++}
          className="my-4 pl-4 border-l-2 border-ink p-3 text-sm italic text-ink/60"
        >
          {inline(line.slice(2), sourceUrl)}
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
          {inline(h1Text, sourceUrl)}
        </h1>,
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      const h2Text = line.slice(3);
      out.push(
        <h2 key={key++} id={headingId(h2Text)} className="mt-7 mb-3 text-xl font-medium text-ink">
          {inline(h2Text, sourceUrl)}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      const h3Text = line.slice(4);
      out.push(
        <h3 key={key++} id={headingId(h3Text)} className="mt-6 mb-2 text-lg font-medium text-ink">
          {inline(h3Text, sourceUrl)}
        </h3>,
      );
      i++;
      continue;
    }

    if (/^(?:- |\* |\+ )/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(?:- |\* |\+ )/.test(lines[i])) {
        items.push(lines[i++].replace(/^(?:- |\* |\+ )/, ""));
      }
      out.push(
        <ul key={key++} className="my-3 ml-5 list-disc space-y-1.5 text-sm text-ink/60">
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {inline(
                it.replace(/^\[([ xX])\]\s*/, (_, state: string) =>
                  state.toLowerCase() === "x" ? "☑ " : "☐ ",
                ),
                sourceUrl,
              )}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i++].replace(/^\d+[.)]\s+/, ""));
      }
      out.push(
        <ol key={key++} className="my-3 ml-5 list-decimal space-y-1.5 text-sm text-ink/60">
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {inline(it, sourceUrl)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }
    const paragraph = [line.trim()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^>\s/.test(lines[i]) &&
      !/^(?:- |\* |\+ |\d+[.)]\s+)/.test(lines[i]) &&
      !lines[i].startsWith("|") &&
      !/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(lines[i])
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    out.push(
      <p key={key++} className="my-3 text-sm text-ink/60 leading-relaxed">
        {inline(paragraph.join(" "), sourceUrl)}
      </p>,
    );
  }
  return <div className="max-w-none">{out}</div>;
}

function findClosing(text: string, start: number, open: string, close: string) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "\\") {
      i++;
      continue;
    }
    if (text[i] === open) depth++;
    if (text[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function safeUrl(value: string, kind: "link" | "image") {
  const url = value.trim().replace(/^<|>$/g, "");
  if (!url || /^(?:javascript|vbscript|data):/i.test(url)) return null;
  if (kind === "image" && !/^(?:https?:\/\/|\/(?!\/)|\.{1,2}\/)/i.test(url)) return null;
  if (kind === "link" && !/^(?:https?:\/\/|mailto:|#|\/|\.\.?(?:\/|$))/i.test(url)) return null;
  return url;
}

function resolvePreviewImageUrl(value: string, sourceUrl?: string) {
  const url = safeUrl(value, "image");
  if (!url || /^https?:\/\//i.test(url) || !sourceUrl) return url;
  const repo = sourceUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!repo) return url;
  const path = url.replace(/^\.\//, "").replace(/^\//, "");
  return `https://github.com/${repo[1]}/${repo[2].replace(/\.git$/i, "")}/raw/HEAD/${path}`;
}

function htmlAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(tag))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function imageClassName(src: string) {
  const isBadge = /img\.shields\.io|badge|shields/i.test(src);
  return `inline-block ${isBadge ? "max-h-6" : "max-h-80"} max-w-full h-auto align-middle object-contain`;
}

function parseDestination(text: string, start: number) {
  if (text[start] !== "(") return null;
  const end = findClosing(text, start, "(", ")");
  if (end < 0) return null;
  const destination = text.slice(start + 1, end).trim();
  const match = destination.match(/^(?:<([^>]+)>|(\S+?))(?:\s+["']([^"']*)["'])?$/);
  if (!match) return null;
  return { end, url: match[1] ?? match[2], title: match[3] };
}

/**
 * Render the inline Markdown used by generated READMEs without injecting raw
 * HTML. React escapes text nodes for us, while links and images are created
 * only after their destinations pass the URL allow-list.
 */
function inline(text: string, sourceUrl?: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let buffer = "";
  let key = 0;

  const flush = () => {
    if (buffer) {
      nodes.push(buffer);
      buffer = "";
    }
  };

  for (let i = 0; i < text.length; i++) {
    const rest = text.slice(i);

    if (text[i] === "\\" && "\\`*_{}[]()#+.!<>~-".includes(text[i + 1] ?? "")) {
      buffer += text[++i];
      continue;
    }

    const breakMatch = rest.match(/^<br\s*\/?>/i);
    if (breakMatch) {
      flush();
      nodes.push(<br key={key++} />);
      i += breakMatch[0].length - 1;
      continue;
    }

    // Render the README HTML patterns GitHub supports for badges, logos, and
    // centered hero content. Attributes are parsed and URLs are allow-listed.
    if (/^<img\b/i.test(rest)) {
      const end = rest.indexOf(">");
      if (end >= 0) {
        const attrs = htmlAttributes(rest.slice(0, end + 1));
        const url = attrs.src && resolvePreviewImageUrl(attrs.src, sourceUrl);
        if (url) {
          flush();
          nodes.push(
            <img
              key={key++}
              src={url}
              alt={attrs.alt || ""}
              title={attrs.title}
              loading="lazy"
              className={imageClassName(url)}
            />,
          );
          i += end;
          continue;
        }
      }
    }

    if (/^<a\b/i.test(rest)) {
      const openingEnd = rest.indexOf(">");
      const closingStart = rest.search(/<\/a>\s*/i);
      if (openingEnd >= 0 && closingStart > openingEnd) {
        const linkAttrs = htmlAttributes(rest.slice(0, openingEnd + 1));
        const inner = rest.slice(openingEnd + 1, closingStart);
        const imageEnd = inner.search(/\/>|>/);
        const imageTag =
          /^\s*<img\b/i.test(inner) && imageEnd >= 0 ? inner.slice(0, imageEnd + 1) : "";
        const imageAttrs = imageTag ? htmlAttributes(imageTag) : {};
        const linkUrl = linkAttrs.href && safeUrl(linkAttrs.href, "link");
        const imageUrl = imageAttrs.src && resolvePreviewImageUrl(imageAttrs.src, sourceUrl);
        if (linkUrl && imageUrl) {
          flush();
          nodes.push(
            <a
              key={key++}
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex align-middle hover:opacity-80 transition-opacity"
            >
              <img
                src={imageUrl}
                alt={imageAttrs.alt || ""}
                title={imageAttrs.title}
                loading="lazy"
                className={imageClassName(imageUrl)}
              />
            </a>,
          );
          i += closingStart + 3;
          continue;
        }
      }
    }

    const inlineHtml = rest.match(/^<(strong|b|em|i|del|s|u|code|sub|sup|mark)>([\s\S]*?)<\/\1>/i);
    if (inlineHtml) {
      flush();
      const tag = inlineHtml[1].toLowerCase();
      const content = inline(inlineHtml[2], sourceUrl);
      const nodeKey = key++;
      if (tag === "strong" || tag === "b") {
        nodes.push(
          <strong key={nodeKey} className="font-semibold text-ink">
            {content}
          </strong>,
        );
      } else if (tag === "em" || tag === "i") {
        nodes.push(<em key={nodeKey}>{content}</em>);
      } else if (tag === "code") {
        nodes.push(
          <code
            key={nodeKey}
            className="bg-cream border border-bone px-1.5 py-0.5 font-mono text-xs rounded-md"
          >
            {content}
          </code>,
        );
      } else if (tag === "del" || tag === "s") {
        nodes.push(<del key={nodeKey}>{content}</del>);
      } else if (tag === "sub") {
        nodes.push(<sub key={nodeKey}>{content}</sub>);
      } else if (tag === "sup") {
        nodes.push(<sup key={nodeKey}>{content}</sup>);
      } else if (tag === "mark") {
        nodes.push(
          <mark key={nodeKey} className="rounded bg-yellow-200/60 px-1 text-ink">
            {content}
          </mark>,
        );
      } else {
        nodes.push(<u key={nodeKey}>{content}</u>);
      }
      i += inlineHtml[0].length - 1;
      continue;
    }

    if (rest.startsWith("![")) {
      const labelEnd = findClosing(text, i + 1, "[", "]");
      if (labelEnd >= 0) {
        const destination = parseDestination(text, labelEnd + 1);
        const url = destination && resolvePreviewImageUrl(destination.url, sourceUrl);
        if (destination && url) {
          const alt = text.slice(i + 2, labelEnd).replace(/\\(.)/g, "$1");
          flush();
          const image = (
            <img
              key={key++}
              src={url}
              alt={alt}
              title={destination.title}
              loading="lazy"
              className={imageClassName(url)}
            />
          );
          nodes.push(
            <a
              key={key++}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex align-middle hover:opacity-80 transition-opacity"
            >
              {image}
            </a>,
          );
          i = destination.end;
          continue;
        }
      }
    }

    if (text[i] === "[") {
      const labelEnd = findClosing(text, i, "[", "]");
      if (labelEnd >= 0) {
        const destination = parseDestination(text, labelEnd + 1);
        const url = destination && safeUrl(destination.url, "link");
        if (destination && url) {
          flush();
          nodes.push(
            <a
              key={key++}
              href={url}
              target="_blank"
              rel="noreferrer"
              title={destination.title}
              className="text-electric-iris underline decoration-electric-iris/40 underline-offset-2 hover:text-lavender-dark"
            >
              {inline(text.slice(i + 1, labelEnd), sourceUrl)}
            </a>,
          );
          i = destination.end;
          continue;
        }
      }
    }

    if (text[i] === "<") {
      const end = text.indexOf(">", i + 1);
      const candidate = end >= 0 ? text.slice(i + 1, end) : "";
      if (/^(?:https?:\/\/|mailto:)/i.test(candidate)) {
        const url = safeUrl(candidate, "link");
        if (url) {
          flush();
          nodes.push(
            <a
              key={key++}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-electric-iris underline underline-offset-2"
            >
              {candidate}
            </a>,
          );
          i = end;
          continue;
        }
      }
    }

    if (
      text[i] === "`" ||
      rest.startsWith("**") ||
      rest.startsWith("__") ||
      rest.startsWith("~~")
    ) {
      const marker = text[i] === "`" ? "`" : text.slice(i, i + 2);
      const end = text.indexOf(marker, i + marker.length);
      if (end > i + marker.length) {
        flush();
        const content = text.slice(i + marker.length, end);
        if (marker === "`") {
          nodes.push(
            <code
              key={key++}
              className="bg-cream border border-bone px-1.5 py-0.5 font-mono text-xs text-ink rounded-md"
            >
              {content}
            </code>,
          );
        } else {
          const tag = marker === "~~" ? "del" : "strong";
          const children = inline(content, sourceUrl);
          nodes.push(
            tag === "del" ? (
              <del key={key++}>{children}</del>
            ) : (
              <strong key={key++} className="font-semibold text-ink">
                {children}
              </strong>
            ),
          );
        }
        i = end;
        continue;
      }
    }

    if ((text[i] === "*" || text[i] === "_") && text[i + 1] !== " ") {
      const marker = text[i];
      const end = text.indexOf(marker, i + 1);
      if (end > i + 1 && text[end - 1] !== " ") {
        flush();
        nodes.push(<em key={key++}>{inline(text.slice(i + 1, end), sourceUrl)}</em>);
        i = end;
        continue;
      }
    }

    buffer += text[i];
  }

  flush();
  return <>{nodes}</>;
}
