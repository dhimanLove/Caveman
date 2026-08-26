import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { IconChevronDown as ChevronDown, IconFileCode as FileCode, IconComponent as Component, IconZap as Zap, IconDatabase as Database, IconPencil as PencilLine, IconCode as Code } from "@/components/icons";
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

function AnimatedCount({ value, duration = 800 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
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

  return <span>{count}</span>;
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
      <div className="border border-bone rounded-[4px] bg-paper p-2.5 flex items-center gap-2">
        <span className="w-7 h-7 rounded-[4px] bg-cream border border-bone flex items-center justify-center text-ink/60 shrink-0">
          {icon}
        </span>
        <div>
          <div className="text-xs font-medium text-ink">
            <AnimatedCount value={value} />
          </div>
          <div className="text-[10px] text-ink/40">{label}</div>
        </div>
      </div>
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
          <span className="text-xs font-medium text-ink uppercase tracking-wider">
            Auto-Detection
          </span>
          {stack.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-bone bg-cream text-ink/60">
              {stack.length} tech{stack.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={cn("text-ink/40 transition-transform duration-200", open && "rotate-180")}
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
              <span className="text-[10px] font-medium text-ink/40 uppercase tracking-widest block mb-2">
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
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border border-bone bg-cream text-ink/80"
                  >
                    {tech}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<FileCode size={12} />}
              label="Files scanned"
              value={discovery.fileCount ?? 0}
              delay={0.15}
            />
            <StatCard
              icon={<Component size={12} />}
              label="Components"
              value={discovery.componentCount ?? 0}
              delay={0.2}
            />
            <StatCard
              icon={<Zap size={12} />}
              label="API routes"
              value={discovery.apiRoutes ?? 0}
              delay={0.25}
            />
            <StatCard
              icon={<Database size={12} />}
              label="DB models"
              value={discovery.databaseModels ?? 0}
              delay={0.3}
            />
          </div>

          {discovery.inferredTitle && (
            <div className="pt-3 border-t border-bone">
              <span className="text-[10px] font-medium text-ink/40 uppercase tracking-widest block mb-1">
                Inferred
              </span>
              <div className="flex items-center gap-1.5 group">
                {editing ? (
                  <input
                    ref={inputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => {
                      setEditing(false);
                      if (editTitle.trim()) setAppliedTitle(editTitle.trim());
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setEditing(false);
                        if (editTitle.trim()) setAppliedTitle(editTitle.trim());
                      }
                      if (e.key === "Escape") {
                        setEditing(false);
                        setEditTitle(appliedTitle);
                      }
                    }}
                    className="flex-1 text-sm font-semibold text-ink bg-transparent border-b border-ink outline-none px-0 py-0.5"
                  />
                ) : (
                  <span className="text-sm font-semibold text-ink truncate flex-1">
                    {appliedTitle}
                  </span>
                )}
                {!editing && (
                  <button
                    onClick={() => {
                      setEditTitle(appliedTitle);
                      setEditing(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <PencilLine size={12} className="text-ink/40 hover:text-ink" />
                  </button>
                )}
              </div>
              {discovery.inferredDescription && (
                <p className="text-[10px] text-ink/40 mt-1 leading-relaxed line-clamp-3">
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
