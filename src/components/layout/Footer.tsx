import { GithubLogo, TwitterLogo, LinkedinLogo } from "@phosphor-icons/react";

const cols = [
  { title: "Product", links: ["Generator", "Features", "Pricing", "Changelog"] },
  { title: "Developers", links: ["Docs", "API", "GitHub", "CLI"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
];

export function Footer() {
  return (
    <footer className="bg-spruce-abyss text-spruce-200">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-pure-white" style={{ fontWeight: 600, fontSize: 15 }}>{c.title}</h4>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-spruce-200 hover:text-pure-white transition-colors" style={{ fontSize: 14 }}>
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-spruce-700 pt-6">
          <p className="text-spruce-200" style={{ fontSize: 13 }}>© {new Date().getFullYear()} Caveman. Drag. Drop. Document.</p>
          <div className="flex items-center gap-4 text-spruce-200">
            <a href="#" aria-label="GitHub"><GithubLogo size={20} /></a>
            <a href="#" aria-label="Twitter"><TwitterLogo size={20} /></a>
            <a href="#" aria-label="LinkedIn"><LinkedinLogo size={20} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
