import { useRef, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconArrowRight as ArrowRight, IconArrowRight as CaretRight } from "@/components/icons";

gsap.registerPlugin(ScrollTrigger);

const FLOAT_SVGS = [
  {
    key: "board",
    pos: "left-[12%] top-[20%]",
    rot: -4,
    depth: 28,
    speed: 1.6,
    size: "w-[80px] lg:w-[100px]",
  },
  {
    key: "readme",
    pos: "right-[12%] top-[22%]",
    rot: 3,
    depth: 20,
    speed: 1,
    size: "w-[70px] lg:w-[90px]",
  },
  {
    key: "yeti",
    pos: "left-[14%] bottom-[18%]",
    rot: 4,
    depth: 34,
    speed: 2.2,
    size: "w-[60px] lg:w-[75px]",
  },
  {
    key: "book",
    pos: "right-[14%] bottom-[20%]",
    rot: -3,
    depth: 16,
    speed: 0.7,
    size: "w-[75px] lg:w-[95px]",
  },
] as const;

type InputMode = "idle" | "repo" | "describe" | "error";

function detectMode(raw: string): InputMode {
  const v = raw.trim();
  if (!v) return "idle";
  if (/^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+/.test(v)) return "repo";
  if (/^(https?:\/\/)/i.test(v)) {
    if (/github\.com/i.test(v)) return "repo";
    return "error";
  }
  return "describe";
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const outerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const innerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
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
    let onMouse: ((e: MouseEvent) => void) | null = null;
    const cleanups: (() => void)[] = [];

    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      if (!section) return;

      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // --- Entrance ---
      if (!isReduced) {
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

        tl.fromTo(
          ".hero-intro",
          { opacity: 0, y: 20, filter: "blur(6px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8 },
        )
          .fromTo(
            ".hero-word",
            { opacity: 0, y: 70, filter: "blur(8px)" },
            { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, stagger: 0.1 },
            "-=0.5",
          )
          .fromTo(
            ".hero-sub",
            { opacity: 0, y: 20, filter: "blur(4px)" },
            { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8 },
            "-=0.55",
          )
          .fromTo(
            ".hero-input",
            { opacity: 0, y: 24, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.8 },
            "-=0.5",
          )
          .fromTo(
            ".hero-cta",
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.6 },
            "-=0.45",
          )
          .fromTo(
            ".hero-float-svg",
            { opacity: 0, scale: 0.5, y: 100, rotate: -8 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              rotate: 0,
              duration: 1.4,
              stagger: 0.15,
              ease: "elastic.out(1, 0.65)",
            },
            "-=0.8",
          );
      } else {
        gsap.set(
          [".hero-intro", ".hero-word", ".hero-sub", ".hero-input", ".hero-cta", ".hero-float-svg"],
          { opacity: 1, filter: "blur(0px)" },
        );
      }

      // --- OUTER layer: scroll parallax + rotation + bob ---
      FLOAT_SVGS.forEach((svg, i) => {
        const outer = outerRefs.current.get(svg.key);
        if (!outer) return;

        gsap.to(outer, {
          y: (i % 2 === 0 ? -1 : 1) * 100 * svg.speed,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });

        gsap.to(outer, {
          rotate: svg.rot + (i % 2 === 0 ? 2 : -2),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom top",
            scrub: 1.2,
          },
        });

        gsap.to(outer, {
          y: `+=${i % 2 === 0 ? -10 : 10}`,
          duration: 3.5 + i * 0.5,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
          delay: 1 + i * 0.3,
        });
      });

      // --- INNER layer: cursor parallax + hover ---
      if (!isReduced && window.matchMedia("(pointer: fine)").matches) {
        FLOAT_SVGS.forEach((svg) => {
          const inner = innerRefs.current.get(svg.key);
          if (!inner) return;
          parallax.current.set(svg.key, {
            x: gsap.quickTo(inner, "x", { duration: 0.8, ease: "power2.out" }),
            y: gsap.quickTo(inner, "y", { duration: 0.8, ease: "power2.out" }),
          });
        });

        onMouse = (e: MouseEvent) => {
          const { innerWidth, innerHeight } = window;
          const nx = (e.clientX / innerWidth - 0.5) * 2;
          const ny = (e.clientY / innerHeight - 0.5) * 2;
          FLOAT_SVGS.forEach((svg) => {
            const q = parallax.current.get(svg.key);
            if (!q) return;
            q.x(nx * svg.depth * 1.5);
            q.y(ny * svg.depth * 1.2);
          });
        };
        window.addEventListener("mousemove", onMouse);

        FLOAT_SVGS.forEach((svg) => {
          const inner = innerRefs.current.get(svg.key);
          if (!inner) return;

          const enter = () => {
            gsap.to(inner, { scale: 1.12, duration: 0.4, ease: "power2.out" });
          };
          const leave = () => {
            gsap.to(inner, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.5)" });
          };
          inner.addEventListener("mouseenter", enter);
          inner.addEventListener("mouseleave", leave);
          cleanups.push(() => {
            inner.removeEventListener("mouseenter", enter);
            inner.removeEventListener("mouseleave", leave);
          });
        });
      }

      // --- Scroll indicator ---
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
      cleanups.forEach((fn) => fn());
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
                <ArrowRight size={15} />
              </button>
            </div>

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
              How it works <CaretRight size={13} />
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
              See examples <CaretRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating hand-drawn SVGs — two-layer: outer = scroll+bob, inner = cursor+hover */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {FLOAT_SVGS.map((svg) => (
          <div
            key={svg.key}
            ref={(el) => {
              if (el) outerRefs.current.set(svg.key, el);
            }}
            className={`hero-float-svg absolute pointer-events-auto ${svg.pos} ${svg.size}`}
            style={{ rotate: `${svg.rot}deg`, willChange: "transform" }}
          >
            <div
              ref={(el) => {
                if (el) innerRefs.current.set(svg.key, el);
              }}
              className="cursor-pointer"
              style={{ willChange: "transform" }}
            >
              <FloatSvg type={svg.key} />
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

function FloatSvg({ type }: { type: string }) {
  const cls = "w-full h-auto text-ink";

  if (type === "board")
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="presenting board" viewBox="0 0 262 222" className={cls}>
        <path d="M73.5 12.4c-1.4 1-2.5 1.1-4.2.3-3.1-1.4-9.6.6-12.1 3.8a6 6 0 0 1-4.9 2.5c-3.4 0-7.8 4.1-8.8 8.2a8 8 0 0 1-3 4.2c-3.4 2.2-5 7.7-3.5 12.1.6 1.9.8 3.9.5 4.5-1.3 2.1-.7 7.8 1.1 10.4q1.6 2.7 1.8 9.1c.1 5.6.4 6.7 3 9.4 1.6 1.7 4.3 3.3 6 3.7 2.4.4 3.8 1.8 6.4 6.2 2.8 4.8 3.2 6.3 2.7 9.8-.6 4-.6 4-6.3 5.2a50 50 0 0 0-21.5 11c-4.2 4-9 12.7-11.3 20.1-5 16.3-7.8 44.9-5.4 53.7 1.6 5.8 6.5 10.9 11.6 12.1l3.9.9v5.8q0 5.9 1.3 6.3 1.2.7 1.2-4.4c0-2.6.4-5.3.8-5.8s5.6-1.9 11.6-2.9c12.4-2 23.3-5.1 25.7-7.2 1-.9 4.6-1.6 9.5-1.9 12.8-.6 22.2-4.5 25.8-10.6 2.1-3.5 2-5.8-.4-8.9-1.8-2.3-2.3-2.5-10.9-2.2-9 .3-10.6-.3-7.5-2.8 2.3-2 1.5-7.4-1.3-7.8-2.3-.3-9 3.1-15.3 7.7a15 15 0 0 1-6 2.7c-1.4 0-6.3.4-10.9.9l-8.4.8.6-3 1.8-13.6c1.2-9.8.9-13.1-.7-11.4-.6.6-4.3 23.3-4.4 26.9q0 1.8-2.4 1.8c-3.5 0-8.1 1.9-7 2.9.8.7 13.5-.4 26.4-2.3l3.5-.5v6.8c0 5.6.4 7.5 2.2 10 1.3 1.6 1.9 3.2 1.4 3.5-2.3 1.4-21.5 5.7-28.3 6.2-9.9.9-15.7-1.1-18.9-6.2-3-4.9-3.5-16.6-1.5-31.9 3.1-23.3 8-37 15.7-44 6-5.4 21.9-12.4 21.9-9.7 0 2 5.3 7.3 9.2 9.3a25 25 0 0 0 17.1 2c4.1-1.4 8.7-6.3 8.7-9.2q.1-1.7 1-1.9a66 66 0 0 1 17.3 6.7c5.2 3.2 27.8 25.3 27.2 26.4q-.4.7.4 1.4c.7.4 17.6-18.4 21.3-23.9.3-.5 1.9.5 3.4 2.3s4.8 4.5 7.5 6l4.8 2.7-7.7 12.8q-13.4 22-22.2 24.7c-5.3 1.6-12.7-.9-23.8-8-7.9-5.1-8.2-5.4-8.2-9.1 0-6-1.1-10-2.7-10q-1.6 0-1 2.2c.5 2.1 2.5 43.6 3 62.7.1 6.2.6 8.6 1.6 8.9 1.2.4 1.3-3.7.7-27.7l-.7-28.3 4.6 3.2c2.5 1.7 7.6 4.5 11.2 6.3 8.6 4 14.1 4.1 20.7.4 4.7-2.6 5.2-2.7 22.2-2.7H188v19.1c0 14.8.3 19 1.3 18.7s1.3-5.3 1.5-19.1l.2-18.7h6v19c0 16.2.2 19 1.5 19s1.5-2.8 1.5-19v-19l24.8-.2 24.7-.3.3-3q.3-2.8-1.2-4c-1.4-1.1-1.6-8.2-1.6-63.9-.1-34.5-.3-63.3-.7-64.1-.4-1.3-8.4-1.5-57.9-1.5-50.4 0-57.4.2-57.4 1.5q.1 1.4 1.5 1.5c1.3 0 1.5 6.4 1.5 51.7v51.6l-10.9-10.7c-11.9-11.5-18-15.3-29-17.6q-9.8-2-3.4-3.5c6.6-1.6 13.3-9.4 16-18.4 1.4-5 2.3-19.5 2.3-38.1l.1-10.2c0-4.9-.4-6.2-2.5-8.3-1.4-1.4-3.2-2.5-4.1-2.5q-1.3-.1-1.5-1.8c0-4.2-6.4-8.1-11.3-6.8-1.4.3-3.2-.1-4.3-.9-2.4-1.8-9.5-1.9-11.9-.1m170.3 78.3-.3 62.8-41.7.3c-23 .1-41.8 0-41.8-.3 0-.4 1.7-3.2 3.9-6.3 6-8.9 12.2-20.8 11.6-22.3q-.5-1.5 7.1-5.3c9.3-4.8 17.8-12.7 18.7-17.5 2.3-11.2-4.2-15.3-15.1-9.7l-5.6 2.6c-2.3.9-2.4.7-1.9-2.3.7-4.4-1.5-6.4-5.1-4.5-4.8 2.6-13.6 16.1-13.6 21.1 0 1.1-.9 2.1-1.9 2.4s-6.1 5.6-11.2 11.9-9.4 11.4-9.6 11.4-.3-24.1-.3-53.5V28h107zM82.1 35c1.7 0 4-.5 5.1-1.1 1.6-.8 2.9-.7 5.9.6 2.1 1 4.5 1.5 5.3 1.2 2.1-.8 4.2 3.3 5.5 10.8 4 23.5.9 39.8-9.3 47.9-3.6 2.9-4.2 3.1-12.2 3-4.6 0-8.4.3-8.4.8 0 1.2 4.6 2.8 8.1 2.8 2.6 0 2.9.4 2.9 3q-.1 3.3 1.6 2.3c2.8-1.1-.3 3.5-3.9 5.8-6.1 3.8-18.4.9-23.1-5.5q-2.4-2.8-.8-3.5c.7-.4 1.8-3.2 2.6-6.1 1.4-5.3 1.4-5.5-1.1-8.5a33 33 0 0 1-4.4-7.1c-1.5-3.6-2.1-4.1-4.3-3.7-4.1.8-8.6-4.4-8.6-9.9 0-2.4.5-4.9 1.2-5.6 1.7-1.7 6.3-1.5 7.8.3q1.2 1.4 2.6 1.5C56 64 58 58.3 58 54c.1-1.4.7-3.6 1.5-5s1.4-4.2 1.5-6.3c0-3.3.3-3.7 2.5-3.7 3.5 0 9.4-2.6 10.1-4.4.4-1.1 1.1-1.3 3.1-.5 1.3.5 3.8.9 5.4.9M176 91.5c0 .8-.8 3-1.7 5-.9 1.9-1.4 3.7-1.1 4s4.8-1.5 10.1-4c10-4.7 10.7-5 10.7-3.8 0 .5-2.5 2.1-5.5 3.8-5.1 2.7-6.9 4.5-4.5 4.5.6 0 4-1.8 7.7-4q9.1-5.7 6.9-2.1c-.4.5-3.1 2.4-6.1 4.1s-5.7 3.6-6.1 4.1q-2 3.5 6-1.5c6-3.8 6.6-4.1 6.6-2.7 0 .4-2.5 2.5-5.5 4.5s-5.5 4.1-5.5 4.7c0 1.1.9.7 5.2-2.3 6-3.8 5.9-1.6-.5 3.3-3 2.8-8.8 6.6-12.7 8.5-4 1.9-7.5 3.9-7.8 4.5-.6.9-8.1-3.7-10.2-6.3-.9-1-.7-2.7.7-7 2.3-7.1 3.5-9.3 7.8-14.6q5.3-6.5 5.2-2.7m71 66.5c0 2-.7 2-46 2-45.8 0-46 0-44.8-2s2.4-2 46-2c44.1 0 44.8 0 44.8 2m-161 3.1c0 .6-1.3 2.4-3 4.1s-3 3.4-3 3.9 4.9.9 11 .9c6.8 0 11 .4 11 1 0 1.5-4.2 2.9-10.6 3.6q-5.3.7-5.4 2t3.3.8a135 135 0 0 0 14-2.9q1.5-.6 1.7.3c0 1.2-7.4 4-13 5-2.4.4-4.5 1.3-4.8 2-.5 1.6 1.1 1.5 7.8-.2q9.5-2.4 3.3.7a55 55 0 0 1-23.2 4.6c-7.3-.1-8-.3-9-2.6-.6-1.3-1.1-4.7-1.1-7.6v-5.2l6.3-4.1c10.5-6.9 11.1-7.3 13-7.3q1.5 0 1.7 1" />
        <path d="M93.7 46.6c-1 1.1.2 2.4 1.8 1.8.7-.3 2.2-.1 3.3.5 2.3 1.2 3.6.3 2.1-1.6-1.2-1.3-6.1-1.8-7.2-.7m-23.5 2c-1.2.8-2 2-1.6 2.5q.6 1 1.8 0c.7-.6 2.3-1.2 3.6-1.4s2.6-.9 2.8-1.5c.5-1.7-4-1.5-6.6.4m26 8.6c-2 2-1.5 5.8.7 5.8 2.4 0 3.4-2.5 2.1-5.1-1.3-2.2-1.3-2.2-2.8-.7m-22.8 2.2c-.9 2.3 0 5.1 1.7 5.4 1.9.4 3.2-2.3 2.4-4.9-.7-2.2-3.3-2.5-4.1-.5m15.4 2.2c-.3.3.4 2.8 1.6 5.6 1.2 3 1.7 5.3 1.1 5.5-4.4 1.5-4.5 4-.1 2.9 3.6-.9 4-3.8 1.5-9.5-2-4.9-2.9-5.8-4.1-4.5M78 82.8c0 2.2 7.8 4 11.4 2.6 2.7-1 1.8-2.3-1.6-2.1-1.8.1-4.8-.2-6.5-.7-1.9-.4-3.3-.4-3.3.2" />
      </svg>
    );

  if (type === "readme")
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="A readme file" viewBox="-18.0 -0.0 277.0 277.0" className={cls}>
        <g transform="translate(0.000000,277.000000) scale(0.100000,-0.100000)">
          <path d="M332 2579 c-52 -10 -97 -41 -117 -79 -35 -68 -37 -163 -30 -1169 8-1068 5 -1022 63 -1084 15 -15 51 -35 82 -45 50 -15 131 -17 895 -17 666 0 848 3 877 13 54 19 104 79 117 141 8 36 11 308 11 865 l0 813 -29 39 c-41 57-277 299 -414 425 l-119 109 -646 -1 c-356 -1 -666 -5 -690 -10z m1190 -66 l87 -5 3 -212 c3 -191 5 -214 23 -246 34 -58 84 -69 317 -70 l196 0 8 -77 c4-43 4 -410 1 -816 -7 -811 -5 -780 -69 -813 -28 -14 -100 -17 -607 -21 -716-6 -1100 5 -1157 33 -30 15 -41 28 -51 59 -8 30 -12 304 -12 1058 -1 1084 -3 1048 45 1088 17 14 42 15 1034 26 52 1 134 -1 182 -4z m328 -189 c83 -81 173-173 201 -205 l51 -59 -185 0 c-250 0 -231 -18 -235 224 -2 121 0 186 7 186 5 0 78 -66 161 -146z M453 1725 c-21 -15 -22 -22 -22 -188 0 -143 3 -175 16-189 19 -21 44 -23 61 -6 7 7 12 38 12 70 0 77 16 75 60 -7 38 -71 61 -86 91-59 26 23 24 39 -12 95 l-31 48 20 28 c40 57 44 129 9 174 -35 46 -158 66 -204 34z m134 -87 c29 -24 -1 -78 -44 -78 -21 0 -23 4 -23 51 0 51 0 51 27 44 16 -4 34 -11 40 -17z M748 1729 c-16 -9 -18 -29 -18 -194 l0 -183 28 -9 c15 -6 61 -7 102 -4 71 6 75 7 78 32 4 35 -14 47 -78 51 -54 3 -55 4 -58 36 -3 32 -3 32 40 32 51 0 68 13 68 51 0 31 -15 39 -71 39 -39 0 -40 1 -37 33 3 31 5 32 53 35 27 2 55 8 62 14 19 16 16 56 -6 68 -25 13 -141 13 -163 -1z M1057 1726 c-8 -8 -19 -36 -26 -63 -7 -26 -19 -75 -28 -107 -8 -32 -17 -71 -19 -85-3 -14 -9 -42 -14 -61 -14 -50 -13 -58 10 -70 28 -15 52 0 65 42 11 30 16 33 57 36 44 3 45 3 56 -36 13 -42 37 -56 66 -40 20 11 20 49 0 119 -9 29 -18 64 -20 77 -3 13 -11 43 -19 65 -8 23 -15 52 -15 63 0 12 -9 33 -21 48 -23 29 -68 35 -92 12z m67 -188 c6 -25 4 -28 -20 -28 -24 0 -26 3 -20 31 3 17 6 43 7 58 l1 26 12 -30 c7 -16 16 -42 20 -57z M1280 1730 c-15 -10 -16 -22 -12 -243 2-134 3 -138 26 -146 39 -15 107 6 147 46 94 90 71 275 -41 334 -37 20 -96 25-120 9z m111 -106 c20 -22 24 -36 24 -89 0 -53 -4 -67 -24 -89 -14 -14 -28 -26 -33 -26 -4 0 -8 52 -8 115 0 63 4 115 8 115 5 0 19 -12 33 -26z M1540 1730 c-12 -7 -16 -42 -18 -185 -4 -191 0 -208 47 -203 25 3 26 5 31 92 5 87 5 89 18 53 13 -36 42 -55 63 -42 6 4 19 26 29 49 l19 41 0 -82 c1 -60 5 -86 17 -97 18 -19 20 -19 46 -5 20 11 20 16 14 163-4 83 -10 165 -13 183 -5 33 -28 48 -56 38 -14 -6 -67 -110 -67 -134 0 -6 -4 -11 -10 -11 -5 0 -10 7 -10 15 0 26 -49 122 -66 129 -21 8 -26 7 -44 -4z M1857 1722 c-14 -16 -17 -44 -17 -181 0 -93 4 -171 10 -182 9 -16 22 -19 94 -19 93 0 113 11 102 55 -6 23 -11 25 -61 25 l-55 0 0 35 c0 32 2 35 30 35 17 0 39 9 50 20 38 38 20 66 -45 72 -37 3 -40 5 -40 33 0 28 3 30 45 35 57 7 70 15 70 45 0 33 -27 45 -103 45 -49 0 -68 -4 -80 -18z M1003 1063 l-473 -3 -16 -25 c-21 -32 -14 -67 16 -82 36 -18 1344 -18 1380 0 30 15 38 62 16 92 -17 23 -51 24 -923 18z M516 738 c-24 -34 -20 -65 11 -85 25 -17 75 -18 697 -21 l669 -3 24 22 c28 27 30 62 3 89 -20 20 -33 20 -704 20 l-685 0 -15 -22z" />
        </g>
      </svg>
    );

  if (type === "yeti")
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="yeti mascot riding scooter" viewBox="0 0 193 257" className={cls}>
        <path d="M82.4 13.3c-.3 1-2.1 1.2-6.4.9-6.3-.5-11.4 1.5-10.5 4.1.3.7-1.6 2.1-4.8 3.5-4.9 2.2-5.2 2.2-6.5.5a14 14 0 0 1-1.8-4.3c-1.1-5-1.2-5.2-3.5-4-2.5 1.4-5.9 8.4-5.9 12.5 0 1.6.8 4.3 1.8 6 1.9 3 1.9 3-.4 6.1a44 44 0 0 0-4.5 7.9c-1.9 4.3-2 5-.6 6s1.3 1.7.2 6c-1.2 5-1.9 15.1-1.7 25.3.2 5.6 1.5 9.2 3.5 9.2.7.1 2.1 2.1 3.3 4.5l2 4.4-2.4 6.3c-3.5 9.4-3.4 9.3-8.8 9.6-2.7.1-5.8.6-6.9 1.1s-3.9 1.4-6.1 2a16 16 0 0 0-11.4 9.6q-5.6 11.9 7.3 16.4c2 .7 4.5 1 5.5.7s3.1.3 4.7 1.4 4 2 5.1 2c2.1 0 2.1.1.8 6.4L29.5 185c-3.4 20.2-3.8 21.5-6.6 24.1-1.6 1.5-2.9 3.4-2.9 4.1 0 .8-.9 2.3-2.1 3.4q-5 4.4-4.9 12.1a14.8 14.8 0 0 0 21.6 13.7c3.5-1.7 8.4-8.5 8.4-11.7 0-1.3.8-1.1 4.6 1l4.7 2.6 39.6-.9 39.6-.9 2.8 3.2c7.5 8.5 20.7 2.6 20.7-9.2 0-8.4-7.3-14.6-14.7-12.6-3.9 1.1-9.3 5.6-9.3 7.8 0 1-3 1.3-13.6 1.3-12.1 0-13.5-.2-12.4-1.5.8-.9 1-2.9.7-5-.3-1.9-.2-3.5.3-3.5q2.3.1.9-8-.8-5.3.2-6.6c.6-.7.8-2.6.5-4.1-.8-3.7 4.5-13.3 7.4-13.3q1.8.1 2 .8c0 .5 1.3 2.9 3 5.3 3.6 5.5 11.3 11.3 14.1 10.6 1-.3 2.1-.1 2.4.3 1.1 1.8 11.2 3.1 15.5 2 3.9-1 4.2-1 6.7 2q5 6 10.2 4.1c1.4-.5 3.8-1.2 5.4-1.5 1.5-.4 2.7-1.2 2.7-1.9s1-1.7 2.3-2.2c2.8-1.3 3.5-7.7 1.3-12.9-1.4-3.4-1.4-3.7.5-4.6 2.9-1.6 2.5-6.9-1.1-11.8-1.7-2.4-2.7-4.8-2.4-5.7q.5-1.7-1.6-4.1c-2.7-2.7-7.6-3.2-12.5-1-3.5 1.5-7.9.2-7-2.2.3-.7.5-2.4.5-3.6s.9-3.3 2-4.6c2.5-2.9 2.7-10.9.5-19.5q-1.6-6-.5-6.9c.5-.5 1-1.9 1-3.1 0-2.8-6-16.1-9.6-21.5-1.7-2.5-2.9-5.3-2.6-6.2.5-2.6-2.3-7.2-8-12.8q-5.2-5-5.5-8a24 24 0 0 0-1.7-6.5c-1.3-3.1-1.3-3.5 0-3.5 3.6 0-.2-10.1-7.6-19.8-3.8-5-3.9-5.4-2.5-7.6 2.7-4.1 3-11.7.7-16.9-2.5-5.7-5.7-6.5-6.7-1.7-.3 1.6-1.5 4.1-2.6 5.5l-2.1 2.5-2.5-2a22 22 0 0 0-6.7-3.1c-2.2-.6-5.2-1.9-6.6-2.9-5.2-3.6-12.6-5.1-13.6-2.7m12.2 5.2c1.8 1.4 4.3 2.5 5.5 2.5s3.7.9 5.6 2.1c2.6 1.7 3.1 2.4 2.3 3.5-.7.7-.9 1.8-.5 2.5q.7.9 1.4.3c.3-.5 2.3-2.1 4.3-3.6a16 16 0 0 0 4.8-6.4l1.3-3.7 1.3 2.4c2.3 4.1 1.3 13-2 17.4-1.4 2-1.5 1.9-4.5-.9-1.7-1.7-3.1-2.5-3.1-2 0 1.5 5.9 6.9 7.5 6.9 1.8 0 5.8 5.4 9.6 12.7 3.5 6.8 3.5 7.2.8 5.8-3-1.7-3.3-.7-.8 3.9 3 5.8 4.1 11.1 2.3 11.1q-3.8-.2 3.4 5.1c6.1 4.6 11.2 11.7 9.2 12.9-1.1.7-.5 2 2.8 6.2a79 79 0 0 1 10.7 20.8l.8 2.5-2.3-2-2.3-2 .6 2.5 2.6 9.5c2.5 8.2 2.9 19.4.7 17.6-1.1-.9-1.4-.1-1.9 4.5-.3 3-1 6.1-1.5 6.7-1.2 1.5.9 7.9 2.8 8.5q1.1.4.6-.7c-.9-1.4.9-1.4 3.4-.1 1.5.8 2.4.6 4-1 3.9-3.9 13.3-1.5 9.9 2.6-1.1 1.4-.9 1.9 1.5 3.7 3 2.2 6.1 8.1 5.1 9.7q-.8 1-3.1 1c-1.3 0-2.4.1-2.4.2l2.5 6.3c1.3 3.3 2.5 6.8 2.5 7.8 0 2.7-2.8 3.2-5.4.8a10 10 0 0 0-2.9-2.1c-1.3 0-.7 2.7.8 4 .8.7 1.5 1.9 1.5 2.6 0 2.1-3.1 1.7-5.7-.8-2.7-2.5-4-1.9-2.3 1.2.6 1.2.9 2.4.7 2.7-.9.8-4.6-1.7-6.3-4.3-1.5-2.3-1.5-2.6 0-4.3q3.9-4-2.4-1.4c-2.2.9-3.7 1.9-3.5 2.3 1.6 2.6-8.9 2.6-15.6 0-2.9-1-5.5-1.7-5.9-1.5-2 1.3-11.4-8.5-15.1-15.8-2.1-4-4.5-5.1-3.4-1.6.7 2.1.5 2.2-6.6 1.6-6.9-.6-7.2-.5-4.4.8 1.7.8 3.7 1.4 4.6 1.5 1.4 0 1.2.9-1.1 5.4-2.6 5-2.8 6.3-2.7 14.9.2 7.6-.1 9.3-1.1 8.5-2-1.7-2.7 0-1.4 3.5q2.2 6.5 0 8.4c-.7.6-7.5 1.3-15.1 1.7-12 .6-13.8.5-14.3-.9q-.5-1.7 1.6-4.1c1.9-1.9 2-2.4.7-2.4-1.8 0-5.7 4.5-5.7 6.6 0 1.6-.2 1.6-2.4.8s-2-3.6.5-6.8c1.6-2.1 1.7-2.6.5-2.6-1.4 0-5 3.8-5.9 6.3q-.4 1.4-1.8 0c-2-2 0-6.4 4.1-8.7 2.6-1.6 5.1-2 10.7-2 6.8.1 7.1 0 4.5-1.3a8 8 0 0 0-4.4-1c-1 .3-2.1.1-2.4-.4q-.6-.8-1.5-.3t-.3-3.5q.8-4.3-.6-4.1c-.9 0-1.1-1.3-.6-5.3l1-8.5c.1-1.8 1.5-5.9 3.1-9.2q4-8.5 6-5 .6.9 1.8 1c.6 0-1.2-2.2-4-4.9a30 30 0 0 1-5.8-7q-.6-2.2-2.4-1.6-1.8.8-3.4-3c-2.9-6-2.4-6.8 3.2-6 2.8.4 5.7.2 6.7-.3q1.8-1 3.2.4 2.5 2.5 9.1.3c2.4-.8 3.5-.8 4.6.1 2.3 1.9 15.1.8 20.1-1.8 2.2-1.1 4.6-2.8 5.3-3.6s1.8-1.3 2.3-1c1.7 1.1 8.5-6.6 11.3-12.7 3.1-7.1 5-16.6 4.1-21.4-1-5.3-2.6-3.2-2.6 3.4 0 6-2.5 16.1-3.9 16.1-.5 0-1.4 1.5-2.1 3.2-1.6 4-5 7.9-6.2 7.2-.5-.3-2.6 1-4.7 2.9-5.7 5.2-16.6 8.1-19.5 5.2-1.3-1.4-2.4-1.4-7.3-.6-7.8 1.5-9.2 1.4-6.8-.2 2.4-1.8 3-7.5.9-9.8q-1.5-1.7-1.1-2.6c.7-1.2-2-7.3-3.3-7.3q-.9-.2-1-2c0-2.2-3-4.4-7.4-5.4q-3.4-.7-1.5-1.7a50 50 0 0 1 19.3.1q2.5.9 3.1 0c.4-.6 3.3-1 6.5-1s6.2-.5 6.5-1q.4-1-.9-1c-1.2 0-1.1-.9.8-5.3 2.9-6.3 4-10.7 2.7-10.7-.5 0-1.8 2.6-3 5.7-3.4 9-4.7 10.2-11.1 10.3-3 .1-8.7-.2-12.6-.6-5.9-.5-7.8-.3-11.7 1.4-2.6 1.2-4.7 2.5-4.7 3.1 0 .5-1.4 1.7-3.2 2.5-3.8 2-4.8 1-4.8-4.7q0-3.8-1.1-3.1-1 .8-.6 6.3c.4 4.5.1 6.5-1.6 9.9s-2.6 4.2-4.2 3.8c-1.1-.3-2.7-.6-3.6-.6s-2.2-1.4-2.9-3-1.9-3-2.6-3c-1.8 0-1.8.5.2 3.5l1.6 2.5h-4c-4.9 0-6.5 1.7-6.5 7.1q0 4.1-1.5 4.6c-2.2.9-4.3-2.6-4.2-6.7.3-5 .1-5.7-1-4-.5.8-1 3.6-1 6.2 0 5.2-.8 5.8-3.5 2.8-1.3-1.4-1.6-2.9-1.2-5.5.3-1.9.2-3.5-.3-3.5q-2.2 0-2.2 5.8v3.7l-1.9-2.4c-2.4-2.9-2.4-4.5.1-9.9a14.6 14.6 0 0 1 19-6.7q2.8 1.4 3.5.5.3-1-2-2.2c-3.3-1.5-1.5-2.8 3.8-2.8 4.2 0 8.7-2.4 8.7-4.7q-.1-1.2-1.1-.7c-1.4.8-.8-2.3 1.6-8 1.3-3.1 1.8-3.6 3.1-2.5q1.4 1 2.1.5c.4-.3-1.1-2.4-3.2-4.6-3.1-3.2-3.9-4.8-4.3-8.9-.5-5.6-.8-6-2.7-3.4-3.3 4.4-2.6-16.7.7-23.1q1.4-2.2-.6-1.3c-1.9.8-1.5-1.7 1.5-9.6 2.4-6.2 2.4-7-.1-5.7q-1.8 1-2 .2a49 49 0 0 1 8.8-12.9c3.3-3.2 4.4-5.6 1.7-3.3q-1.8 1.7-.9-.3c1.1-3 11.3-8.8 17.9-10.2 2.7-.6 2.8-.8 1.2-1.9q-1.5-1.2-1.7-1.8c0-1.4 7.7-1.5 12.7-.2q9.3 2.4 4.8-1.3c-1.9-1.5-1.8-1.5 1.4-.9 1.9.3 4.9 1.7 6.7 3.1m-42.3 5.6c1.5 2.3 1.4 2.6-1.3 5.8s-2.9 3.2-3.9 1.3q-2.3-4.4.5-11c1.6-3.7 1.6-3.7 2.4-1.1.4 1.4 1.4 3.7 2.3 5M73.5 123q2.8 1 2.1 2.8t2.4 3.4c3 1.7 4 3.8 1.9 3.8q-1 0-.7 1.2c.2.6-.6 2.1-1.9 3.4a8 8 0 0 0-2.3 5.9c0 3.1-.3 3.5-2.5 3.5-3.1 0-4.9-3.2-4.2-7.6q.6-3.5-.7-3.4c-1.6 0-2.6 4.5-1.9 8.2q.7 3-1.1 2.8c-2.7 0-4.9-4.6-4.3-9 .3-2.2.1-4-.4-4-1.5 0-3.1 5.2-2.4 7.7.7 3.1-1 2.9-3.1-.2-3.5-5.3.6-14.2 8-17.6 4.7-2.1 7.3-2.3 11.1-.9M50 137.4c0 .8.3 2.2.7 3.2.6 1.5.1 1.6-3.5 1.1-4-.5-5.5.4-3.1 1.9.6.3.8 1.6.5 2.8-.5 2-8.7 48.3-10.1 57.4-.5 3.3-1.1 4.2-2.2 3.8l-2.5-.6q-1-.2-.5-3.8c.6-4.2 9.4-54.3 10.3-58.5.5-2.4.3-2.7-2-2.7q-3.9.1-2-4.4c.8-2.2 14.4-2.4 14.4-.2m32 2.9c0 2.3-1.7 4.7-3.2 4.7-1 0-1.1-5.4-.1-6.3 1.4-1.5 3.3-.6 3.3 1.6m-45 6.2q0 1.4-2.5 1.5-2.6 0-1.9-1.5a3 3 0 0 1 2.5-1.5q1.7.1 1.9 1.5m18-.5c1.3.9 1.3 1.1 0 2-2.3 1.5-8 1.2-8-.3q0-1.4.7-2c1-1 5.6-.8 7.3.3m6.5 5.7c.9 4.8 3.4 9.1 5.7 9.9 1 .3 3 2 4.4 3.9l2.5 3.3-2.6 5.1c-4.9 9.7-7.1 23.5-4.1 26 1.9 1.6-.2 7.8-3 8.5-5.2 1.3-10 9.9-7.4 13.1q1.5 1.6-.2 1.5c-.8 0-4.7-5.2-8.7-11.5s-7.9-11.9-8.6-12.5q-1.3-1-.5-4.8c.4-2 2.3-12.3 4-22.9l3.3-19.1 5.4-.7a15 15 0 0 0 6.6-2c1.9-2.2 2.4-1.8 3.2 2.2m-6 75.6a878 878 0 0 1 50.8-1.2c34.5-.2 38.7-.1 38.7 1.3 0 .9-1 1.8-2.2 2-1.3.3-22.3.7-46.8.8l-44.5.3-4.3-6.5-7.4-11c-3-4.2-3.8-8.6-2.1-11.3a75 75 0 0 1 8.6 12.2c4.5 7.2 8.7 13.2 9.2 13.4m-20.7-12.8a38 38 0 0 1-.8 8.7c-1.1 5.1-1.6 5.8-3.6 5.8-2.8 0-2.7.5-1.3-7.7q1.9-10.4-3.3-9c-2.6.7-2.2-1.2.5-2.2 3.6-1.4 8.1 1 8.5 4.4m-7.8 2.6c0 1.2-1.1 3.4-2.5 5.1-3.1 3.7-3.3 9-.5 11.8 2.4 2.4 4.1 2.5 8 .5 3.1-1.6 3.5-2.5 4.5-9.8s3.5-5.6 3.5 2.5c0 8.5-4.9 13.8-12.9 13.8-3.1 0-4.9-.7-7.3-2.9-2.7-2.4-3.2-3.6-3.6-8.7-.4-5.4-.1-6.3 2.4-9.3 2.4-2.9 5.4-4.8 7.7-5q.6 0 .7 2m120.7 5.5c2 2 2.4 3.1 1.9 5.7-.3 1.8-1.4 3.8-2.3 4.4-2 1.5-5.9 1.7-6.8.4-.3-.5.9-.9 2.6-.9q5 .2 4.9-4.7t-4.9-4.8c-3.1 0-4.1-1.1-1.8-2 2.5-1.1 3.8-.6 6.4 1.9M47 228.5q-.2.7-2-1.5c-1.1-1.4-2-3-2-3.5q.2-.7 2 1.5c1.1 1.4 2 2.9 2 3.5m-21.4-.6q-.2 2.7-.9 2.1c-.5-.4-.6-1.7-.2-2.9q1.3-4.3 1.1.8" />
        <path d="M60.5 43q-5 5.1-3.9 1.2.9-2.2-1.1.3c-2.4 2.9-3.7 5.5-2.8 5.5.5 0 2.6-1.2 4.7-2.6 3.1-2.1 4-2.4 4.7-1.3q.8 1.4.9 2.2c0 1.7 10.5-.4 12.2-2.4 1.6-1.9 1.7-1.9 5.4.6q7 4.6 8.4-.4c.6-2.5.6-2.4 4.2 1.3 2 2.1 4.5 6 5.4 8.7 1.9 5.2 3.8 6.8 2.4 2-1.2-4.4-3-7.2-7.4-12.1-5-5.6-5.6-5.8-5.6-2.6 0 4.9-5.2 4.2-9.7-1.3l-2.1-2.6-1.3 2.7c-1.2 2.8-1.8 3.1-7.8 4.3-3.3.7-3.4.7-2.9-2.4q1-6.4-3.7-1.1M49.2 60.5q0 2.6.5 1.2c.2-.9.2-2.3 0-3q-.5-.8-.5 1.8m8.8 0c-1 2.6.2 7.5 1.8 7.5s3.2-2.5 3.2-5-1.6-5-3.2-5c-.5 0-1.3 1.1-1.8 2.5m19.9.2c-1.4 3.7-.4 7.3 2.1 7.3 2.7 0 4.3-4.1 3-7.5-1.3-3.3-3.8-3.2-5.1.2m20.7 4q3.2 12.8 3.3 9.5c.1-3.2-1.9-11.1-3.1-11.8q-.8-.3-.2 2.3m-36.7 5.2-2.4 2 2.2 2.2c1.2 1.3 2.6 2 3 1.6q.4-.8-.5-1.9-1.1-1.2-1.2-1.9c0-1.2 3.2-2 5.2-1.3 1.9.6 1.9.7-.3 3-2.5 2.7-1.5 3.2 1.9.8 2.7-1.9 2.8-4 .3-5.4a7 7 0 0 0-8.2.9m-14.8 7.6a25 25 0 0 0 7.7 18.8c3.8 4 8.1 6.7 10.4 6.7.7-.1-.2-.9-1.9-1.8a29 29 0 0 1-15.2-23.5l-.8-6.2zm51.5 3.1c-1.1 8.3-5.1 13.6-15.2 20.1q-2.7 1.7.1.6c3.6-1.2 9.1-5 11.8-8.3 3.3-3.8 6.2-13.2 4.9-15.6-.7-1.2-1.1-.5-1.6 3.2m-42.5-1.2c-1.9 2.2.3 5.4 5.2 7.7s7.5 2.3 13 .7c5.1-1.5 11.5-7.4 9.9-9-.9-.9-1.7-.4-3.3 1.6-5.7 7.3-18.4 7.3-22.2 0-1.2-2.2-1.5-2.3-2.6-1m28.3 130.5c1.5 2.4 6.5 4.2 8.6 3.1 1.5-.8 2.6-.7 4.5.6 3.2 2.1 3.2.5 0-1.9-2-1.4-2.8-1.5-4.4-.5s-2.5.9-4.8-.2c-4.5-2.3-4.6-2.3-3.9-1.1" />
      </svg>
    );

  // book (face behind book)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-label="face behind book" viewBox="0 0 197 221" className={cls}>
      <path d="M87.5 10.6a62 62 0 0 0-25.3 10.9L59 24.1l.3-3.7c.1-3-.2-3.9-1.6-4.2-2.5-.5-9.6 6.8-10.3 10.7-.6 2.6-1.1 3.1-3.6 3.1-5.9 0-13.8 4.6-13.8 8.2q-.2 2 3.2 1.8h3.1l-4.6 4.6a46 46 0 0 0-7.4 10.2c-2.6 5.2-2.8 6.6-2.8 17.2 0 8.9.6 13.3 2.3 19.3 2.2 7.8 2.2 7.8.3 10.6a24 24 0 0 0-3.4 15.1c.3 2.2 0 5.3-.7 7.1-1.2 2.9-1.6 3.1-5.1 2.6q-3.8-.4-4.9.8c-.8 1-.8 10.6 0 34.6.6 18.3 1.3 33.6 1.6 34.1q.6.7 2 .8c1.7 0 1.8-2.9.4-38.9a320 320 0 0 1-.5-26.9c.7-.7 13.1 2.1 49.3 11l29.2 7.2-.6 30.8-.7 30.8h2.1c2.2 0 2.2-.1 2.4-26.3l.3-29.7v-3.6H113l-.5 8.6c-1.3 22.7-1.6 48.8-.5 49.5q1.2.6 2.1-.2c.5-.5 1.2-14.2 1.6-30.5l.6-29.6 18.6-5.1 33.9-9 15.2-3.9v2.6l-1.5 28.7c-1.9 34.5-1.9 34.7.3 34.3 1.4-.3 1.8-1.8 2.3-8.8 1.4-18.8 3-59 2.4-60-.4-.7-2.2-.9-4.5-.5-3.6.6-4 .4-5.5-2.6-1.8-3.5-1.2-3.4-16.9-1.3l-4.9.7.8-11.2q.6-11.3 2.6-15.4c1-2.3 1.9-5.2 1.9-6.4a4 4 0 0 1 2.1-3.3c4.9-2.7 6.5-15.8 2.9-23.8-1.8-4-1.8-4.2-.1-4.2 3.6 0 3.6-4.9 0-12A35 35 0 0 0 151 34.5l-4.8-2.1c-.2-.1.9-1.4 2.3-3 4.4-4.7 3.2-5.8-7.2-6.5a30 30 0 0 1-15.8-4.3c-3.6-2-9.2-4.5-12.5-5.6-5.8-2-19.7-3.3-25.5-2.4m24.8 61.5a38 38 0 0 0 13.8-2c3-1.2 7.3-2.1 9.5-2.1 3.6 0 4.7.6 8.6 4.8 6.7 7.2 7.3 9.6 7.3 32.5v19.9l-9 2.3c-4.9 1.2-13.3 3.9-18.5 5.8-5.2 2-9.5 3.5-9.6 3.4-.2-.1-1.1-2.5-2.2-5.2-2.5-6.3-5.8-7.7-4.9-2.1a26 26 0 0 0 2 6.5c1.4 2.8 1.4 2.9-2.2 4.9-3.5 1.9-3.7 1.9-6.6.1a177 177 0 0 0-34.7-12.8 299 299 0 0 0-35.5-6.6l-5.3-.7v-5.9c0-10.4 4.5-15.4 11.4-12.5q3.3 1.3 5.5 6 2.3 4.5 4.1 4.6c2.5 0 2.9-.8 3.7-8.2q.7-6.2 3.4-11.3A51 51 0 0 0 59 71.2v-5.4l3.3 2.1c10.6 6.5 30.3 5.9 26.7-.8-.8-1.5.5-1.2 7 1.6 6.9 3 9 3.4 16.3 3.4m-74 54.4a215 215 0 0 1 58.8 17.1l6.8 3.4 7.4-4a196 196 0 0 1 57.3-16.6c4.3-.5 5.2-.3 5.8 1.1q.5 1.7.4 2a1365 1365 0 0 0-45.7 12.2c-27.5 7.8-21.2 8-60.1-2a1156 1156 0 0 0-46.8-11.2c-.1-.1 0-1 .4-1.9.8-2 2.7-2 15.7-.1" />
      <path d="M76.5 94.7c-3.9.8-7.4 2.5-7.9 3.9q-1.2 3.2 5.5 1.3c3.2-1 5.1-1 8.5-.1 5.8 1.6 7.4 1.5 7.4-.3 0-2.6-8.7-5.7-13.5-4.8m49.2.3q-5.5 1.7-5.7 4.7c0 1.2.7 1.4 3.3.7 1.7-.4 6.1-.8 9.6-.9 7.5 0 9.1-1.8 3.7-4a14 14 0 0 0-10.9-.5m-48.1 20.2c-3.2 4.6-1 13.8 3.3 13.8q3.9 0 4.8-6.9c1-7.3-4.6-12-8.1-6.9m47 0c-2.3 3.2-2.1 9.3.4 11.8 1.1 1.1 2.4 2 2.8 2 1.7 0 4.3-3.8 4.8-7.1 1-6.9-4.6-11.6-8-6.7" />
    </svg>
  );
}
