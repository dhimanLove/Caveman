import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const platforms = ["Vercel", "Netlify", "GitHub", "NPM", "Next.js", "Supabase", "Railway", "Fly.io"];

export function LogoStrip() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".logo-strip-track", {
        opacity: 0,
        y: 12,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="py-16 bg-cream border-t border-bone/70 overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="text-center text-xs text-fog uppercase tracking-[0.2em] mb-10">
          Trusted by teams building on the world's top platforms
        </p>
      </div>
      <div className="logo-strip-track marquee-fade group" aria-hidden="true">
        <div className="logo-strip-track flex w-max animate-marquee gap-x-14 pr-14 motion-reduce:[animation-play-state:paused] group-hover:[animation-play-state:paused]">
          {[...platforms, ...platforms].map((name, i) => (
            <span key={`${name}-${i}`} className="flex items-center gap-x-14">
              <span className="whitespace-nowrap text-lg font-medium uppercase tracking-[0.22em] text-fog/55 transition-colors duration-300 hover:text-ink">
                {name}
              </span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-bone" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
