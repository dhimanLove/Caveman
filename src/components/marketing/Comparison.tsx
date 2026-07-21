const rows = [
  { label: "Reads your code", byHand: "Only what you remember", chatbot: "Only what you paste", caveman: "Full repo analysis" },
  { label: "Stack detection", byHand: "Manual research", chatbot: "You list dependencies", caveman: "Auto-detected from files" },
  { label: "Quality check", byHand: "No objective score", chatbot: "No completeness check", caveman: "Built-in Health Score" },
  { label: "Time to ship", byHand: "20–40 minutes", chatbot: "5–10 minutes", caveman: "Under 90 seconds" },
];

const headerClass = "text-xs font-medium uppercase tracking-[0.2em] pb-4";
const cellClass = "py-3 text-sm text-graphite";
const highlightClass = "text-sm font-medium text-ink";

export function Comparison() {
  return (
    <section className="bg-cream-paper py-16 border-t border-ink">
      <div className="mx-auto max-w-[900px] px-6">
        <div className="text-center">
          <span className="step-badge mx-auto">
            <span className="step-badge-num">5</span>
            <span className="step-badge-label">Comparison</span>
          </span>
          <h2 className="mt-6 text-[28px] font-medium text-ink leading-[1.25]">
            By hand. A chatbot. Or Caveman.
          </h2>
          <p className="mt-2 text-lg text-graphite max-w-lg mx-auto leading-relaxed">
            Three ways to write a README. Only one reads your actual code.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-ink bg-cream-paper overflow-hidden">
          <div className="grid grid-cols-4 gap-0 divide-x divide-ink">
            <div className="px-6 pt-6 pb-2" />
            <div className={`px-6 pt-6 pb-2 text-center ${headerClass}`}>By Hand</div>
            <div className={`px-6 pt-6 pb-2 text-center ${headerClass}`}>A Chatbot</div>
            <div className={`px-6 pt-6 pb-2 text-center ${headerClass}`}>Caveman</div>
          </div>
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            return (
              <div
                key={row.label}
                className={`grid grid-cols-4 gap-0 divide-x divide-ink ${isLast ? "" : "border-b border-ink"}`}
              >
                <div className={`px-6 py-3 text-sm font-medium text-ink`}>{row.label}</div>
                <div className={`px-6 text-center ${cellClass}`}>{row.byHand}</div>
                <div className={`px-6 text-center ${cellClass}`}>{row.chatbot}</div>
                <div className={`px-6 text-center ${highlightClass}`}>{row.caveman}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
