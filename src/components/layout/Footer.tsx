export function Footer() {
  return (
    <footer className="border-t border-ink bg-cream-paper">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs text-ink font-medium uppercase tracking-[0.286em]">Caveman</span>
          <div className="flex items-center gap-6 text-sm text-graphite">
            <a href="#" className="hover:text-ink transition-colors">Privacy</a>
            <a href="#" className="hover:text-ink transition-colors">Terms</a>
            <a href="#" className="hover:text-ink transition-colors">Contact</a>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-ink text-center text-xs text-graphite">
          &copy; {new Date().getFullYear()} Caveman. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
