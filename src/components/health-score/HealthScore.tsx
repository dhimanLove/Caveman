import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronDown, Sparkles, Loader2 } from "lucide-react";
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

function ScoreBadge({ score }: { score: number }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const color =
    score <= 40
      ? "bg-[#ff5f57]/10 text-[#ff5f57] border-[#ff5f57]/30"
      : score <= 70
        ? "bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/30"
        : "bg-ink/10 text-ink border-ink/20";
  const label = score <= 40 ? "Needs work" : score <= 70 ? "Fair" : "Good";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`font-mono text-2xl font-bold ${score <= 40 ? "text-[#ff5f57]" : score <= 70 ? "text-[#f5a623]" : "text-ink"}`}
      >
        {animated}
        <span className="text-xs text-ink/40 font-normal">/100</span>
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">Health Score</div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border ${color}`}
        >
          {label}
        </span>
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
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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
        <ScoreBadge score={total} />
        <div className="flex items-center gap-2">
          <ChevronDown
            size={14}
            className={cn(
              "text-ink/40 transition-transform duration-200",
              expanded && "rotate-180",
            )}
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
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-cream transition-colors group"
                >
                  <div className="w-4 h-4 rounded-sm bg-ink/10 border border-ink/20 flex items-center justify-center shrink-0">
                    <Check size={10} className="text-ink" weight="bold" />
                  </div>
                  <span className="text-xs text-ink/60 font-medium">{c.label}</span>
                </motion.div>
              ))}
            </div>

            {failed.length > 0 && passed.length > 0 && (
              <div className="my-3 border-t border-bone" />
            )}

            {failed.length > 0 && (
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-ink/40 uppercase tracking-widest px-2.5 block mb-1.5">
                  Missing
                </span>
                {failed.map((c, i) => (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (passed.length + i) * 0.04, duration: 0.3 }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-cream transition-colors group cursor-default"
                  >
                    <div className="w-4 h-4 rounded-sm border border-bone bg-paper flex items-center justify-center shrink-0">
                      <X size={10} className="text-ink/40" />
                    </div>
                    <span className="text-xs text-ink/60 flex-1">{c.label}</span>
                    {onGenerateSection && SECTION_HEADING[c.key] && (
                      <button
                        disabled={generating === c.key}
                        onClick={() => handleGenerate(c.key)}
                        className="opacity-0 group-hover:opacity-100 transition-all h-7 px-2.5 text-[10px] gap-1.5 rounded-full border border-bone hover:bg-ink hover:text-paper flex items-center disabled:opacity-40"
                      >
                        {generating === c.key ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Sparkles size={10} />
                        )}
                        {generating === c.key ? "Generating..." : "Generate"}
                      </button>
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
