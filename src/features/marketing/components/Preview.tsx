import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { KoboyoIllustration } from "@/shared/components/illustrations/KoboyoIllustration";
import { MacWindowDots } from "@/shared/components/ui/MacWindowDots";

gsap.registerPlugin(ScrollTrigger);

const badgeLabels = ["MIT", "TypeScript", "React", "Next.js", "Prisma"];

const previewSections = [
  {
    id: "overview",
    label: "Overview",
    heading: "LaunchKit",
    description:
      "A typed starter for shipping production-ready web apps with auth, billing, and background jobs.",
    kind: "overview" as const,
  },
  {
    id: "installation",
    label: "Installation",
    heading: "Installation",
    description:
      "Clone the repository, install dependencies, and start the local development server.",
    kind: "code" as const,
    code: [
      "git clone https://github.com/acme/launchkit.git",
      "cd launchkit",
      "npm install",
      "npm run dev",
    ],
  },
  {
    id: "usage",
    label: "Usage",
    heading: "Usage",
    description: "Create a project client and fetch the current workspace in a few lines.",
    kind: "code" as const,
    code: [
      'import { LaunchKit } from "@acme/launchkit";',
      "",
      "const kit = new LaunchKit({ workspace: user.id });",
      "const projects = await kit.projects.list();",
    ],
  },
  {
    id: "api",
    label: "API Reference",
    heading: "API Reference",
    description: "The generated docs turn discovered routes into a useful, scannable reference.",
    kind: "table" as const,
    rows: [
      ["GET", "/api/projects", "List workspace projects"],
      ["POST", "/api/projects", "Create a project"],
      ["DELETE", "/api/projects/:id", "Remove a project"],
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    heading: "Architecture",
    description:
      "A grounded folder map shows how the pieces fit together before anyone reads the code.",
    kind: "tree" as const,
    tree: [
      "src/",
      "├── routes/        API and page handlers",
      "├── features/      domain modules",
      "├── lib/           shared services",
      "└── db/            schema and migrations",
    ],
  },
  {
    id: "contributing",
    label: "Contributing",
    heading: "Contributing",
    description: "Clear next steps help a new contributor make a useful first change quickly.",
    kind: "list" as const,
    list: [
      "Create a feature branch from main",
      "Run npm test before opening a pull request",
      "Add a regression test for behavior changes",
    ],
  },
];

export function Preview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current) return;
      gsap.from(sectionRef.current.querySelectorAll(".preview-item"), {
        opacity: 0,
        y: 40,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const activeSection =
    previewSections.find((section) => section.id === activeId) ?? previewSections[0];

  return (
    <section ref={sectionRef} className="py-24 md:py-32 bg-cream relative overflow-hidden">
      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="max-w-[768px] mx-auto text-center mb-14">
          <KoboyoIllustration
            icon="personWebsite"
            alt="hand-drawn person demonstrating a website"
            className="h-20 w-20 mb-5"
          />
          <p className="preview-item text-sm text-fog uppercase tracking-[0.2em] mb-4">
            What you get
          </p>
          <h2
            className="preview-item editorial-display text-ink"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15 }}
          >
            Production-ready. Every time.
          </h2>
        </div>

        <div className="preview-item rounded-md border border-bone bg-paper overflow-hidden">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-bone px-5 py-3.5">
            <MacWindowDots />
            <span className="ml-2 text-xs text-fog font-mono">README.md - Caveman</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-electric-iris">
              Interactive example · LaunchKit
            </span>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/4 space-y-1.5">
                <div className="text-[10px] text-fog uppercase tracking-widest mb-2">
                  Explore the output
                </div>
                {previewSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveId(section.id)}
                    aria-pressed={activeId === section.id}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-left text-xs transition-colors ${activeId === section.id ? "bg-ink text-paper" : "bg-cream text-ink/80 hover:bg-bone/60"}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${activeId === section.id ? "bg-electric-iris" : "bg-ink"}`}
                    />
                    {section.label}
                  </button>
                ))}
              </div>

              <div className="md:w-3/4 space-y-4">
                <div className="pb-3 border-b border-bone">
                  <div className="text-[10px] text-fog uppercase tracking-widest mb-2">
                    {activeSection.heading}
                  </div>
                  <h3 className="text-2xl font-light text-ink">
                    {activeSection.heading === "Overview" ? "# " : ""}
                    {activeSection.heading}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog">
                    {activeSection.description}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {badgeLabels.map((b, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-bone bg-cream text-fog"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {activeSection.kind === "overview" && (
                  <div className="rounded-md border border-bone bg-cream p-4 text-sm leading-relaxed text-ink/70">
                    <p>
                      LaunchKit gives teams a typed foundation for building and shipping web
                      products without repeating the same setup work.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <span className="rounded border border-bone bg-paper px-3 py-2">
                        Auth included
                      </span>
                      <span className="rounded border border-bone bg-paper px-3 py-2">
                        API-first
                      </span>
                      <span className="rounded border border-bone bg-paper px-3 py-2">
                        Type-safe
                      </span>
                      <span className="rounded border border-bone bg-paper px-3 py-2">
                        Deploy-ready
                      </span>
                    </div>
                  </div>
                )}

                {activeSection.kind === "code" && (
                  <div className="rounded-md bg-ink p-4 text-cream">
                    <MacWindowDots className="mb-3 gap-1" />
                    <pre className="overflow-x-auto text-xs leading-7">
                      <code>{activeSection.code?.join("\n")}</code>
                    </pre>
                  </div>
                )}

                {activeSection.kind === "table" && (
                  <div className="overflow-hidden rounded-md border border-bone">
                    <div className="grid grid-cols-3 border-b border-bone bg-cream">
                      {["Method", "Endpoint", "Description"].map((heading) => (
                        <div
                          key={heading}
                          className="px-3 py-2 text-[10px] uppercase tracking-wider text-fog"
                        >
                          {heading}
                        </div>
                      ))}
                    </div>
                    {activeSection.rows?.map(([method, endpoint, description]) => (
                      <div
                        key={endpoint}
                        className="grid grid-cols-3 border-b border-bone last:border-none"
                      >
                        <div className="px-3 py-2 font-mono text-[10px] text-electric-iris">
                          {method}
                        </div>
                        <div className="px-3 py-2 font-mono text-[10px] text-ink/70">
                          {endpoint}
                        </div>
                        <div className="px-3 py-2 text-[10px] text-fog">{description}</div>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection.kind === "tree" && (
                  <pre className="overflow-x-auto rounded-md border border-bone bg-cream p-4 font-mono text-xs leading-7 text-ink/70">
                    <code>{activeSection.tree?.join("\n")}</code>
                  </pre>
                )}

                {activeSection.kind === "list" && (
                  <ul className="space-y-2 rounded-md border border-bone bg-cream p-4 text-sm text-ink/70">
                    {activeSection.list?.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-iris" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
