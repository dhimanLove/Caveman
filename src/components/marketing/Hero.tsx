import { useRef, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, CaretRight } from "@phosphor-icons/react";

gsap.registerPlugin(ScrollTrigger);

const FLOAT_CARDS = [
  {
    className: "float-card-1",
    pos: "left-[3%] top-[24%]",
    rot: -4,
    depth: 26,
    size: "w-[240px]",
    content: "readme",
  },
  {
    className: "float-card-2",
    pos: "right-[4%] top-[26%]",
    rot: 3,
    depth: 40,
    size: "w-[210px]",
    content: "code",
  },
  {
    className: "float-card-3",
    pos: "left-[9%] bottom-[18%]",
    rot: 2,
    depth: 32,
    size: "w-[220px]",
    content: "badges",
  },
  {
    className: "float-card-4",
    pos: "right-[11%] bottom-[16%]",
    rot: -3,
    depth: 20,
    size: "w-[190px]",
    content: "health",
  },
] as const;

type InputMode = "idle" | "repo" | "describe" | "error";

function detectMode(raw: string): InputMode {
  const v = raw.trim();
  if (!v) return "idle";
  if (/^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+/.test(v)) return "repo";
  if (/^(https?:\/\/)/i.test(v)) {
    // Non-GitHub URL → unsupported source
    if (/github\.com/i.test(v)) return "repo";
    return "error";
  }
  return "describe";
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const bobsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const parallax = useRef<Map<string, { x: gsap.QuickToFunc; y: gsap.QuickToFunc }>>(new Map());
  const [repoUrl, setRepoUrl] = useState("");
  const [inputError, setInputError] = useState("");
  const navigate = useNavigate();
  const mode: InputMode = detectMode(repoUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = repoUrl.trim();
    if (!url) return;
    const m = detectMode(url);
    if (m === "error") {
      setInputError("Please enter a valid GitHub URL or a project description.");
      return;
    }
    setInputError("");
    navigate({ to: "/generate", search: url ? { url } : { url: undefined } });
  };

  useEffect(() => {
    // Declared at effect scope so the cleanup below can remove the listener.
    let onMouse: ((e: MouseEvent) => void) | null = null;

    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      if (!section) return;

      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // --- Entrance timeline ---
      if (!isReduced) {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.fromTo(".hero-intro", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7 })
          .fromTo(
            ".hero-word",
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 0.9, stagger: 0.07 },
            "-=0.4",
          )
          .fromTo(".hero-sub", { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.5")
          .fromTo(
            ".hero-input",
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 0.7 },
            "-=0.45",
          )
          .fromTo(".hero-cta", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.4")
          .fromTo(
            ".hero-float-card",
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 1, stagger: 0.14, ease: "back.out(1.4)" },
            "-=0.7",
          );
      } else {
        gsap.set(
          [
            ".hero-intro",
            ".hero-word",
            ".hero-sub",
            ".hero-input",
            ".hero-cta",
            ".hero-float-card",
          ],
          { opacity: 1 },
        );
      }

      // --- Continuous float bob (own layer, no transform conflict) ---
      FLOAT_CARDS.forEach((card, i) => {
        const bob = bobsRef.current.get(card.className);
        if (!bob) return;
        gsap.to(bob, {
          y: i % 2 === 0 ? -12 : 10,
          duration: 3.4 + i * 0.4,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
          delay: 1 + i * 0.15,
        });
      });

      // --- Cursor-following parallax (quickTo = 60fps lerp, own layer) ---
      if (!isReduced && window.matchMedia("(pointer: fine)").matches) {
        FLOAT_CARDS.forEach((card) => {
          const el = cardsRef.current.get(card.className);
          if (!el) return;
          parallax.current.set(card.className, {
            x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3.out" }),
            y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3.out" }),
          });
        });

        onMouse = (e: MouseEvent) => {
          const { innerWidth, innerHeight } = window;
          const nx = (e.clientX / innerWidth - 0.5) * 2;
          const ny = (e.clientY / innerHeight - 0.5) * 2;
          FLOAT_CARDS.forEach((card) => {
            const q = parallax.current.get(card.className);
            if (!q) return;
            q.x(nx * card.depth);
            q.y(ny * card.depth * 0.6);
          });
        };
        window.addEventListener("mousemove", onMouse);
      }

      // --- Scroll-driven parallax (cards drift opposite scroll direction, yPercent layer) ---
      FLOAT_CARDS.forEach((card, i) => {
        const el = cardsRef.current.get(card.className);
        if (!el) return;
        gsap.to(el, {
          yPercent: (i % 2 === 0 ? 1 : -1) * 16,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      // --- Scroll indicator + content lift on scroll ---
      gsap.to(".hero-scroll", {
        opacity: 0,
        y: 10,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "30% top", scrub: true },
      });

      const headline = section.querySelector(".hero-headline");
      if (headline) {
        gsap.to(headline, {
          y: -30,
          opacity: 0.9,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top top", end: "40% top", scrub: true },
        });
      }
    }, sectionRef);

    return () => {
      if (onMouse) window.removeEventListener("mousemove", onMouse);
      // ctx.revert() kills every tween/quickTo created inside the context.
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-cream"
    >
      <div className="absolute inset-0 dot-grid opacity-[0.04] pointer-events-none" />

      <div className="relative mx-auto max-w-[1200px] px-6 py-24 w-full">
        <div className="max-w-4xl mx-auto text-center">
          <p className="hero-intro text-sm text-fog uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-8 sm:mb-10 flex items-center justify-center gap-2">
            <span className="relative flex w-2 h-2">
              <span className="pulse-dot" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-electric-iris" />
            </span>
            An AI that reads your code
          </p>

          <h1
            className="hero-headline editorial-display text-ink"
            style={{
              fontSize: "clamp(38px, 8.5vw, 108px)",
              lineHeight: 1.06,
              letterSpacing: "-0.015em",
            }}
          >
            <span className="hero-word block font-italic">Creating docs,</span>
            <span className="hero-word block">
              <span className="font-normal "> like</span>
            </span>
            <span className="hero-word block">
              your <span className="gradient-text font-normal">code.</span>
            </span>
          </h1>

          <p className="hero-sub mt-8 text-lg text-fog max-w-[560px] mx-auto leading-relaxed">
            Drop a GitHub URL or describe your project. Caveman scans your file tree, maps
            dependencies, and writes a README that matches what you actually built.
          </p>

          <form className="hero-input mt-10 mx-auto w-full max-w-[620px]" onSubmit={handleSubmit}>
            <div
              className={`flex items-center gap-0 rounded-[4px] border bg-paper p-1 pl-4 transition-colors ${inputError ? "border-err" : "border-bone focus-within:border-ink"}`}
            >
              <input
                type="text"
                inputMode="url"
                placeholder="Paste your GitHub repo link"
                aria-label="GitHub repository URL"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  if (inputError) setInputError("");
                }}
                className="h-11 flex-1 min-w-0 bg-transparent text-sm sm:text-base text-ink placeholder:text-fog/70 outline-none"
              />
              <button type="submit" className="btn-primary shrink-0 cursor-pointer !px-3 sm:!px-4">
                <span className="hidden sm:inline">Generate </span>
                <span className="sm:hidden">Go</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>

            {/* Inline mode label + validation */}
            {inputError ? (
              <p className="mt-2 text-left text-xs text-err font-medium">
                Please enter a valid GitHub URL or a project description.
              </p>
            ) : mode === "repo" ? (
              <p className="mt-2 text-left text-xs text-fog flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-electric-iris" />
                Repo mode - we'll scan your file tree and write every section from real source.
              </p>
            ) : mode === "describe" ? (
              <p className="mt-2 text-left text-xs text-fog flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-bone" />
                Description mode - tell us what you built and we'll draft a README.
              </p>
            ) : null}
          </form>

          <div className="hero-cta mt-6 flex items-center justify-center gap-6 flex-wrap">
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("how")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="link-ghost flex items-center gap-1 text-sm cursor-pointer"
            >
              How it works <CaretRight size={13} weight="fill" />
            </button>
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("examples")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="link-ghost flex items-center gap-1 text-sm cursor-pointer"
            >
              See examples <CaretRight size={13} weight="fill" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating preview cards - monochrome product output as decoration */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {FLOAT_CARDS.map((card) => (
          <div
            key={card.className}
            ref={(el) => {
              if (el) cardsRef.current.set(card.className, el);
            }}
            className={`hero-float-card ${card.className} absolute ${card.pos} ${card.size} rounded-md bg-paper border border-bone`}
            style={{ rotate: `${card.rot}deg`, willChange: "transform" }}
          >
            <div
              ref={(el) => {
                if (el) bobsRef.current.set(card.className, el);
              }}
              className="will-change-transform"
            >
              <CardBody type={card.content} />
            </div>
          </div>
        ))}
      </div>

      <div className="hero-scroll absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        <span className="text-[10px] text-fog uppercase tracking-[0.25em] font-normal">scroll</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-fog">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}

function CardBody({ type }: { type: "readme" | "code" | "badges" | "health" }) {
  if (type === "readme") {
    return (
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-bone" />
          <span className="w-2 h-2 rounded-full bg-bone" />
          <span className="w-2 h-2 rounded-full bg-bone" />
          <span className="ml-1.5 text-[10px] text-fog font-mono truncate">README.md</span>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-3/4 bg-ink/80" />
          <div className="h-2 w-1/2 bg-bone" />
          <div className="h-2 w-2/3 bg-bone" />
          <div className="h-2 w-5/6 bg-bone" />
          <div className="h-2 w-3/5 bg-bone/70" />
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="rounded-full bg-cream border border-bone px-2.5 py-0.5 text-[10px] text-ink">
            Alex C. · Finch
          </span>
        </div>
      </div>
    );
  }
  if (type === "code") {
    return (
      <div className="p-4">
        <div className="text-[10px] text-fog mb-2 font-mono">npm install caveman</div>
        <div className="rounded-sm bg-ink p-3 space-y-2">
          <div className="h-1.5 w-full rounded-sm bg-cream/30" />
          <div className="h-1.5 w-4/5 rounded-sm bg-cream/25" />
          <div className="h-1.5 w-3/5 rounded-sm bg-cream/30" />
          <div className="h-1.5 w-2/3 rounded-sm bg-cream/20" />
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="rounded-full bg-cream border border-bone px-2.5 py-0.5 text-[10px] text-ink">
            Jordan T. · Rivet
          </span>
        </div>
      </div>
    );
  }
  if (type === "badges") {
    return (
      <div className="p-4">
        <div className="text-[10px] text-fog uppercase tracking-widest mb-2">Detected stack</div>
        <div className="flex flex-wrap gap-1.5">
          {["MIT", "TypeScript", "React", "Next.js", "Prisma", "tRPC"].map((b) => (
            <span
              key={b}
              className="rounded-full border border-bone bg-cream px-2.5 py-0.5 text-[10px] text-ink"
            >
              {b}
            </span>
          ))}
        </div>
        <div className="mt-3 h-px bg-bone" />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-fog">47s avg</span>
          <span className="text-[10px] text-ink">deep scan</span>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-fog uppercase tracking-widest">Health</span>
        <span className="text-sm text-ink">98</span>
      </div>
      <div className="h-1.5 bg-bone rounded-full overflow-hidden">
        <div className="h-full w-[98%] bg-ink rounded-full" />
      </div>
      <div className="mt-3 flex items-center gap-1">
        <ArrowRight size={10} className="text-ink" />
        <span className="text-[10px] text-ink">ready to ship</span>
      </div>
    </div>
  );
}
