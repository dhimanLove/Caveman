import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, FileCode, Component, Zap, Database, PencilLine, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Discovery {
  inferredTitle?: string;
  inferredDescription?: string;
  detectedStack?: string[];
  fileCount?: number;
  componentCount?: number;
  apiRoutes?: number;
  databaseModels?: number;
}

interface AutoDetectionPanelProps {
  discovery: Discovery | null | undefined;
}

const CATEGORY_COLORS: Record<string, string> = {
  react: "bg-blue-100 text-blue-800 border-blue-200",
  vue: "bg-green-100 text-green-800 border-green-200",
  angular: "bg-red-100 text-red-800 border-red-200",
  node: "bg-green-100 text-green-800 border-green-200",
  express: "bg-gray-100 text-gray-800 border-gray-200",
  next: "bg-purple-100 text-purple-800 border-purple-200",
  typescript: "bg-blue-100 text-blue-800 border-blue-200",
  python: "bg-yellow-100 text-yellow-800 border-yellow-200",
  postgres: "bg-cyan-100 text-cyan-800 border-cyan-200",
  mongodb: "bg-emerald-100 text-emerald-800 border-emerald-200",
  redis: "bg-red-100 text-red-800 border-red-200",
  prisma: "bg-indigo-100 text-indigo-800 border-indigo-200",
  tailwind: "bg-teal-100 text-teal-800 border-teal-200",
  docker: "bg-sky-100 text-sky-800 border-sky-200",
  vite: "bg-purple-100 text-purple-800 border-purple-200",
};

function inferCategory(tech: string) {
  const lower = tech.toLowerCase();
  for (const [key] of Object.entries(CATEGORY_COLORS)) {
    if (lower.includes(key)) return key;
  }
  return "default";
}

const CATEGORY_CLASS: Record<string, string> = {
  default: "bg-ink/5 text-ink border-ink/20",
};

function techColor(tech: string) {
  const cat = inferCategory(tech);
  return CATEGORY_COLORS[cat] || CATEGORY_CLASS.default;
}

function AnimatedCount({ value, duration = 800 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <span ref={ref}>{count}</span>;
}

function StatCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <Card className="border-ink/10 bg-ink/[0.02] shadow-none">
        <CardContent className="p-2.5 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg border border-ink/10 flex items-center justify-center text-graphite shrink-0">
            {icon}
          </span>
          <div>
            <div className="text-xs font-semibold text-ink">
              <AnimatedCount value={value} />
            </div>
            <div className="text-[10px] text-graphite">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !text) return;
    done.current = true;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayed || text}</span>;
}

export function AutoDetectionPanel({ discovery }: AutoDetectionPanelProps) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [appliedTitle, setAppliedTitle] = useState("");

  useEffect(() => {
    if (discovery?.inferredTitle) setAppliedTitle(discovery.inferredTitle);
  }, [discovery?.inferredTitle]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (!discovery) return null;

  const stack = discovery.detectedStack ?? [];

  const itemVariants = {
    hidden: { opacity: 0, y: 6 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
  };

  return (
    <div className="p-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <Code size={14} className="text-ink" />
          <span className="text-xs font-semibold text-ink uppercase tracking-wider">Auto-Detection</span>
          {stack.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {stack.length} tech{stack.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <ChevronDown
          size={14}
          className={cn("text-graphite transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {stack.length > 0 && (
            <div>
              <span className="text-[10px] font-medium text-graphite uppercase tracking-widest block mb-2">
                Tech Stack
              </span>
              <div className="flex flex-wrap gap-1.5">
                {stack.map((tech, i) => (
                  <motion.span
                    key={tech}
                    custom={i}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border transition-shadow hover:shadow-sm",
                      techColor(tech),
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", techColor(tech).includes("blue") ? "bg-blue-500" : techColor(tech).includes("green") ? "bg-green-500" : techColor(tech).includes("purple") ? "bg-purple-500" : techColor(tech).includes("red") ? "bg-red-500" : techColor(tech).includes("yellow") ? "bg-yellow-500" : techColor(tech).includes("cyan") ? "bg-cyan-500" : techColor(tech).includes("emerald") ? "bg-emerald-500" : techColor(tech).includes("indigo") ? "bg-indigo-500" : techColor(tech).includes("teal") ? "bg-teal-500" : techColor(tech).includes("sky") ? "bg-sky-500" : "bg-gray-500")} />
                    {tech}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={<FileCode size={12} />} label="Files scanned" value={discovery.fileCount ?? 0} delay={0.15} />
            <StatCard icon={<Component size={12} />} label="Components" value={discovery.componentCount ?? 0} delay={0.2} />
            <StatCard icon={<Zap size={12} />} label="API routes" value={discovery.apiRoutes ?? 0} delay={0.25} />
            <StatCard icon={<Database size={12} />} label="DB models" value={discovery.databaseModels ?? 0} delay={0.3} />
          </div>

          {discovery.inferredTitle && (
            <div className="pt-3 border-t border-ink/10">
              <span className="text-[10px] font-medium text-graphite uppercase tracking-widest block mb-1">
                Inferred
              </span>
              <div className="flex items-center gap-1.5 group">
                {editing ? (
                  <input
                    ref={inputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => { setEditing(false); if (editTitle.trim()) setAppliedTitle(editTitle.trim()); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { setEditing(false); if (editTitle.trim()) setAppliedTitle(editTitle.trim()); }
                      if (e.key === "Escape") { setEditing(false); setEditTitle(appliedTitle); }
                    }}
                    className="flex-1 text-sm font-semibold text-ink bg-transparent border-b border-ink outline-none px-0 py-0.5"
                  />
                ) : (
                  <span className="text-sm font-semibold text-ink truncate flex-1">{appliedTitle}</span>
                )}
                {!editing && (
                  <button
                    onClick={() => { setEditTitle(appliedTitle); setEditing(true); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <PencilLine size={12} className="text-graphite hover:text-ink" />
                  </button>
                )}
              </div>
              {discovery.inferredDescription && (
                <p className="text-[10px] text-graphite mt-1 leading-relaxed line-clamp-3">
                  <TypewriterText text={discovery.inferredDescription} />
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
