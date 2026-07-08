import { CheckCircle } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section className="bg-spruce-900 py-24">
      <div className="mx-auto max-w-[900px] px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-pure-white"
          style={{ fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1.1, fontWeight: 475 }}
        >
          Your project deserves <span style={{ color: "#abffae" }}>better docs</span>.
        </motion.h2>
        <p className="mt-6 text-spruce-200 mx-auto max-w-2xl" style={{ fontSize: 20, lineHeight: 1.38 }}>
          Join developers who stopped procrastinating on documentation.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/generate" className="btn-pill-primary" style={{ height: 56, padding: "0 32px", fontSize: 18 }}>
            Generate your README free →
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-spruce-200" style={{ fontSize: 13 }}>
          {["No account needed", "No signup required", "Free to use"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <CheckCircle size={16} weight="fill" style={{ color: "#abffae" }} />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
