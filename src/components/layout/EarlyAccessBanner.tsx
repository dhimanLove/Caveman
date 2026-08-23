import { useState } from "react";
import { X } from "@phosphor-icons/react";

export function EarlyAccessBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="banner"
      className="relative z-[60] bg-ink text-cream text-center"
    >
      <div className="mx-auto max-w-[1200px] px-6 py-2 pr-14">
        <p className="text-xs font-light tracking-wide">
          <span className="hidden sm:inline font-medium">Caveman is free during early access.</span>
          <span className="sm:hidden font-medium">Free during early access.</span>{" "}
          <span className="text-cream/70">No credit card needed.</span>
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-cream/60 hover:text-cream hover:bg-cream/10 transition-colors cursor-pointer"
      >
        <X size={13} />
      </button>
    </div>
  );
}
