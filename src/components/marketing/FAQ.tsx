import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconPlus as Plus } from "@/components/icons";

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    q: "Does Caveman actually read my source code?",
    a: "Yes. It fetches your file tree from GitHub, identifies entry points, and sends up to 25 source files (at 5000 chars each) to the AI. It reads your components, APIs, config files, and dependencies to understand what you built.",
  },
  {
    q: "Do you support private repos?",
    a: "Yes - paste any GitHub URL. For private repos, Caveman uses the public file tree via GitHub's API. Deep scanning works best on public repos or repos you have read access to.",
  },
  {
    q: "What sections can I include?",
    a: "You can toggle 17+ sections: Title & Badges, Installation, Usage, API Docs, Components, Architecture, Features, Configuration, Environment Variables, Contributing, Testing, Deployment, FAQ, Changelog, License, Acknowledgements, and Related Projects.",
  },
  {
    q: "How is this different from a template generator?",
    a: "Template generators fill in your project name and stop there. Caveman reads your actual source - entry points, dependencies, component structure, API routes - and writes each section from real context.",
  },
  {
    q: "Which package managers do you detect?",
    a: "npm, pnpm, yarn, and bun. Caveman reads your lockfiles and generates accurate install commands based on what you use.",
  },
  {
    q: "Is my code sent to third parties?",
    a: "Only during generation. Source files are transmitted to Groq, our AI inference provider, solely to produce your README. We don't store your source code or generated READMEs on our servers, and we don't train models on your code. See our Privacy Policy for details.",
  },
];

export function FAQ() {
  const sectionRef = useRef<HTMLElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current) return;
      gsap.from(sectionRef.current.querySelectorAll(".faq-item"), {
        opacity: 0,
        y: 24,
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 bg-paper relative overflow-hidden">
      <div className="relative mx-auto max-w-[760px] px-6">
        <div className="text-center mb-12">
          <p className="text-sm text-fog uppercase tracking-[0.2em] mb-4">FAQ</p>
          <h2
            className="editorial-display text-ink"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15 }}
          >
            Questions? We got answers.
          </h2>
        </div>

        <div className="faq-item rounded-md border border-bone bg-paper p-6">
          {faqs.map((faq, i) => {
            const open = openIndex === i;
            return (
              <div key={i} className="border-b border-bone last:border-none">
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="w-full flex items-center justify-between py-4 text-left gap-3 group"
                >
                  <span className="text-base font-light text-ink group-hover:opacity-70 transition-opacity">
                    {faq.q}
                  </span>
                  <Plus
                    size={18}
                    className={`shrink-0 text-ink transition-transform duration-300 ${open ? "rotate-45" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-4 text-[15px] text-fog leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
