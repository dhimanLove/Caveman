import { useState, useEffect } from "react";
import { Clock } from "@phosphor-icons/react";

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

export function CooldownTimer({ cooldownEnd }: { cooldownEnd: number }) {
  const [remaining, setRemaining] = useState(cooldownEnd - Date.now());

  useEffect(() => {
    const tick = () => setRemaining(cooldownEnd - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  if (remaining <= 0) return null;

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="w-12 h-12 rounded-[4px] bg-cream border border-bone flex items-center justify-center mb-4 mx-auto">
        <Clock size={20} className="text-ink" />
      </div>
      <h3 className="text-lg font-light text-ink">Daily limit reached</h3>
      <p className="mt-1.5 text-sm text-ink/60 max-w-xs leading-relaxed mx-auto">
        You've used all 10 generations for today. Your limit resets in:
      </p>
      <div className="mt-4 font-mono text-2xl font-medium text-ink tracking-wider">
        {formatDuration(remaining)}
      </div>
    </div>
  );
}
