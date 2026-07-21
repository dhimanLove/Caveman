import { useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ArrowRight } from "@phosphor-icons/react";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (textRef.current) {
        const children = textRef.current.children;
        gsap.set(children, { opacity: 0, y: 20 });
        tl.to(children, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-cream-paper">
      <div className="mx-auto max-w-[1200px] px-6 pt-20 pb-20">
        <div ref={textRef} className="mx-auto max-w-3xl text-center">
          <span className="step-badge mx-auto">
            <span className="step-badge-num">1</span>
            <span className="step-badge-label">AI README Generator</span>
          </span>

          <h1 className="mt-8 text-[clamp(40px,6vw,64px)] font-medium text-ink leading-[1.25] tracking-[var(--tracking-display)]">
            The AI README generator
            <br />
            that writes itself.
          </h1>

          <p className="mt-4 text-lg text-graphite max-w-[640px] mx-auto leading-relaxed">
            Caveman is an AI README generator that turns your GitHub repo or project description into
            production-ready documentation. No templates. No busywork. Just your code and a README that ships.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/generate"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-sunshine-highlight text-ink text-sm font-medium hover:opacity-90 transition-opacity gap-2"
            >
              Generate Your README <ArrowRight size={16} weight="bold" />
            </Link>
            <a
              href="/#how"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-ink text-ink text-sm font-medium hover:bg-ink hover:text-cream-paper transition-colors"
            >
              How It Works
            </a>
          </div>
        </div>

        <div className="mt-16 mx-auto max-w-[200px]">
          <div className="rounded-2xl border border-ink px-5 py-3 text-center">
            <span className="text-[10px] font-medium text-graphite uppercase tracking-[0.286em]">Status</span>
            <p className="mt-0.5 text-sm font-medium text-ink">Early Access</p>
          </div>
        </div>
      </div>
    </section>
  );
}
