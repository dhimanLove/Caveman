import { useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconArrowRight as ArrowRight } from "@/components/icons";

gsap.registerPlugin(ScrollTrigger);

export function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current) return;
      gsap.from(sectionRef.current.querySelectorAll(".cta-item"), {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-36 bg-cream relative overflow-hidden">
      <div className="relative mx-auto max-w-[900px] px-6 text-center">
        <h2
          className="cta-item editorial-display text-ink"
          style={{ fontSize: "clamp(56px, 9vw, 104px)", lineHeight: 1, letterSpacing: "-0.01em" }}
        >
          Let's talk.
        </h2>
        <p className="cta-item mt-6 text-lg text-fog max-w-[480px] mx-auto leading-relaxed">
          One click. Your repo scanned. A README that describes what you actually built - not what a
          template thinks you built.
        </p>

        <div className="cta-item mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link to="/generate" search={{ url: undefined }} className="btn-primary h-12 px-8 text-base group">
            Generate Your README
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <a href="/#how" className="btn-outline h-12 px-8 text-base">
            See How It Works
          </a>
        </div>

        <div className="cta-item mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-fog">
          <span>No credit card</span>
          <span className="w-px h-3 bg-bone" />
          <span>Free during early access</span>
          <span className="w-px h-3 bg-bone" />
          <span>Google sign-in only</span>
        </div>
      </div>
    </section>
  );
}
