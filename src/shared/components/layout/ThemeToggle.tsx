import { useTheme } from "@/shared/components/layout/ThemeProvider";

export function ThemeToggle() {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDark = mounted && theme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-bone/80 bg-paper/40 text-ink/70 shadow-subtle transition-[background-color,border-color,color,transform] duration-300 hover:-translate-y-0.5 hover:border-electric-iris/70 hover:bg-electric-iris/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-iris/50"
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <span className={`theme-toggle-icon ${isDark ? "is-dark" : ""}`} aria-hidden="true">
        <svg
          className="theme-icon theme-icon-sun"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <svg
          className="theme-icon theme-icon-moon"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M20.5 14.7A8.5 8.5 0 0 1 9.3 3.5 8.5 8.5 0 1 0 20.5 14.7Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="sr-only">Switch to {nextTheme} theme</span>
    </button>
  );
}
