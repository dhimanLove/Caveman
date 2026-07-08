const logos = ["GitHub", "Vercel", "Supabase", "Linear", "Figma", "Stripe", "Railway", "PlanetScale"];

export function TrustStrip() {
  const doubled = [...logos, ...logos];
  return (
    <section className="bg-cream-warm py-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="text-center text-spruce-mist" style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Trusted by developers at
        </p>
        <div className="mt-8 overflow-hidden">
          <div className="flex gap-6 animate-marquee w-max">
            {doubled.map((logo, i) => (
              <div
                key={`${logo}-${i}`}
                className="flex items-center justify-center rounded-sm bg-pure-white hairline"
                style={{ minWidth: 180, height: 72, borderRadius: 2 }}
              >
                <span className="text-spruce-900" style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.02em" }}>
                  {logo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
