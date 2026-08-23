import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const readmes = [
  {
    name: "next-forge",
    lang: "TypeScript",
    badge: "MIT",
    snippet: `## Installation

\`\`\`bash
npm install next-forge
\`\`\`

## Usage

\`\`\`tsx
import { ForgeProvider, useForge } from "next-forge";

function App() {
  const { data, isLoading } = useForge("/api/build");
  return <div>{isLoading ? "Building..." : data}</div>;
}
\`\`\``,
  },
  {
    name: "prisma-orm-kit",
    lang: "TypeScript",
    badge: "Apache-2.0",
    snippet: `## Tech Stack

- **Runtime:** Node.js 20+, Bun 1.0+
- **Framework:** Next.js 15 with App Router
- **Database:** PostgreSQL 16 via Prisma ORM
- **Auth:** NextAuth v5 with Google provider`,
  },
  {
    name: "py-data-pipeline",
    lang: "Python",
    badge: "MIT",
    snippet: `## API Reference

### \`process_pipeline(data: dict) -> dict\`

Processes raw data through the transformation pipeline.

| Parameter | Type | Description |
|-----------|------|-------------|
| data | dict | Input data with \`source\` and \`config\` keys |
| normalize | bool | Whether to normalize output (default: True) |`,
  },
];

export function Spotlight() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current) return;
      gsap.from(sectionRef.current.querySelectorAll(".spotlight-card"), {
        opacity: 0,
        y: 40,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="examples"
      ref={sectionRef}
      className="py-24 md:py-32 bg-paper relative overflow-hidden scroll-mt-20"
    >
      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="max-w-[768px] mx-auto text-center mb-14">
          <p className="text-sm text-fog uppercase tracking-[0.2em] mb-4">Recent work</p>
          <h2
            className="editorial-display text-ink"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15 }}
          >
            READMEs that actually look good
          </h2>
         <p className="mt-5 text-lg text-fog leading-relaxed max-w-2xl mx-auto">
            No template filler. Every section is written from your actual source code.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-bone">
          {readmes.map((r, i) => (
            <div key={i} className="spotlight-card bg-paper overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-bone">
                <span className="w-2 h-2 rounded-full bg-bone" />
                <span className="w-2 h-2 rounded-full bg-bone" />
                <span className="w-2 h-2 rounded-full bg-bone" />
                <span className="ml-2 text-[10px] text-fog font-mono">{r.name}/README.md</span>
                <span className="ml-auto flex gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-bone text-fog">
                    {r.lang}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream text-ink">
                    {r.badge}
                  </span>
                </span>
              </div>
              <div className="p-5">
                <pre className="text-[11px] font-mono text-ink leading-relaxed whitespace-pre-wrap">
                  {r.snippet}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
