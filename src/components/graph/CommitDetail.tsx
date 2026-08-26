import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX as X, IconCommit as GitCommit, IconUser as User, IconCalendar as Calendar, IconGitBranch as GitFork, IconCopy as CopySimple } from "@/components/icons";

interface CommitNode {
  sha: string;
  message: string;
  author: string;
  avatar: string;
  date: string;
  parents: string[];
}

interface CommitDetailProps {
  node: CommitNode | null;
  onClose: () => void;
}

function formatDate(iso: string) {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function CommitDetail({ node, onClose }: CommitDetailProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="rounded-2xl border border-bone bg-paper p-5 shadow-lg"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              {node.avatar ? (
                <img
                  src={node.avatar}
                  alt={`${node.author} avatar`}
                  className="w-12 h-12 rounded-full border border-bone shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-cream border border-bone flex items-center justify-center shrink-0">
                  <User size={18} className="text-ink/40" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{node.author}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-ink/80 font-mono truncate">
                    {node.sha.slice(0, 12)}
                  </p>
                  <button
                    onClick={() => handleCopy(node.sha)}
                    aria-label="Copy commit SHA"
                    className="ml-1 text-ink/40 hover:text-ink transition-colors"
                    title="Copy SHA"
                  >
                    <CopySimple size={12} />
                  </button>
                  {copied && <span className="text-[10px] text-ink/60 ml-1">Copied</span>}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close commit detail"
              className="shrink-0 w-8 h-8 rounded-full border border-bone flex items-center justify-center hover:bg-cream transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Commit message */}
          <div className="rounded-lg bg-cream border border-bone p-4 mb-3">
            <p className="text-sm text-ink leading-relaxed break-words whitespace-pre-wrap">
              {node.message}
            </p>
          </div>

          {/* Meta info */}
          <div className="space-y-2 text-xs text-ink/60">
            <div className="flex items-center gap-2">
              <Calendar size={12} />
              <span>{formatDate(node.date)}</span>
            </div>
            {node.parents.length > 0 && (
              <div className="flex items-center gap-2">
                <GitFork size={12} />
                <span>
                  {node.parents.length} parent{node.parents.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <GitCommit size={12} />
              <span className="font-mono text-[10px] break-all">{node.sha}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
