import { motion } from "framer-motion";
import { Stack, Copy, GitBranch, Sliders } from "@phosphor-icons/react";

const features = [
  { title: "Auto-detected stack", body: "We read your package.json, imports, and file tree — badges and install instructions come free.", Icon: Stack },
  { title: "One-click copy", body: "Copy the whole README or grab any section. Paste-ready markdown, always.", Icon: Copy },
  { title: "Export to GitHub", body: "Open a PR with your new README directly from Caveman. No copy-paste required.", Icon: GitBranch },
  { title: "Custom sections", body: "Toggle Installation, API docs, Contributing, Roadmap. Reorder to taste.", Icon: Sliders },
];

export function Features() {
  return (
    <section id="features" className="bg-spruce-900 py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <span className="rounded-sm px-3 py-1" style={{ background: "#0b363b", color: "#a1c2c6", fontSize: 12, borderRadius: 2 }}>
            Features
          </span>
          <h2 className="mt-4 text-pure-white" style={{ fontSize: "clamp(32px, 4vw, 40px)", lineHeight: 1.13, fontWeight: 475 }}>
            Everything a <span style={{ color: "#abffae" }}>README</span> needs.
          </h2>
          <p className="mt-4 text-spruce-200" style={{ fontSize: 18 }}>
            Batteries included — badges, code blocks, tables of contents, and the small polish that separates a good repo from a great one.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-sm p-8"
              style={{ background: "#0b363b", border: "1px solid #0b363b", borderRadius: 2 }}
            >
              <f.Icon size={28} style={{ color: "#abffae" }} weight="regular" />
              <h3 className="mt-5 text-pure-white" style={{ fontSize: 24, lineHeight: 1.13, fontWeight: 475 }}>{f.title}</h3>
              <p className="mt-3 text-spruce-200" style={{ fontSize: 16, lineHeight: 1.38 }}>{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
