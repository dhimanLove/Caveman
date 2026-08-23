import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link as LinkIcon, FileCode, Check } from "@phosphor-icons/react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    icon: <LinkIcon size={18} weight="duotone" />,
    title: "Drop your repo",
    desc: "Paste a GitHub URL or type a quick description. Zero setup.",
    detail: "Works with any public repo. Private repos? Sign in with Google - we handle the auth.",
  },
  {
    icon: <FileCode size={18} weight="duotone" />,
    title: "Deep scan",
    desc: "Caveman reads your file tree, dependencies, entry points, and 50+ source files.",
    detail: "Detects your framework, package manager, database, and API structure automatically.",
  },
  {
    icon: <Check size={18} weight="duotone" />,
    title: "Ship it",
    desc: "Polished README with badges, install commands, API docs, and architecture notes.",
    detail: "Edit inline, copy sections, or download. Your README, your control.",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current) return;
      const cards = sectionRef.current.querySelectorAll(".step-card");
      gsap.from(cards, {
        opacity: 0,
        y: 50,
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
      id="how"
      ref={sectionRef}
      className="py-24 md:py-32 bg-paper relative overflow-hidden scroll-mt-20"
    >
      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="max-w-[768px] mx-auto text-center mb-16">
          <p className="text-sm text-fog uppercase tracking-[0.2em] mb-4">How it works</p>
          <h2
            className="editorial-display text-ink"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15 }}
          >
            Three cave-simple steps
          </h2>
          <p className="mt-5 text-lg text-fog leading-relaxed max-w-[560px] mx-auto">
            From URL to polished README in under 90 seconds.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-bone">
          {steps.map((step, i) => (
            <div key={i} className="step-card group bg-paper p-10 relative transition-colors duration-300 hover:bg-cream">
              <div className="flex items-center justify-between mb-8">
                <div className="w-10 h-10 rounded-[4px] bg-ink flex items-center justify-center text-cream transition-colors duration-300 group-hover:bg-electric-iris">
                  {step.icon}
                </div>
                <span className="editorial-display text-5xl text-bone leading-none transition-colors duration-300 group-hover:text-electric-iris/40">0{i + 1}</span>
              </div>

              <h3 className="text-xl font-light text-ink mb-2">{step.title}</h3>
              <p className="text-fog text-[15px] leading-relaxed mb-4">{step.desc}</p>
              <p className="text-sm text-iron leading-relaxed border-t border-bone pt-4">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
