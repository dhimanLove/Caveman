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

MIT -- do whatever, but say thanks.`;

export function Preview() {
  return (
    <section className="bg-cream-paper py-16 border-t border-ink">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-xl">
          <h2 className="text-[28px] font-medium text-ink leading-[1.25]">
            See the output in real time
          </h2>
          <p className="mt-2 text-lg text-graphite max-w-lg leading-relaxed">
            Caveman drafts your docs, section by section. No spinners, no delay.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-ink bg-cream-paper overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-ink px-4 py-3">
            <span className="w-2.5 h-2.5 rounded-full border border-ink" />
            <span className="w-2.5 h-2.5 rounded-full border border-ink" />
            <span className="w-2.5 h-2.5 rounded-full border border-ink" />
            <span className="ml-3 text-xs text-graphite">README.md</span>
          </div>
          <pre className="whitespace-pre-wrap p-8 font-mono text-sm text-ink leading-relaxed" style={{ minHeight: 340 }}>
            {script}
          </pre>
        </div>
      </div>
    </section>
  );
}
