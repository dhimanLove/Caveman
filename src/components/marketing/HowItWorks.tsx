import { useRef, useEffect } from "react";
import { GithubLogo, Brain, FileArrowDown } from "@phosphor-icons/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  { n: "1", title: "Drop your repo URL", body: "Paste a GitHub URL or describe your project in a sentence. We handle both public and private repositories with full context extraction.", Icon: GithubLogo, label: "Easy Start" },
  { n: "2", title: "Caveman analyzes", body: "Our model reads your code, understands the stack, and drafts a README tailored to how your users will actually use the project.", Icon: Brain, label: "Instant Output" },
  { n: "3", title: "Download & ship", body: "Copy to clipboard or download as README.md. Commit and push. You are done in 90 seconds flat.", Icon: FileArrowDown, label: "Ship It" },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardsRef.current?.querySelectorAll(".how-card");
      if (!cards?.length) return;
      gsap.set(cards, { opacity: 0, y: 24 });
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.to(cards, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power4.out" });
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="how" ref={sectionRef} className="bg-cream-paper py-16 border-t border-ink">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-xl">
          <span className="step-badge">
            <span className="step-badge-num">3</span>
            <span className="step-badge-label">How It Works</span>
          </span>
          <h2 className="mt-6 text-[28px] font-medium text-ink leading-[1.25]">
            Three steps to perfect documentation
          </h2>
        </div>

        <div ref={cardsRef} className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.n} className="how-card rounded-3xl border border-ink bg-cream-paper p-8">
              <span className="step-badge text-[11px]">
                <span className="step-badge-num text-[11px]" style={{ width: 20, height: 20, fontSize: 11 }}>{s.n}</span>
                <span className="step-badge-label text-[11px]" style={{ padding: "0 8px", letterSpacing: "0.2em" }}>{s.label}</span>
              </span>
              <div className="mt-5">
                <s.Icon size={20} className="text-ink" weight="regular" />
              </div>
              <h3 className="mt-4 text-2xl font-medium text-ink">{s.title}</h3>
              <p className="mt-2 text-lg text-graphite leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
