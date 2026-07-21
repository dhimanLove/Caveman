import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section className="bg-cream-paper py-16 border-t border-ink">
      <div className="mx-auto max-w-[800px] px-6 text-center">
        <div className="w-12 h-12 rounded-xl border border-ink bg-cream-paper flex items-center justify-center mx-auto">
          <span className="text-lg font-medium text-ink">C</span>
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-[clamp(32px,5vw,64px)] font-medium text-ink leading-[1.25] tracking-[var(--tracking-display)]"
        >
          Ready for better docs?
        </motion.h2>
        <p className="mt-2 text-lg text-graphite max-w-md mx-auto leading-relaxed">
          No more blank READMEs. No more excuses. Just drop your repo URL and go.
        </p>
        <div className="mt-8">
          <Link
            to="/generate"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-sunshine-highlight text-ink text-sm font-medium hover:opacity-90 transition-opacity gap-2"
          >
            Generate Your README Free <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
