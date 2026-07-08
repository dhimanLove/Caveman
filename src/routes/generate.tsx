import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Link, FileText, CheckCircle, Warning, TreeStructure } from "@phosphor-icons/react";

import { generateReadme } from "@/lib/readme.functions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "Generate a README — Caveman" },
      { name: "description", content: "Paste a GitHub URL or describe your project. Caveman generates a polished README.md in seconds." },
    ],
  }),
  component: GeneratePage,
});

type Style = "minimal" | "standard" | "comprehensive";
type Tone = "technical" | "friendly" | "enterprise";
type Tab = "url" | "describe";

const ALL_SECTIONS = [
  "Installation", "Usage", "API Docs", "Contributing", 
  "License", "Badges", "Screenshots", "Roadmap", "Tech Stack", "Folder Structure"
];

function GeneratePage() {
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<Style>("standard");
  const [tone, setTone] = useState<Tone>("technical");
  const [sections, setSections] = useState<string[]>([
    "Installation", "Usage", "Tech Stack", "Folder Structure", "License"
  ]);
  const [view, setView] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);

  const generateFn = useServerFn(generateReadme);
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof generateFn>[0]) => generateFn(input),
  });

  const toggleSection = (s: string) => {
    setSections((cur) => 
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  };

  const onGenerate = () => {
    if (tab === "url" && !url.includes("github.com")) return;
    mutation.mutate({
      data: { 
        projectUrl: tab === "url" ? url : "", 
        description: tab === "describe" ? description : "", 
        style, 
        sections, 
        tone 
      },
    });
  };

  const readme = mutation.data?.readme ?? "";

  const onCopy = async () => {
    if (!readme) return;
    await navigator.clipboard.writeText(readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onDownload = () => {
    if (!readme) return;
    const blob = new Blob([readme], { type: "text/markdown" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "README.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="h-screen w-screen bg-[#f4f3ef] p-4 lg:p-6 overflow-hidden flex flex-col font-sans antialiased">
      <div className="w-full max-w-[1600px] mx-auto h-full grid lg:grid-cols-[400px_1fr] gap-6 overflow-hidden">
        
        {/* Left Control Panel */}
        <div className="bg-white rounded-2xl border border-[#e2e0d9] p-6 flex flex-col justify-between shadow-sm overflow-y-auto h-full space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#1c1c1a] tracking-tight">README Dashboard</h2>
              <p className="text-xs text-zinc-500 mt-1">Configure your extraction matrices and layouts.</p>
            </div>

            {/* Target Input Type Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Repository Target</label>
              <div className="flex bg-[#f4f3ef] p-1 rounded-xl border border-[#e2e0d9]">
                {(["url", "describe"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                      tab === t 
                        ? "bg-white text-zinc-900 shadow-sm border border-zinc-200" 
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {t === "url" ? "GitHub URL" : "Project Context"}
                  </button>
                ))}
              </div>
              
              <div className="mt-2 transition-all duration-200">
                {tab === "url" ? (
                  <div className="relative">
                    <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      className="pl-9 bg-white border-[#e2e0d9] rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all text-sm h-11"
                    />
                  </div>
                ) : (
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide architecture notes, framework details, or design instructions..."
                    className="min-h-[110px] bg-white border-[#e2e0d9] rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all text-sm resize-none"
                  />
                )}
              </div>
            </div>

            {/* Layout Density Segmented Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Layout Density</label>
              <div className="flex bg-[#f4f3ef] p-1 rounded-xl border border-[#e2e0d9]">
                {(["minimal", "standard", "comprehensive"] as Style[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition-all duration-200 ${
                      style === s 
                        ? "bg-white text-emerald-700 shadow-sm border border-emerald-100" 
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Section Checklist Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Target Sections</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SECTIONS.map((s) => {
                  const active = sections.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSection(s)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-left text-xs font-medium transition-all duration-150 ${
                        active 
                          ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 shadow-sm" 
                          : "bg-white border-[#e2e0d9] text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${
                        active ? "bg-emerald-600 border-emerald-600 text-white" : "border-zinc-300 bg-white"
                      }`}>
                        {active && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <span className="truncate">{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tone Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Tone Matrix</label>
              <Select value={tone} onValueChange={(val) => setTone(val as Tone)}>
                <SelectTrigger className="w-full h-11 bg-white border-[#e2e0d9] rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#e2e0d9] rounded-xl">
                  <SelectItem value="technical">Technical Documentation</SelectItem>
                  <SelectItem value="friendly">User Friendly / Open Source</SelectItem>
                  <SelectItem value="enterprise">Enterprise Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Trigger Block */}
          <div className="pt-4 border-t border-zinc-100">
            <Button
              onClick={onGenerate}
              disabled={mutation.isPending || (tab === "url" ? !url : !description)}
              className="w-full h-12 text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 shadow-sm rounded-xl transition-all duration-150 active:scale-[0.98]"
            >
              {mutation.isPending ? "Parsing Engine Matrix..." : "Deep Scan & Engine Run →"}
            </Button>

            {mutation.isError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-red-800">
                <Warning size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span className="text-xs font-medium">{(mutation.error as Error).message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Output Display Panel */}
        <div className="bg-white rounded-2xl border border-[#e2e0d9] flex flex-col shadow-sm overflow-hidden h-full">
          
          {/* Header Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-white z-10 shrink-0">
            <div className="flex items-center gap-2 text-zinc-800 font-bold text-xs tracking-wider uppercase">
              <FileText size={16} className="text-zinc-500" />
              <span>Output / README.md</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Custom High-Fidelity Inline Switch Component */}
              <div className="flex items-center gap-2 border-r border-zinc-200 pr-4">
                <span className={`text-xs font-bold transition-colors ${view === "preview" ? "text-emerald-700" : "text-zinc-400"}`}>Preview</span>
                <button
                  type="button"
                  onClick={() => setView(view === "preview" ? "raw" : "preview")}
                  className="w-10 h-6 flex items-center bg-zinc-200 rounded-full p-1 cursor-pointer transition-colors duration-200 focus:outline-none"
                  style={{ backgroundColor: view === "raw" ? "#10b981" : "#e4e4e7" }}
                >
                  <div
                    className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200"
                    style={{ transform: view === "raw" ? "translateX(16px)" : "translateX(0px)" }}
                  />
                </button>
                <span className={`text-xs font-bold transition-colors ${view === "raw" ? "text-emerald-700" : "text-zinc-400"}`}>Raw</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onCopy} 
                  disabled={!readme} 
                  className={`h-9 text-xs font-semibold rounded-lg border-zinc-200 transition-all ${
                    copied ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "hover:bg-zinc-50"
                  }`}
                >
                  {copied ? "✓ Copied" : "Copy Source"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onDownload} 
                  disabled={!readme} 
                  className="h-9 text-xs font-semibold rounded-lg border-zinc-200 hover:bg-zinc-50 transition-all"
                >
                  Download File
                </Button>
              </div>
            </div>
          </div>

          {/* Scrolling Content Dynamic Sub-view */}
          <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-zinc-50/50">
            {mutation.isPending ? (
              <div className="max-w-2xl mx-auto space-y-4 pt-4">
                {[90, 70, 95, 55, 80, 85, 65].map((w, i) => (
                  <div key={i} className="h-4 bg-zinc-200/70 rounded-md animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : readme ? (
              <div className="max-w-3xl mx-auto bg-white rounded-xl border border-zinc-200/80 p-6 lg:p-8 shadow-sm">
                {view === "preview" ? (
                  <MarkdownRender text={readme} />
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs bg-zinc-900 text-zinc-100 p-6 rounded-xl leading-relaxed overflow-x-auto shadow-inner">
                    {readme}
                  </pre>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center border border-zinc-200 shadow-inner mb-4">
                  <TreeStructure size={32} className="text-zinc-400" />
                </div>
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Engine Pipeline Idle</h3>
                <p className="mt-1.5 text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Enter parameters and configure extraction fields to activate the deep scan renderer.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownRender({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      
      const isTree = lang === "text" || buf.some(l => l.includes("├──") || l.includes("└──"));

      out.push(
        <pre key={key++} className={`my-5 p-4 font-mono text-xs overflow-x-auto border rounded-xl shadow-sm ${
          isTree ? "bg-zinc-50 text-zinc-800 border-zinc-200" : "bg-zinc-900 text-zinc-100 border-zinc-800"
        }`}>
          {lang && <div className="mb-2 opacity-40 uppercase tracking-widest text-[9px] font-bold">{lang}</div>}
          <code>{buf.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.startsWith("|")) {
      const headerLine = line;
      const delimiterLine = lines[i + 1];
      if (delimiterLine && delimiterLine.includes("|") && delimiterLine.includes("-")) {
        const rows: string[][] = [];
        const headers = headerLine.split("|").map(h => h.trim()).filter(h => h !== "");
        i += 2;
        
        while (i < lines.length && lines[i].startsWith("|")) {
          rows.push(lines[i].split("|").map(r => r.trim()).filter(r => r !== ""));
          i++;
        }

        out.push(
          <div key={key++} className="my-5 overflow-x-auto border border-zinc-200 rounded-xl shadow-sm bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  {headers.map((h, idx) => <th key={idx} className="p-3 font-semibold text-zinc-700">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-zinc-50/50">
                    {row.map((cell, cIdx) => <td key={cIdx} className="p-3 text-zinc-600">{inline(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    if (line.startsWith("> ")) {
      out.push(
        <blockquote key={key++} className="my-4 pl-4 border-l-4 border-emerald-500 bg-emerald-50/40 p-3.5 text-sm italic text-emerald-900 rounded-r-xl">
          {inline(line.slice(2))}
        </blockquote>
      );
      i++; continue;
    }

    if (line.startsWith("# ")) {
      out.push(<h1 key={key++} className="mt-8 mb-4 text-2xl font-bold tracking-tight text-zinc-900 border-b border-zinc-100 pb-2">{inline(line.slice(2))}</h1>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      out.push(<h2 key={key++} className="mt-7 mb-3 text-lg font-bold tracking-tight text-zinc-800 flex items-center gap-2">{inline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      out.push(<h3 key={key++} className="mt-5 mb-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">{inline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <ul key={key++} className="my-3 ml-5 list-disc space-y-1.5 text-sm text-zinc-600">
          {items.map((it, idx) => <li key={idx}>{inline(it)}</li>)}
        </ul>
      );
      continue;
    }
    if (line.trim() === "") {
      i++; continue;
    }
    out.push(<p key={key++} className="my-3 text-sm text-zinc-600 leading-relaxed">{inline(line)}</p>);
    i++;
  }
  return <div>{out}</div>;
}

function inline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      nodes.push(<strong key={k++} className="font-bold text-zinc-900">{tok.slice(2, -2)}</strong>);
    } else {
      nodes.push(
        <code key={k++} className="bg-zinc-100 px-1.5 py-0.5 font-mono text-xs border border-zinc-200 text-emerald-800 rounded-md">
          {tok.slice(1, -1)}
        </code>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}