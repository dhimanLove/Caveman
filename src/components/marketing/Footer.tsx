import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-ink text-paper py-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-paper flex items-center justify-center overflow-hidden border border-paper/20">
              <img
                src="/logo-256.png"
                alt="Caveman logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-base font-medium text-paper tracking-[-0.02em]">Caveman</span>
          </div>

          <div className="flex items-center gap-8 text-sm text-paper/60">
            <Link to="/generate" className="hover:text-paper transition-colors">
              Generate
            </Link>
            <Link to="/graph" className="hover:text-paper transition-colors">
              Graph
            </Link>
            <Link to="/privacy" className="hover:text-paper transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-paper transition-colors">
              Terms
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-paper transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-paper/10 text-center text-xs text-paper/40">
          &copy; {new Date().getFullYear()} Caveman. Built for developers who ship.
        </div>
      </div>
    </footer>
  );
}
