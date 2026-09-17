import { useEffect, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type LenisInstance = InstanceType<typeof import("lenis").default>;

gsap.registerPlugin(ScrollTrigger);

export function SmoothScroll({ children }: { children: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (location.pathname.startsWith("/generate")) return;

    let lenis: LenisInstance | null = null;
    let rafId = 0;
    let onLoad: (() => void) | null = null;

    (async () => {
      const { default: Lenis } = await import("lenis");
      const instance = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenis = instance;

      // Keep GSAP ScrollTrigger in sync with Lenis's virtual scroll
      instance.on("scroll", ScrollTrigger.update);

      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);

      // Recalculate trigger positions after route mount & asset load
      requestAnimationFrame(() => ScrollTrigger.refresh());
      onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);
    })();

    return () => {
      cancelAnimationFrame(rafId);
      if (onLoad) window.removeEventListener("load", onLoad);
      lenis?.destroy();
    };
  }, [location.pathname]);

  return <>{children}</>;
}
