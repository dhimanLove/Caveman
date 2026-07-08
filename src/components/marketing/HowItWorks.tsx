import { motion } from "framer-motion";
import { GithubLogo, Brain, FileArrowDown } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

const steps = [
  { n: "01", title: "Drop your repo URL", body: "Paste a GitHub URL or describe your project in a sentence. We handle both public and private repos.", Icon: GithubLogo },
  { n: "02", title: "Caveman thinks", body: "Our model reads your code, understands the stack, and drafts a README tailored to how your users will use it.", Icon: Brain, pulse: true },
  { n: "03", title: "Download your README", body: "Copy to clipboard or download as README.md. Commit and push — you're done in 90 seconds flat.", Icon: FileArrowDown },
];

export function HowItWorks() {
  const brainRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    (async () => {
      const anime = await import("animejs");
      const animate = (anime as unknown as { animate: (t: unknown, o: unknown) => unknown }).animate;
      if (brainRef.current) {
        animate(brainRef.current, {
          scale: [1, 1.08, 1],
          duration: 1800,
          loop: true,
          easing: "easeInOutSine",
        });
      }
    })();
  }, []);

  return (
    <section id="how" className="bg-cream-warm py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <span className="rounded-sm px-3 py-1" style={{ background: "#eafde8", color: "#032125", fontSize: 12, borderRadius: 2 }}>
            How it works
          </span>
          <h2 className="mt-4 text-spruce-900" style={{ fontSize: "clamp(32px, 4vw, 40px)", lineHeight: 1.13, fontWeight: 475 }}>
            Three steps to <span style={{ color: "#863d1c" }}>perfect</span> documentation
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => {
            const iconEl = <s.Icon size={28} weight="regular" />;
            return (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-sm bg-pure-white hairline p-8"
                style={{ borderRadius: 2 }}
              >
                <span className="rounded-sm px-2 py-1" style={{ background: "#fdf0e9", color: "#83611c", fontSize: 11, borderRadius: 2, fontWeight: 500 }}>
                  Step {s.n}
                </span>
                <div className="mt-6 text-spruce-900">
                  {s.pulse ? <span ref={brainRef} className="inline-block">{iconEl}</span> : iconEl}
                </div>
                <h3 className="mt-4 text-spruce-900" style={{ fontSize: 24, lineHeight: 1.13, fontWeight: 475 }}>{s.title}</h3>
                <p className="mt-3 text-spruce-mist" style={{ fontSize: 16, lineHeight: 1.38 }}>{s.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
