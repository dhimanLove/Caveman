import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function AnimatedCounter({
  target,
  suffix = "",
  isReduced,
}: {
  target: number;
  suffix?: string;
  isReduced: boolean;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (isReduced) {
      setCount(target);
      return;
    }
    const el = ref.current;
    if (!el) return;

    // Safety net: if IntersectionObserver never fires (e.g. hidden container),
    // snap to the final value so the section never ships showing "0+".
    const fallback = setTimeout(() => {
      if (!counted.current) {
        counted.current = true;
        setCount(target);
      }
    }, 2500);

    if (!("IntersectionObserver" in window)) {
      counted.current = true;
      setCount(target);
      return () => clearTimeout(fallback);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          clearTimeout(fallback);
          const duration = 1800;
          const start = performance.now();
          const step = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setCount(Math.floor(eased * target));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [target, isReduced]);

  return (
    <span
      ref={ref}
      className="editorial-display text-ink tabular-nums"
      style={{ fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 1 }}
    >
      {count.toLocaleString()}
      {suffix}
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
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    setIsReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

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
              <AnimatedCounter target={s.target} suffix={s.suffix} isReduced={isReduced} />
              <p className="mt-3 text-xs text-fog uppercase tracking-[0.14em]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
