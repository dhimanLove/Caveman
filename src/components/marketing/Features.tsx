import { useRef, useEffect } from "react";
import { Stack, Copy, GitBranch, Sliders } from "@phosphor-icons/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  { title: "Auto-detected stack", body: "We read your package.json, imports, and file tree. Badges and install instructions come free, matched to your actual dependencies." },
  { title: "One-click copy", body: "Copy the whole README or grab any section. Paste-ready markdown, always formatted and indented correctly." },
  { title: "Export to GitHub", body: "Open a PR with your new README directly from Caveman. No copy-paste, no context switching." },
  { title: "Custom sections", body: "Toggle Installation, API docs, Contributing, Roadmap. Reorder and configure to match your project structure." },
];

const icons = [Stack, Copy, GitBranch, Sliders];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardsRef.current?.querySelectorAll(".feature-card");
      if (!cards?.length) return;
      gsap.set(cards, { opacity: 0, y: 20 });
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.to(cards, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out" });
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="bg-cream-paper py-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-xl">
          <span className="step-badge">
            <span className="step-badge-num">2</span>
            <span className="step-badge-label">Features</span>
          </span>
          <h2 className="mt-6 text-[28px] font-medium text-ink leading-[1.25]">
            Everything a README needs.
          </h2>
          <p className="mt-2 text-lg text-graphite max-w-lg leading-relaxed">
            Batteries included. Badges, code blocks, tables of contents, and the small polish that separates a good repo from a great one.
          </p>
        </div>

        <div ref={cardsRef} className="mt-10 grid gap-6 md:grid-cols-2">
          {features.map((f, i) => {
            const Icon = icons[i];
            return (
              <div
                key={f.title}
                className="feature-card rounded-3xl border border-ink bg-cream-paper p-8"
              >
                <Icon size={20} className="text-ink" weight="regular" />
                <h3 className="mt-4 text-2xl font-medium text-ink">{f.title}</h3>
                <p className="mt-2 text-lg text-graphite leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
