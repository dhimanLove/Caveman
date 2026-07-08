import { motion } from "framer-motion";

const quotes = [
  { q: "Documentation used to be the last thing I did. Now it's the first. Caveman turned a chore into 90 seconds.", name: "Ana Merino", role: "Founder, plot.dev" },
  { q: "Our OSS repo tripled its stars the month we replaced our README with Caveman's output. Same code, different first impression.", name: "Devon Park", role: "Maintainer, hyperfetch" },
  { q: "It writes like a senior engineer with a copy editor over their shoulder. Nothing else comes close.", name: "Priya Anand", role: "Staff Engineer, Loom" },
];

export function Testimonials() {
  return (
    <section className="bg-cream-warm py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <h2 className="text-spruce-900" style={{ fontSize: "clamp(32px, 4vw, 40px)", lineHeight: 1.13, fontWeight: 475 }}>
            Developers who stopped procrastinating.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {quotes.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-sm bg-pure-white hairline p-8 flex flex-col"
              style={{ borderRadius: 2 }}
            >
              <blockquote className="text-spruce-900 flex-1" style={{ fontSize: 17, lineHeight: 1.5 }}>
                “{t.q}”
              </blockquote>
              <figcaption className="mt-6 pt-6 border-t border-charcoal-100">
                <div className="text-spruce-900" style={{ fontWeight: 500 }}>{t.name}</div>
                <div className="text-spruce-mist" style={{ fontSize: 14 }}>{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
