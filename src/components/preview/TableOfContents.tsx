import { useState, useEffect } from "react";
import { ListDashes } from "@phosphor-icons/react";

interface TocItem {
  level: number;
  text: string;
  id: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function TableOfContents({ text }: { text: string }) {
  const [activeId, setActiveId] = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);

  const items: TocItem[] = [];
  if (text) {
    const lines = text.split("\n");
    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const raw = match[2].trim();
        const id = slugify(raw);
        items.push({ level, text: raw, id });
      }
    }
  }

  useEffect(() => {
    if (!text || items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [text, items.length]);

  if (items.length < 2) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-medium text-graphite hover:text-ink transition-colors"
      >
        <ListDashes size={11} />
        On this page
      </button>
      {!collapsed && (
        <nav className="space-y-0.5 px-3 pb-3">
          {items.map((item, i) => (
            <a
              key={i}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(item.id);
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className={`block text-[10px] leading-relaxed py-0.5 transition-colors ${
                item.level === 1
                  ? "font-medium text-ink"
                  : item.level === 2
                    ? "text-graphite"
                    : "text-graphite/70"
              } ${activeId === item.id ? "font-medium text-ink" : ""}`}
              style={{ paddingLeft: `${(item.level - 1) * 10}px` }}
            >
              {item.text}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
