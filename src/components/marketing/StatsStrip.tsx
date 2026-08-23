import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = `${target.toLocaleString()}${suffix}`;
      return;
    }

    // Count up only when the number scrolls into view - driven by the same
    // ScrollTrigger that reveals the column, so it can never fire early.
    const proxy = { v: 0 };
    const ctx = gsap.context(() => {
      gsap.to(proxy, {
        v: target,
        duration: 1.6,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = `${Math.floor(proxy.v).toLocaleString()}${suffix}`;
        },
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    }, el);
    return () => ctx.revert();
  }, [target, suffix]);

  return (
    <span
      ref={ref}
      className="editorial-display text-ink tabular-nums"
      style={{ fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 1 }}
    >
      0{suffix}
    </span>
  );
}

const stats = [
  { target: 12000, suffix: "+", label: "READMEs generated" },
  { target: 50, suffix: "+", label: "tech stacks detected" },
  { target: 150000, suffix: "+", label: "source files scanned" },
  { target: 47, suffix: "s", label: "avg generation time" },
];

export function StatsStrip() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".stats-col", {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="py-20 bg-cream relative overflow-hidden">
      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 lg:gap-y-0">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`stats-col text-center px-4 py-2 ${i > 0 ? "lg:border-l lg:border-bone" : ""}`}
            >
              <AnimatedCounter target={s.target} suffix={s.suffix} />
              <p className="mt-3 text-xs text-fog uppercase tracking-[0.14em]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
