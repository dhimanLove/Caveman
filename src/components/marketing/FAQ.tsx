import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

const faqs = [
  {
    q: "How does Caveman work?",
    a: "Paste your GitHub repository URL or type a short project description. Caveman analyzes your code structure, dependencies, and conventions, then generates a complete README.md with installation, usage, API docs, and more. The whole process takes under 90 seconds.",
  },
  {
    q: "Does Caveman support private repositories?",
    a: "Yes. When you sign in with Google, Caveman can access your private repos. The analysis runs server-side and your code is never stored after the README is generated.",
  },
  {
    q: "How accurate is the generated README?",
    a: "Caveman reads your actual code — package.json, imports, file tree, and comments. The output reflects your real dependencies, APIs, and project structure. The built-in Health Score checks for missing sections so nothing gets skipped.",
  },
  {
    q: "What languages and frameworks does Caveman support?",
    a: "Any language or framework. Caveman detects your stack from your project files and tailors the README accordingly. Whether it is Python, TypeScript, Go, Rust, or something niche, the output matches your conventions.",
  },
  {
    q: "Is Caveman free to use?",
    a: "Yes, Caveman is free during early access. Generate as many READMEs as you need. You only need a Google account to sign in.",
  },
  {
    q: "How is Caveman different from asking ChatGPT to write a README?",
    a: "ChatGPT generates generic text based on what you type. Caveman reads your actual repository — your file tree, dependencies, and code — and produces a README that matches your project exactly. It also scores your README quality and fills gaps automatically.",
  },
  {
    q: "Can I edit the README before downloading?",
    a: "Yes. Caveman gives you a full markdown editor after generation. Toggle preview mode, copy individual sections, or download the final file. Nothing is final until you ship it.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-cream-paper py-16 border-t border-ink">
      <div className="mx-auto max-w-[800px] px-6">
        <div className="text-center">
          <span className="step-badge mx-auto">
            <span className="step-badge-num">?</span>
            <span className="step-badge-label">FAQ</span>
          </span>
          <h2 className="mt-6 text-[28px] font-medium text-ink leading-[1.25]">
            Questions? Answers.
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink bg-cream-paper overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium text-ink hover:bg-ink/5 transition-colors"
              >
                <span>{faq.q}</span>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={`shrink-0 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4 text-sm text-graphite leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
