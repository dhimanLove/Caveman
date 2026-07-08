import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { List, X } from "@phosphor-icons/react";

const links = [
  { label: "How it works", href: "/#how" },
  { label: "Features", href: "/#features" },
  { label: "Docs", href: "/#docs" },
  { label: "Pricing", href: "/#pricing" },
];

export function Navbar({ variant = "landing" }: { variant?: "landing" | "tool" }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 bg-spruce-900"
      style={{
        borderBottom: scrolled ? "1px solid #0b363b" : "1px solid transparent",
      }}
    >
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link to="/" className="text-pure-white" style={{ fontWeight: 600, fontSize: 18, letterSpacing: "0.15em" }}>
          CAVEMAN
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-spruce-200 hover:text-pure-white transition-colors" style={{ fontSize: 15 }}>
              {l.label}
            </a>
          ))}
          {variant === "tool" && (
            <Link to="/generate" className="text-pure-white" style={{ fontSize: 15 }}>
              Generate
            </Link>
          )}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/generate" className="btn-pill-primary" style={{ height: 40, padding: "0 18px", fontSize: 14 }}>
            Get started →
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden text-pure-white"
          aria-label="Toggle navigation"
        >
          {open ? <X size={24} /> : <List size={24} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-spruce-700 bg-spruce-900 px-6 py-4 space-y-3">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="block text-spruce-200" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link to="/generate" className="btn-pill-primary mt-4 w-full" style={{ height: 44 }}>
            Get started →
          </Link>
        </div>
      )}
    </motion.header>
  );
}
