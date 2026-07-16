const logos = ["GitHub", "Vercel", "Supabase", "Linear", "Figma", "Stripe", "Railway", "PlanetScale", "Netlify", "Vite"];

export function TrustStrip() {
  const doubled = [...logos, ...logos];
  return (
    <section className="bg-cream-paper py-12 border-t border-ink">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="text-center text-xs font-medium text-graphite uppercase tracking-[0.286em]">
          Used by developers at
        </p>
        <div className="mt-6 overflow-hidden">
          <div className="flex gap-10 animate-marquee w-max items-center">
            {doubled.map((logo, i) => (
              <span key={`${logo}-${i}`} className="text-sm font-medium text-ink opacity-60 whitespace-nowrap">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
