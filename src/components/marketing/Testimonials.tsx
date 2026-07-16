import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const quotes = [
  { q: "Documentation used to be the last thing I did. Now it is the first. Caveman turned a chore into 90 seconds.", name: "Ana Merino", role: "Founder, plot.dev" },
  { q: "Our OSS repo tripled its stars the month we replaced our README with Caveman output. Same code, different first impression.", name: "Devon Park", role: "Maintainer, hyperfetch" },
  { q: "It writes like a senior engineer with a copy editor over their shoulder. Nothing else comes close.", name: "Priya Anand", role: "Staff Engineer, Loom" },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardsRef.current?.querySelectorAll(".testimonial-card");
      if (!cards?.length) return;
      gsap.set(cards, { opacity: 0, y: 16 });
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.to(cards, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power3.out" });
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-cream-paper py-16 border-t border-ink">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-xl">
          <span className="step-badge">
            <span className="step-badge-num">4</span>
            <span className="step-badge-label">Happy Developers</span>
          </span>
          <h2 className="mt-6 text-[28px] font-medium text-ink leading-[1.25]">
            Developers who stopped procrastinating.
          </h2>
        </div>
        <div ref={cardsRef} className="mt-10 grid gap-6 md:grid-cols-3">
          {quotes.map((t, i) => (
            <figure key={t.name} className="testimonial-card rounded-3xl border border-ink bg-cream-paper p-8 flex flex-col">
              <blockquote className="text-lg text-graphite flex-1 leading-relaxed">
                &ldquo;{t.q}&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-4 border-t border-ink">
                <div className="text-base font-medium text-ink">{t.name}</div>
                <div className="text-sm text-graphite mt-0.5">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
