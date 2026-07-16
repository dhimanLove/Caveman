import { Link } from "@tanstack/react-router";

export function Navbar() {
  return (
    <header className="border-b border-ink">
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <Link to="/" className="text-sm font-medium text-ink uppercase tracking-[0.286em]">
          Caveman
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/generate" className="text-sm text-graphite hover:text-ink transition-colors">
            Generate
          </Link>
          <Link
            to="/generate"
            className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-sunshine-highlight text-ink text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
        </div>
      </nav>
    </header>
  );
}
