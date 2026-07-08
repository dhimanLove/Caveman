import { motion } from "framer-motion";
import { CheckCircle } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AnimatedHeadline } from "../ui/AnimatedHeadline";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-spruce-900 pt-20 pb-24 md:pt-28 md:pb-32">
      <div className="mx-auto grid max-w-[1200px] items-center gap-16 px-6 lg:grid-cols-2">
        <div className="hero-text">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-sm px-3 py-1"
            style={{ background: "#fdf0e9", color: "#83611c", fontSize: 12, borderRadius: 2 }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#83611c" }} />
            v1.0 — Now with AI
          </motion.span>

          <AnimatedHeadline
            className="mt-6 text-pure-white"
            style={{
              fontSize: "clamp(48px, 8vw, 96px)",
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              fontWeight: 475,
            }}
          >
            <span className="hl-word inline-block mr-3">Generate</span>
            <span className="hl-word inline-block mr-3">docs</span>
            <span className="hl-word inline-block mr-3">that</span>
            <br />
            <span className="hl-word inline-block mr-3" style={{ color: "#abffae" }}>developers</span>
            <span className="hl-word inline-block mr-3 italic">actually</span>
            <span className="hl-word inline-block" style={{ color: "#863d1c" }}>read.</span>
          </AnimatedHeadline>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-6 max-w-xl text-spruce-200"
            style={{ fontSize: 20, lineHeight: 1.38, fontWeight: 475 }}
          >
            Paste your GitHub repo or describe your project. Caveman writes a README so polished your users will think you hired a technical writer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link to="/generate" className="btn-pill-primary">Start generating free →</Link>
            <a href="#how" className="btn-pill-secondary text-pure-white" style={{ borderColor: "#0b363b" }}>See how it works</a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-spruce-200"
            style={{ fontSize: 13 }}
          >
            {["No account needed", "No signup required", "Free to use"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle size={16} weight="fill" style={{ color: "#abffae" }} />
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-sm p-8"
            style={{ background: "#0b363b", border: "1px solid #0b363b", borderRadius: 2 }}
          >
            <div className="flex items-center gap-1.5 pb-4 border-b border-spruce-mist/30">
              <span className="h-2.5 w-2.5 rounded-full bg-spruce-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-spruce-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-spruce-500" />
              <span className="ml-3 text-spruce-200" style={{ fontSize: 12 }}>README.md</span>
            </div>
            <div className="mt-6 font-mono text-[13px] leading-relaxed text-spruce-200 space-y-3">
              <div className="text-pure-white text-xl" style={{ fontWeight: 500 }}># caveman-cli</div>
              <div className="text-spruce-200">A tiny CLI that turns your repo into <span style={{ color: "#abffae" }}>beautiful docs</span>.</div>
              <div className="pt-3 text-pure-white" style={{ fontWeight: 500 }}>## Installation</div>
              <pre className="rounded-sm p-3" style={{ background: "#032125", borderRadius: 2 }}>
                <code className="text-spruce-200">$ npm install -g caveman</code>
              </pre>
              <div className="pt-2 text-pure-white" style={{ fontWeight: 500 }}>## Usage</div>
              <pre className="rounded-sm p-3" style={{ background: "#032125", borderRadius: 2 }}>
                <code className="text-spruce-200">$ caveman ./my-project</code>
              </pre>
              <div className="flex gap-2 pt-2">
                <span className="rounded-sm px-2 py-0.5" style={{ background: "#eafde8", color: "#032125", fontSize: 11, borderRadius: 2 }}>MIT</span>
                <span className="rounded-sm px-2 py-0.5" style={{ background: "#e2f4ff", color: "#123a88", fontSize: 11, borderRadius: 2 }}>v1.0.0</span>
                <span className="rounded-sm px-2 py-0.5" style={{ background: "#fdf0e9", color: "#863d1c", fontSize: 11, borderRadius: 2 }}>Node 20+</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
