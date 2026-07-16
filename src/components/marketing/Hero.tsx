import { useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "@phosphor-icons/react";

gsap.registerPlugin(ScrollTrigger);

const chartData = [
  { month: "Oct", value: 320 },
  { month: "Nov", value: 580 },
  { month: "Dec", value: 920 },
  { month: "Jan", value: 1450 },
  { month: "Feb", value: 2210 },
  { month: "Mar", value: 3480 },
  { month: "Apr", value: 5120 },
  { month: "May", value: 7480 },
  { month: "Jun", value: 10240 },
  { month: "Jul", value: 12470 },
];

const stats = [
  { value: 12470, suffix: "+", label: "READMEs generated" },
  { value: 528, suffix: "", label: "Happy developers" },
  { value: 99.9, suffix: "%", label: "Accuracy rate", decimals: 1 },
];

function AnimatedCounter({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el, { textContent: 0 }, {
      textContent: target,
      duration: 2,
      ease: "power3.out",
      snap: { textContent: 1 / Math.pow(10, decimals) },
      scrollTrigger: { trigger: el.closest("section"), start: "top 85%", once: true },
    });
  }, [target, decimals]);
  return <span ref={ref} className="font-dm-sans text-3xl font-medium text-ink">0</span>;
}

function BarChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const barRefs = useRef<(SVGRectElement | null)[]>([]);
  const labelRefs = useRef<(SVGTextElement | null)[]>([]);

  useEffect(() => {
    const bars = barRefs.current.filter(Boolean);
    const labels = labelRefs.current.filter(Boolean);
    if (!bars.length) return;

    gsap.fromTo(bars, { scaleY: 0, transformOrigin: "bottom" }, {
      scaleY: 1,
      duration: 1.2,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: { trigger: svgRef.current, start: "top 85%", once: true },
    });
    gsap.fromTo(labels, { opacity: 0, y: 8 }, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.08,
      delay: 0.3,
      scrollTrigger: { trigger: svgRef.current, start: "top 85%", once: true },
    });
  }, []);

  const maxVal = Math.max(...chartData.map((d) => d.value));
  const h = 240;
  const w = 560;
  const pad = { top: 16, right: 16, bottom: 32, left: 48 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const barW = chartW / chartData.length * 0.6;
  const gap = chartW / chartData.length;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {chartData.map((d, i) => {
        const x = pad.left + i * gap + (gap - barW) / 2;
        const barH = (d.value / maxVal) * chartH;
        const y = pad.top + chartH - barH;
        return (
          <g key={i}>
            <rect
              ref={(el) => { barRefs.current[i] = el; }}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              className="fill-ink"
            />
            <text
              ref={(el) => { labelRefs.current[i] = el; }}
              x={x + barW / 2}
              y={h - 8}
              textAnchor="middle"
              className="fill-graphite text-[10px] font-dm-sans"
            >
              {d.month}
            </text>
          </g>
        );
      })}
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + chartH} className="stroke-ink" strokeWidth={1} />
      <line x1={pad.left} y1={pad.top + chartH} x2={w - pad.right} y2={pad.top + chartH} className="stroke-ink" strokeWidth={1} />
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = pad.top + chartH - frac * chartH;
        const val = Math.round(frac * maxVal);
        return (
          <g key={frac}>
            <line x1={pad.left - 4} y1={y} x2={pad.left} y2={y} className="stroke-ink" strokeWidth={1} />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-graphite text-[10px] font-dm-sans">{val.toLocaleString()}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (textRef.current) {
        const children = textRef.current.children;
        gsap.set(children, { opacity: 0, y: 20 });
        tl.to(children, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-cream-paper">
      <div className="mx-auto max-w-[1200px] px-6 pt-20 pb-20">
        <div ref={textRef} className="mx-auto max-w-3xl text-center">
          <span className="step-badge mx-auto">
            <span className="step-badge-num">1</span>
            <span className="step-badge-label">AI README Generator</span>
          </span>

          <h1 className="mt-8 text-[clamp(40px,6vw,64px)] font-medium text-ink leading-[1.25] tracking-[var(--tracking-display)]">
            Documentation that
            <br />
            writes itself.
          </h1>

          <p className="mt-4 text-lg text-graphite max-w-[640px] mx-auto leading-relaxed">
            Drop your GitHub repository link or describe your project. Caveman analyzes your code,
            extracts every detail, and generates a production-ready README in seconds.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/generate"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-sunshine-highlight text-ink text-sm font-medium hover:opacity-90 transition-opacity gap-2"
            >
              Generate Your README <ArrowRight size={16} weight="bold" />
            </Link>
            <a
              href="/#how"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-ink text-ink text-sm font-medium hover:bg-ink hover:text-cream-paper transition-colors"
            >
              How It Works
            </a>
          </div>
        </div>

        <div className="mt-16 border-t border-b border-ink">
          <div className="grid grid-cols-3 divide-x divide-ink">
            {stats.map((s, i) => (
              <div key={i} className="py-6 px-4 text-center">
                <div className="flex items-baseline justify-center gap-0.5">
                  <AnimatedCounter target={s.value} suffix={s.suffix} decimals={s.decimals || 0} />
                  <span className="text-3xl font-medium text-ink">{s.suffix}</span>
                </div>
                <div className="mt-1 text-sm text-graphite">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 mx-auto max-w-[640px]">
          <div className="rounded-3xl border border-ink bg-cream-paper overflow-hidden">
            <div className="border-b border-ink px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-graphite font-medium">Monthly READMEs Generated</span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sunshine-highlight border border-ink" />
                <span className="text-[10px] text-graphite">+12,470 total</span>
              </div>
            </div>
            <div className="p-5">
              <BarChart />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
