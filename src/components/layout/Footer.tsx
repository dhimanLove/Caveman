import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/layout/Logo";

export function Footer() {
  return (
    <footer className="bg-cream pt-20 pb-10">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          <div>
            <Logo />
            <p className="mt-4 text-sm text-fog leading-relaxed max-w-m">
              An AI README generator that reads your code and writes documentation that matches what
              you actually built.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-10">
            <div>
              <p className="text-xs font-medium text-fog uppercase tracking-widest mb-4">Product</p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/generate"
                  className="text-sm text-ink hover:opacity-60 transition-opacity"
                >
                  Generate
                </Link>
                <Link to="/graph" className="text-sm text-ink hover:opacity-60 transition-opacity">
                  Graph
                </Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-fog uppercase tracking-widest mb-4">Legal</p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/privacy"
                  className="text-sm text-ink hover:opacity-60 transition-opacity"
                >
                  Privacy
                </Link>
                <Link to="/terms" className="text-sm text-ink hover:opacity-60 transition-opacity">
                  Terms
                </Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-fog uppercase tracking-widest mb-4">Contact</p>
              <a
                href="mailto:hello@caveman.dev"
                className="text-sm text-ink hover:opacity-60 transition-opacity"
              >
                hello@caveman.dev
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-bone flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-fog">
          <span>&copy; {new Date().getFullYear()} Caveman. All rights reserved.</span>
          <span>Built for developers who ship.</span>
        </div>
      </div>
    </footer>
  );
}
