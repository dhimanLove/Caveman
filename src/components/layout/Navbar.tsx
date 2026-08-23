import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/layout/Logo";

function scrollToHash(hash: string) {
  const el = document.querySelector(hash);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

const NAV_LINKS = [
  {
    to: "/generate",
    label: "Generate",
    icon: (
      <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" data-name="Layer 2">
        <path
          fill="#7D8590"
          d="m1.5 13v1a.5.5 0 0 0 .3379.4731 18.9718 18.9718 0 0 0 6.1621 1.0269 18.9629 18.9629 0 0 0 6.1621-1.0269.5.5 0 0 0 .3379-.4731v-1a6.5083 6.5083 0 0 0 -4.461-6.1676 3.5 3.5 0 1 0 -4.078 0 6.5083 6.5083 0 0 0 -4.461 6.1676zm4-9a2.5 2.5 0 1 1 2.5 2.5 2.5026 2.5026 0 0 1 -2.5-2.5zm2.5 3.5a5.5066 5.5066 0 0 1 5.5 5.5v.6392a18.08 18.08 0 0 1 -11 0v-.6392a5.5066 5.5066 0 0 1 5.5-5.5z"
        />
      </svg>
    ),
  },
  {
    to: "/graph",
    label: "Commit Graph",
    muted: true,
    icon: (
      <svg id="Line" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="#7D8590"
          id="XMLID_1646_"
          d="m17.074 30h-2.148c-1.038 0-1.914-.811-1.994-1.846l-.125-1.635c-.687-.208-1.351-.484-1.985-.824l-1.246 1.067c-.788.677-1.98.631-2.715-.104l-1.52-1.52c-.734-.734-.78-1.927-.104-2.715l1.067-1.246c-.34-.635-.616-1.299-.824-1.985l-1.634-.125c-1.035-.079-1.846-.955-1.846-1.993v-2.148c0-1.038.811-1.914 1.846-1.994l1.635-.125c.208-.687.484-1.351.824-1.985l-1.068-1.247c-.676-.788-.631-1.98.104-2.715l1.52-1.52c.734-.734 1.927-.779 2.715-.104l1.246 1.067c.635-.34 1.299-.616 1.985-.824l.125-1.634c.08-1.034.956-1.845 1.994-1.845h2.148c1.038 0 1.914.811 1.994 1.846l.125 1.635c.687.208 1.351.484 1.985.824l1.246-1.067c.787-.676 1.98-.631 2.715.104l1.52 1.52c.734.734.78 1.927.104 2.715l-1.067 1.246c.34.635.616 1.299.824 1.985l1.634.125c1.035.079 1.846.955 1.846 1.993v2.148c0 1.038-.811 1.914-1.846 1.994l-1.635.125c-.208.687-.484 1.351-.824 1.985l1.067 1.246c.677.788.631 1.98-.104 2.715l-1.52 1.52c-.734.734-1.928.78-2.715.104l-1.246-1.067c-.635.34-1.299.616-1.985.824l-.125 1.634c-.079 1.035-.955 1.846-1.993 1.846zm-5.835-6.373c.848.53 1.768.912 2.734 1.135.426.099.739.462.772.898l.18 2.341 2.149-.001.18-2.34c.033-.437.347-.8.772-.898.967-.223 1.887-.604 2.734-1.135.371-.232.849-.197 1.181.089l1.784 1.529 1.52-1.52-1.529-1.784c-.285-.332-.321-.811-.089-1.181.53-.848.912-1.768 1.135-2.734.099-.426.462-.739.898-.772l2.341-.18h-.001v-2.148l-2.34-.18c-.437-.033-.8-.347-.898-.772-.223-.967-.604-1.887-1.135-2.734-.232-.37-.196-.849.089-1.181l1.529-1.784-1.52-1.52-1.784 1.529c-.332.286-.81.321-1.181.089-.848-.53-1.768-.912-2.734-1.135-.426-.099-.739-.462-.772-.898l-.18-2.341-2.148.001-.18 2.34c-.033.437-.347.8-.772.898-.967.223-1.887.604-2.734 1.135-.37.232-.849.197-1.181-.089l-1.785-1.529-1.52 1.52 1.529 1.784c.285.332.321.811.089 1.181-.53.848-.912 1.768-1.135 2.734-.099.426-.462.739-.898.772l-2.341.18.002 2.148 2.34.18c.437.033.8.347.898.772.223.967.604 1.887 1.135 2.734.232.37.196.849-.089 1.181l-1.529 1.784 1.52 1.52 1.784-1.529c.332-.287.813-.32 1.18-.089z"
        />
        <path
          id="XMLID_1645_"
          fill="#7D8590"
          d="m16 23c-3.859 0-7-3.141-7-7s3.141-7 7-7 7 3.141 7 7-3.141 7-7 7zm0-12c-2.757 0-5 2.243-5 5s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z"
        />
      </svg>
    ),
  },
  {
    to: "/#how",
    label: "How it works",
    hash: true,
    icon: (
      <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="#7D8590"
          d="m109.9 20.63a6.232 6.232 0 0 0 -8.588-.22l-57.463 51.843c-.012.011-.02.024-.031.035s-.023.017-.034.027l-4.721 4.722a1.749 1.749 0 0 0 0 2.475l.341.342-3.16 3.16a8 8 0 0 0 -1.424 1.967 11.382 11.382 0 0 0 -12.055 10.609c-.006.036-.011.074-.015.111a5.763 5.763 0 0 1 -4.928 5.41 1.75 1.75 0 0 0 -.844 3.14c4.844 3.619 9.4 4.915 13.338 4.915a17.14 17.14 0 0 0 11.738-4.545l.182-.167a11.354 11.354 0 0 0 3.348-8.081c0-.225-.02-.445-.032-.667a8.041 8.041 0 0 0 1.962-1.421l3.16-3.161.342.342a1.749 1.749 0 0 0 2.475 0l4.722-4.722c.011-.011.018-.025.029-.036s.023-.018.033-.029l51.844-57.46a6.236 6.236 0 0 0 -.219-8.589zm-70.1 81.311-.122.111c-.808.787-7.667 6.974-17.826 1.221a9.166 9.166 0 0 0 4.36-7.036 1.758 1.758 0 0 0 .036-.273 7.892 7.892 0 0 1 9.122-7.414c.017.005.031.014.048.019a1.717 1.717 0 0 0 .379.055 7.918 7.918 0 0 1 4 13.317zm5.239-10.131c-.093.093-.194.176-.293.26a11.459 11.459 0 0 0 -6.289-6.286c.084-.1.167-.2.261-.3l3.161-3.161 6.321 6.326zm7.214-4.057-9.479-9.479 2.247-2.247 9.479 9.479zm55.267-60.879-50.61 56.092-9.348-9.348 56.092-50.61a2.737 2.737 0 0 1 3.866 3.866z"
        />
      </svg>
    ),
  },
];

export function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isGenerate = location.pathname === "/generate";
  if (isGenerate) return null;

  const handleNavClick = (l: (typeof NAV_LINKS)[number]) => {
    setMenuOpen(false);
    if (l.hash) {
      // Same page → smooth scroll; sub-page → navigate then scroll after mount
      if (location.pathname === "/") {
        scrollToHash(l.to.split("#")[1]);
      } else {
        router.navigate({ to: "/" });
        requestAnimationFrame(() => {
          setTimeout(() => scrollToHash(l.to.split("#")[1]), 120);
        });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-bone/60">
      <div className="mx-auto max-w-[1200px] px-6 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-10">
          <Logo />
        </div>

        {/* Center: GitHub-style pill nav (Tailwind port of former styled-components CSS) */}
        <nav className="hidden md:flex w-fit items-center justify-center gap-[7.5px] rounded-[5px] bg-[#0d1117]">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to as any}
              onClick={() => handleNavClick(l)}
              className={[
                "relative flex items-center gap-[5px] rounded-[4px] p-[10px] text-sm text-white no-underline",
                "transition-all duration-200 outline-none [&>svg]:w-[15px]",
                "before:pointer-events-none before:absolute before:right-0 before:bottom-0 before:h-[3px] before:w-full before:rounded-[5px] before:bg-[#2f81f7] before:content-[''] before:opacity-0 before:transition-opacity before:duration-200",
                "[&:not(:active):not(.active-link):hover]:bg-[#21262c]",
                "[&:focus:not(.active-link)]:bg-[#21262c]",
                "focus:bg-[#1a1f24] active:bg-[#1a1f24] [&.active-link]:bg-[#1a1f24]",
                "focus:before:opacity-100 active:before:opacity-100 [&.active-link]:before:opacity-100",
                l.muted ? "opacity-[0.72] hover:opacity-100 focus:opacity-100" : "",
              ].join(" ")}
              activeProps={{ className: "active-link" }}
            >
              {l.icon}
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right: Auth / Action items */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-7 h-7 rounded-full border border-bone hover:scale-105 transition-transform duration-200"
                  referrerPolicy="no-referrer"
                />
              )}
              <Link to="/generate" search={{ url: undefined }} className="circle-arrow" aria-label="Open README generator">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </>
          ) : (
            <Link
              to="/generate"
              search={{ url: undefined }}
              className="hidden sm:inline-flex btn-primary !h-9 !px-4 text-sm group"
            >
              Get Started
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-9 h-9 rounded-[4px] border border-bone flex flex-col items-center justify-center gap-1.5 hover:bg-cream transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <span
              className={`block w-4 h-px bg-ink transition-transform duration-300 ${menuOpen ? "rotate-45 translate-y-[3.5px]" : ""}`}
            />
            <span
              className={`block w-4 h-px bg-ink transition-transform duration-300 ${menuOpen ? "-rotate-45 -translate-y-[3.5px]" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile nav (Left standard styles intact for mobile) */}
      {menuOpen && (
        <nav className="md:hidden border-t border-bone bg-cream">
          <div className="mx-auto max-w-[1200px] px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to as any}
                onClick={() => handleNavClick(l)}
                className={`px-3 py-3 text-base rounded-[4px] transition-colors flex items-center gap-3 ${l.muted ? "text-ink/45 hover:text-ink/70 hover:bg-cream" : "text-ink/80 hover:text-ink hover:bg-cream"}`}
              >
                {/* Optional: you can show the icon on mobile too by rendering {l.icon}, styled appropriately, or just text */}
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link
                to="/generate"
                search={{ url: undefined }}
                onClick={() => setMenuOpen(false)}
                className="btn-primary justify-center mt-3 sm:hidden"
              >
                Get Started
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
