import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronDown, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Criterion {
  key: string;
  label: string;
  weight: number;
}

const CRITERIA: Criterion[] = [
  { key: "h1", label: "Project title (H1)", weight: 15 },
  { key: "description", label: "Description", weight: 10 },
  { key: "badge", label: "Badges", weight: 5 },
  { key: "codeBlock", label: "Code block example", weight: 10 },
  { key: "installation", label: "## Installation / Getting Started", weight: 15 },
  { key: "usage", label: "## Usage / Examples", weight: 15 },
  { key: "api", label: "## API Documentation", weight: 10 },
  { key: "toc", label: "## Table of Contents", weight: 5 },
  { key: "contributing", label: "## Contributing", weight: 5 },
  { key: "license", label: "## License", weight: 5 },
  { key: "configuration", label: "## Configuration / Environment", weight: 5 },
];

const SECTION_HEADING: Record<string, string> = {
  installation: "## Installation\n\n",
  usage: "## Usage\n\n```\n\n```\n\n",
  api: "## API Documentation\n\n",
  toc: "## Table of Contents\n\n",
  contributing: "## Contributing\n\n",
  license: "## License\n\n",
  configuration: "## Configuration\n\n",
};

function computeScore(text: string) {
  const results: Record<string, boolean> = {};

  results.h1 = /^#\s+\S/m.test(text);

  const descMatch = text.match(/^#\s+.+\n\n([^#]+)/m);
  results.description = !!descMatch && descMatch[1].trim().length > 10;

  results.badge = /(shields\.io|img\.shields\.io|\[!\[)/i.test(text);

  results.codeBlock = /```/m.test(text);

  results.installation = /^##\s*(Installation|Getting Started)\b/m.test(text);
  results.usage = /^##\s*(Usage|Examples?)\b/m.test(text);
  results.api = /^##\s*(API(\s+Documentation)?)\b/m.test(text);
  results.toc = /^##\s*Table of Contents\b/m.test(text);
  results.contributing = /^##\s*Contributing\b/m.test(text);
  results.license = /^##\s*License\b/m.test(text);
  results.configuration = /^##\s*(Configuration|Environment)\b/m.test(text);

  let total = 0;
  for (const c of CRITERIA) {
    if (results[c.key]) total += c.weight;
  }

  return { total, max: 100, results };
}

function AnimatedRing({ score }: { score: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circ - (progress / 100) * circ;
  const color = score <= 40 ? "#ef4444" : score <= 70 ? "#f59e0b" : "#22c55e";
  const label = score <= 40 ? "Needs work" : score <= 70 ? "Fair" : "Good";

  return (
    <div className="flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e5e0" strokeWidth="5" />
        <motion.circle
          cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="34" textAnchor="middle" className="text-base font-semibold" fill={color}>
          <tspan>{Math.round(progress)}</tspan>
        </text>
        <text x="36" y="52" textAnchor="middle" fontSize="8" fill="#707070">/100</text>
      </svg>
      <div>
        <div className="text-sm font-semibold text-ink">Health Score</div>
        <Badge variant={score <= 40 ? "destructive" : score <= 70 ? "secondary" : "default"} className="mt-0.5 text-[10px]">
          {label}
        </Badge>
      </div>
    </div>
  );
}

interface HealthScoreProps {
  text: string;
  generating?: string | null;
  onGenerateSection?: (section: string) => void;
}

export function HealthScore({ text, generating, onGenerateSection }: HealthScoreProps) {
  const [expanded, setExpanded] = useState(true);
  const [generatedKeys, setGeneratedKeys] = useState<Set<string>>(new Set());
  const [scoredText, setScoredText] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setScoredText(text);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text]);

  if (!text) return null;

  const { total, results } = computeScore(scoredText || text);
  const passed = CRITERIA.filter((c) => results[c.key] || generatedKeys.has(c.key));
  const failed = CRITERIA.filter((c) => !results[c.key] && !generatedKeys.has(c.key));

  const handleGenerate = (key: string) => {
    setGeneratedKeys((prev) => new Set(prev).add(key));
    onGenerateSection?.(key);
  };

  return (
    <div className="p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <AnimatedRing score={total} />
        <div className="flex items-center gap-2">
          <motion.div
            animate={total < 80 ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={14} className={total >= 80 ? "text-green-500" : total >= 50 ? "text-amber-500" : "text-graphite"} />
          </motion.div>
          <ChevronDown
            size={14}
            className={cn("text-graphite transition-transform duration-200", expanded && "rotate-180")}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="checklist"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5">
              {passed.map((c, i) => (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-ink/[0.03] transition-colors group"
                >
                  <Checkbox checked disabled className="opacity-60 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                  <span className="text-xs text-ink/60 font-medium">{c.label}</span>
                  <motion.span
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500/60"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1] }}
                    transition={{ delay: 0.2 + i * 0.04, duration: 0.4 }}
                  />
                </motion.div>
              ))}
            </div>

            {failed.length > 0 && passed.length > 0 && (
              <div className="my-3 border-t border-ink/10" />
            )}

            {failed.length > 0 && (
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-graphite uppercase tracking-widest px-2.5 block mb-1.5">
                  Missing
                </span>
                {failed.map((c, i) => (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (passed.length + i) * 0.04, duration: 0.3 }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-ink/[0.03] transition-colors group cursor-default"
                  >
                    <div className="w-4 h-4 rounded-md border border-ink/20 flex items-center justify-center shrink-0 bg-cream-paper">
                      <X size={10} className="text-graphite/60" />
                    </div>
                    <span className="text-xs text-graphite flex-1">{c.label}</span>
                    {onGenerateSection && SECTION_HEADING[c.key] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={generating === c.key}
                        onClick={() => handleGenerate(c.key)}
                        className="opacity-0 group-hover:opacity-100 transition-all h-7 px-2.5 text-[10px] gap-1.5 rounded-lg hover:bg-ink hover:text-cream-paper"
                      >
                        {generating === c.key ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Sparkles size={10} />
                        )}
                        {generating === c.key ? "Generating..." : "Generate"}
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
