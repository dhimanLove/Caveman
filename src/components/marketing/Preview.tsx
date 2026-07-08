import { useEffect, useRef } from "react";

const script = `# neon-cache

A Redis-compatible edge cache for serverless.

## Why

Cold starts kill latency. **neon-cache** keeps a warm KV close to your users, wherever they are.

## Install

\`\`\`bash
npm install neon-cache
\`\`\`

## Usage

\`\`\`ts
import { cache } from "neon-cache";

const user = await cache.get("user:42", async () => fetchUser(42));
\`\`\`

## License

MIT — do whatever, but say thanks.`;

export function Preview() {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = script;
      return;
    }

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const type = () => {
      el.textContent = script.slice(0, i);
      i += 2;
      if (i > script.length + 40) {
        i = 0;
      }
      timer = setTimeout(type, i > script.length ? 40 : 24);
    };
    type();
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-24" style={{ background: "#eafde8" }}>
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <h2 className="text-spruce-900" style={{ fontSize: "clamp(32px, 4vw, 40px)", lineHeight: 1.13, fontWeight: 475 }}>
            See it happen in <span style={{ color: "#123a88" }}>real time</span>
          </h2>
          <p className="mt-4 text-spruce-mist" style={{ fontSize: 18 }}>
            Watch Caveman draft your docs, section by section. No spinners, no delay.
          </p>
        </div>

        <div className="mt-12 rounded-sm bg-pure-white hairline overflow-hidden" style={{ borderRadius: 2 }}>
          <div className="flex items-center gap-1.5 border-b border-charcoal-100 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ebebeb" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ebebeb" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ebebeb" }} />
            <span className="ml-3 text-spruce-mist font-mono" style={{ fontSize: 12 }}>README.md · draft</span>
          </div>
          <pre
            ref={ref}
            className="whitespace-pre-wrap p-8 font-mono text-spruce-900"
            style={{ fontSize: 14, lineHeight: 1.6, minHeight: 380 }}
          />
        </div>
      </div>
    </section>
  );
}
