const testimonials = [
  {
    quote: "Cut my README writing from 20 minutes to under 60 seconds. The auto-detection of my stack was spot-on — it even pulled the right badges.",
    name: "Alex Chen",
    role: "Senior Frontend Engineer",
    company: "Finch.io",
  },
  {
    quote: "I have twelve repos. I used to skip READMEs because writing them felt pointless. Caveman generated all twelve in an afternoon.",
    name: "Jordan Taylor",
    role: "Full-Stack Developer",
    company: "Rivet",
  },
  {
    quote: "The health score caught missing sections I never would have thought to include. Our docs went from 'eh' to people actually reading them.",
    name: "Samir Patel",
    role: "DevOps Engineer",
    company: "Mantle",
  },
];

export function Testimonials() {
  return (
    <section className="bg-cream-paper py-16 border-t border-ink">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-xl">
          <span className="step-badge">
            <span className="step-badge-num">4</span>
            <span className="step-badge-label">Early Feedback</span>
          </span>
          <h2 className="mt-6 text-[28px] font-medium text-ink leading-[1.25]">
            Used by developers who actually ship.
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-3xl border border-ink bg-cream-paper p-8 flex flex-col justify-between"
            >
              <p className="text-lg text-graphite leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 pt-4 border-t border-ink">
                <p className="text-sm font-medium text-ink">{t.name}</p>
                <p className="text-xs text-graphite">
                  {t.role}, {t.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
