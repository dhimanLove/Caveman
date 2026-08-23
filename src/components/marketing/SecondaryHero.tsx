import { useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check } from "@phosphor-icons/react";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    eyebrow: "Deep scanning",
    title: "Reads your actual source",
    description:
      "Caveman walks your file tree, resolves imports, and detects your framework, language, and architecture - no guessing, no generic filler.",
  },
  {
    eyebrow: "Adaptive sections",
    title: "Sections that match your stack",
    description:
      "Installation, usage, API reference, environment variables - only included when your project actually has them.",
  },
];

export function SecondaryHero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".sec-hero-statement", {
        opacity: 0,
        y: 40,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%" },
      });
      gsap.from(".sec-hero-card", {
        opacity: 0,
        y: 40,
        duration: 0.9,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="py-24 md:py-32 bg-cream">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-3xl mb-20">
          <p className="sec-hero-statement text-sm text-fog uppercase tracking-[0.2em] mb-6">
            What we do
          </p>
          <h2
            className="sec-hero-statement editorial-display text-ink"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15 }}
          >
            We don't template. <span className="font-normal">We read your code.</span>
          </h2>
          <p className="sec-hero-statement mt-6 text-lg text-fog max-w-[560px] leading-relaxed">
            UI/UX design isn't just about aesthetics. Neither is documentation - it's about making
            interactions smooth and workflows clear. Caveman turns your codebase into a polished,
            accurate document in seconds.
          </p>
          <div className="sec-hero-statement mt-8">
            <Link to="/generate" className="btn-primary">
              Generate your README
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-bone">
          {features.map((f) => (
            <div key={f.title} className="sec-hero-card bg-cream p-10">
              <p className="text-sm text-fog mb-3">{f.eyebrow}</p>
              <h3 className="text-2xl font-light text-ink mb-3">{f.title}</h3>
              <p className="text-fog leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="sec-hero-card flex items-center gap-2 text-sm text-ink/70 pt-8">
          <Check size={15} weight="bold" />
          No lock-in - export markdown and take it anywhere.
        </div>
      </div>
    </section>
  );
}
