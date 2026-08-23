import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Code,
  GitFork,
  ShieldCheck,
  FileMagnifyingGlass,
  PuzzlePiece,
  Clock,
  Cube,
  Terminal,
  PaintBucket,
} from "@phosphor-icons/react";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: <Code size={18} weight="duotone" />,
    title: "Deep code analysis",
    desc: "Reads your actual source files - entry points, components, APIs, and config. Writes docs that match your real codebase.",
    tag: "Core",
  },
  {
    icon: <GitFork size={18} weight="duotone" />,
    title: "Stack auto-detection",
    desc: "Detects React, Next.js, Tailwind, Prisma, tRPC, Express, Django, and more from your dependencies and file tree.",
    tag: "Detection",
  },
  {
    icon: <Terminal size={18} weight="duotone" />,
    title: "Package manager aware",
    desc: "Reads lockfiles to generate accurate install commands - npm, pnpm, yarn, bun. Even handles monorepo workspaces.",
    tag: "CLI",
  },
  {
    icon: <Cube size={18} weight="duotone" />,
    title: "Architecture mapping",
    desc: "Identifies your project structure, component hierarchy, API routes, and data models. Generates accurate architecture diagrams.",
    tag: "Structure",
  },
  {
    icon: <ShieldCheck size={18} weight="duotone" />,
    title: "Health scoring",
    desc: "Built-in README quality checker scores your docs against 11 criteria. Missing sections? It auto-generates them.",
    tag: "Quality",
  },
  {
    icon: <PuzzlePiece size={18} weight="duotone" />,
    title: "17+ customizable sections",
    desc: "Installation, Usage, API Docs, Contributing, Features, Architecture, Testing, Deployment - toggle any combination.",
    tag: "Flexible",
  },
  {
    icon: <PaintBucket size={18} weight="duotone" />,
    title: "Tone & style control",
    desc: "Switch between Technical, Friendly, or Enterprise tone. Choose Minimal, Standard, or Comprehensive depth. One click.",
    tag: "Custom",
  },
  {
    icon: <Clock size={18} weight="duotone" />,
    title: "Under 90 seconds",
    desc: "URL to polished README in ~47s on average. Includes markdown preview, inline editor, copy, and download.",
    tag: "Speed",
  },
  {
    icon: <FileMagnifyingGlass size={18} weight="duotone" />,
    title: "GitHub deep scan",
    desc: "Traverses up to 3 directory levels. Fetches 50+ source files - components, API routes, config, and schemas - before writing.",
    tag: "Depth",
  },
];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current) return;
      const cards = sectionRef.current.querySelectorAll(".feature-card");
      gsap.from(cards, {
        opacity: 0,
        y: 40,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 bg-cream relative overflow-hidden">
      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="max-w-[768px] mx-auto text-center mb-16">
          <p className="text-sm text-fog uppercase tracking-[0.2em] mb-4">Features</p>
          <h2
            className="editorial-display text-ink"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15 }}
          >
            Every feature, no filler
          </h2>
          <p className="mt-5 text-lg text-fog leading-relaxed max-w-[600px] mx-auto">
            Template generators fill in your project name. Caveman reads your entire codebase.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-bone">
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card group bg-cream p-8 hover:bg-paper transition-colors duration-300 cursor-default relative"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-9 h-9 rounded-[4px] bg-ink flex items-center justify-center text-cream transition-colors duration-300 group-hover:bg-electric-iris">
                  {f.icon}
                </div>
                <span className="text-xs text-fog group-hover:text-electric-iris transition-colors duration-300">
                  {f.tag}
                </span>
              </div>
              <h3 className="text-lg font-light text-ink mb-2">{f.title}</h3>
              <p className="text-fog leading-relaxed text-[15px]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
