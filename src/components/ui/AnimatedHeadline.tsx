import { useEffect, useRef, type ReactNode } from "react";

export function AnimatedHeadline({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    (async () => {
      const anime = await import("animejs");
      const animate = (anime as unknown as { animate: (t: unknown, o: unknown) => unknown }).animate;
      const stagger = (anime as unknown as { stagger: (v: number) => unknown }).stagger;
      const words = el.querySelectorAll(".hl-word");
      words.forEach((w) => {
        (w as HTMLElement).style.opacity = "0";
        (w as HTMLElement).style.transform = "translateY(40px)";
      });
      animate(words, {
        translateY: [40, 0],
        opacity: [0, 1],
        delay: stagger(70),
        duration: 800,
        easing: "easeOutExpo",
      });
    })();
  }, []);

  return (
    <h1 ref={ref} className={className} style={style}>
      {children}
    </h1>
  );
}
