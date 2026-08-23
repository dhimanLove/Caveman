import { useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, Minus } from "@phosphor-icons/react";

gsap.registerPlugin(ScrollTrigger);

const rows = [
  { trait: "Reads actual source code", us: true, them: false },
  { trait: "Detects frameworks & stack", us: true, them: false },
  { trait: "Writes production READMEs", us: true, them: true },
  { trait: "Deep semantic scanning", us: true, them: false },
  { trait: "Custom section selection", us: true, them: true },
  { trait: "Package manager detection", us: true, them: false },
];

export function Comparison() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current) return;
      const rows = sectionRef.current.querySelectorAll(".compare-row");
      gsap.from(rows, {
        opacity: 0,
        x: -20,
        duration: 0.6,
        stagger: 0.05,
        ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 bg-paper">
      <div className="mx-auto max-w-[800px] px-6">
        <div className="max-w-[768px] mx-auto text-center mb-14">
          <p className="text-sm text-fog uppercase tracking-[0.2em] mb-4">Comparison</p>
          <h2
            className="editorial-display text-ink"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15 }}
          >
            Why template generators fall short
          </h2>
        </div>

        <div className="rounded-md border border-bone bg-paper overflow-hidden">
          <div className="flex items-center px-4 sm:px-6 py-4 border-b border-bone">
            <span className="flex-1 text-sm text-fog">Feature</span>
            <div className="flex items-center gap-3 sm:gap-6 w-[120px] sm:w-[200px] justify-end">
              <span className="text-sm font-medium w-12 sm:w-16 text-center text-ink">Caveman</span>
              <span className="text-sm w-12 sm:w-16 text-center text-fog/60">Others</span>
            </div>
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              className="compare-row flex items-center border-b border-bone last:border-none px-4 sm:px-6 py-4 hover:bg-cream/60 transition-colors"
            >
              <span className="flex-1 min-w-0 pr-3 text-sm text-ink">{r.trait}</span>
              <div className="flex items-center gap-3 sm:gap-6 w-[120px] sm:w-[200px] justify-end shrink-0">
                <span className="w-12 sm:w-16 flex justify-center">
                  {r.us ? (
                    <span className="w-5 h-5 rounded-full bg-ink flex items-center justify-center">
                      <Check size={12} weight="bold" className="text-cream" />
                    </span>
                  ) : (
                    <Minus size={14} className="text-bone" />
                  )}
                </span>
                <span className="w-12 sm:w-16 flex justify-center">
                  {r.them ? (
                    <span className="w-5 h-5 rounded-full bg-cream border border-bone flex items-center justify-center">
                      <Check size={12} weight="bold" className="text-iron" />
                    </span>
                  ) : (
                    <Minus size={14} className="text-bone" />
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <Link to="/generate" className="btn-primary">
            See the difference
          </Link>
        </div>
      </div>
    </section>
  );
}
