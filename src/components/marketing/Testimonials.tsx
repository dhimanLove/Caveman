import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    quote:
      "I spent more time writing READMEs than code. Caveman dropped that to zero. It actually reads my components and writes docs that match what I built.",
    name: "Alex Chen",
    role: "Founder, Finch",
    initials: "AC",
    color: "#6248ff",
  },
  {
    quote:
      "The deep scan is what sold me. It found my tRPC router, my Prisma schema, and my Tailwind config - the README it wrote was better than what I would have written.",
    name: "Jordan Taylor",
    role: "Engineer, Rivet",
    initials: "JT",
    color: "#0f0f0f",
  },
  {
    quote:
      "We were using a template generator before. This is different - it understands the architecture, not just the name of the project. Night and day.",
    name: "Samir Patel",
    role: "Lead Dev, Mantle",
    initials: "SP",
    color: "#6248ff",
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % testimonials.length);
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!trackRef.current) return;
    gsap.to(trackRef.current, {
      x: `-${activeIndex * 100}%`,
      duration: 0.6,
      ease: "power3.inOut",
    });
  }, [activeIndex]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current) return;
      gsap.from(sectionRef.current.querySelectorAll(".testimonial-section"), {
        opacity: 0,
        y: 30,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const pause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const resume = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % testimonials.length);
    }, 4000);
  };

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 bg-cream"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      <div className="mx-auto max-w-[900px] px-6">
        <div className="max-w-[768px] mx-auto text-center mb-14">
          <p className="testimonial-section text-sm text-fog uppercase tracking-[0.2em] mb-4">
            Testimonials
          </p>
          <h2
            className="testimonial-section editorial-display text-ink"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15 }}
          >
            Our clients say it best
          </h2>
        </div>

        <div className="overflow-hidden rounded-md border border-bone bg-paper testimonial-section">
          <div ref={trackRef} className="flex">
            {testimonials.map((t, i) => (
              <div key={i} className="w-full shrink-0 p-8 md:p-12">
                <p className="text-xl md:text-2xl text-ink leading-relaxed font-light tracking-[-0.01em]">
                  "{t.quote}"
                </p>
                <div className="mt-8 pt-6 border-t border-bone flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold tracking-wide shrink-0 border border-black/5"
                    style={{ backgroundColor: t.color }}
                    aria-hidden="true"
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm text-ink">{t.name}</p>
                    <p className="text-sm text-fog">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? "w-6 bg-ink" : "w-1.5 bg-bone hover:bg-iron/40"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
