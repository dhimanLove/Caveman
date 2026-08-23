import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const codeLines = [
  { w: "w-24", delay: 0 },
  { w: "w-full", delay: 0.08 },
  { w: "w-4/5", delay: 0.16 },
  { w: "w-3/4", delay: 0.24 },
  { w: "w-5/6", delay: 0.32 },
  { w: "w-2/3", delay: 0.4 },
  { w: "w-full", delay: 0.48 },
  { w: "w-4/5", delay: 0.56 },
];

const badgeLabels = ["MIT", "TypeScript", "React", "Next.js", "Prisma"];

const sectionLabels = ["Installation", "Usage", "API Reference", "Architecture", "Contributing"];

export function Preview() {
  const sectionRef = useRef<HTMLElement>(null);

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

  return (
    <section ref={sectionRef} className="py-24 md:py-32 bg-cream relative overflow-hidden">
      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="max-w-[768px] mx-auto text-center mb-14">
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
          <div className="flex items-center gap-1.5 border-b border-bone px-5 py-3.5">
            <span className="w-2.5 h-2.5 rounded-full bg-bone" />
            <span className="w-2.5 h-2.5 rounded-full bg-bone" />
            <span className="w-2.5 h-2.5 rounded-full bg-bone" />
            <span className="ml-2 text-xs text-fog font-mono">README.md - Caveman</span>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/4 space-y-1.5">
                <div className="text-[10px] text-fog uppercase tracking-widest mb-2">Sections</div>
                {sectionLabels.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] bg-cream text-xs text-ink/80"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                    {s}
                  </div>
                ))}
              </div>

              <div className="md:w-3/4 space-y-4">
                <div className="pb-3 border-b border-bone">
                  <div className="h-7 w-48 rounded-[4px] bg-ink/10 animate-pulse" />
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

                <div className="space-y-2">
                  <div className="h-3 w-16 rounded-full bg-bone" />
                  {codeLines.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[9px] text-fog/40 font-mono w-6 text-right">
                        {i + 1}
                      </span>
                      <div className={`h-3 ${l.w} rounded-full bg-bone/70`} />
                    </div>
                  ))}
                </div>

                <div className="my-4 rounded-md bg-ink p-4">
                  <div className="flex gap-1 mb-2">
                    <span className="w-2 h-2 rounded-full bg-cream/30" />
                    <span className="w-2 h-2 rounded-full bg-cream/30" />
                    <span className="w-2 h-2 rounded-full bg-cream/30" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-3/4 rounded-full bg-cream/10" />
                    <div className="h-3 w-1/2 rounded-full bg-cream/10" />
                    <div className="h-3 w-4/5 rounded-full bg-cream/10" />
                    <div className="h-3 w-2/3 rounded-full bg-cream/5" />
                  </div>
                </div>

                <div className="rounded-md border border-bone overflow-hidden">
                  <div className="grid grid-cols-3 bg-cream border-b border-bone">
                    {["Method", "Endpoint", "Description"].map((h, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 text-[10px] text-fog uppercase tracking-wider"
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  {[1, 2, 3].map((row) => (
                    <div
                      key={row}
                      className="grid grid-cols-3 border-b border-bone last:border-none"
                    >
                      <div className="px-3 py-2 text-[10px] text-ink/70 font-mono">GET</div>
                      <div className="px-3 py-2 text-[10px] text-ink/70 font-mono">
                        /api/{["users", "posts", "auth"][row - 1]}
                      </div>
                      <div className="px-3 py-2 text-[10px] text-fog">
                        {["Returns all users", "Fetch posts", "Authenticate"][row - 1]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
