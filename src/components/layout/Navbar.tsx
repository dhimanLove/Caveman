import { Link } from "@tanstack/react-router";
import { SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-ink">
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <Link to="/" className="text-sm font-medium text-ink uppercase tracking-[0.286em]">
          Caveman
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/generate" className="text-sm text-graphite hover:text-ink transition-colors">
            Generate
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-6 h-6 rounded-full border border-ink"
                  referrerPolicy="no-referrer"
                />
              )}
              <button
                onClick={signOut}
                className="text-[10px] text-graphite hover:text-ink flex items-center gap-1 transition-colors"
              >
                <SignOut size={11} /> Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/generate"
              className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-sunshine-highlight text-ink text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started Free
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
