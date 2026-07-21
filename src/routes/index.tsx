import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Features } from "@/components/marketing/Features";
import { Preview } from "@/components/marketing/Preview";
import { Testimonials } from "@/components/marketing/Testimonials";
import { FAQ } from "@/components/marketing/FAQ";
import { Comparison } from "@/components/marketing/Comparison";
import { FinalCTA } from "@/components/marketing/FinalCTA";

const siteUrl = "https://caveman-lilac.vercel.app";

const faqEntries = [
  {
    "@type": "Question",
    name: "How does Caveman work?",
    acceptedAnswer: { "@type": "Answer", text: "Paste your GitHub repository URL or type a short project description. Caveman analyzes your code structure, dependencies, and conventions, then generates a complete README.md with installation, usage, API docs, and more. The whole process takes under 90 seconds." },
  },
  {
    "@type": "Question",
    name: "Does Caveman support private repositories?",
    acceptedAnswer: { "@type": "Answer", text: "Yes. When you sign in with Google, Caveman can access your private repos. The analysis runs server-side and your code is never stored after the README is generated." },
  },
  {
    "@type": "Question",
    name: "How accurate is the generated README?",
    acceptedAnswer: { "@type": "Answer", text: "Caveman reads your actual code — package.json, imports, file tree, and comments. The output reflects your real dependencies, APIs, and project structure. The built-in Health Score checks for missing sections so nothing gets skipped." },
  },
  {
    "@type": "Question",
    name: "What languages and frameworks does Caveman support?",
    acceptedAnswer: { "@type": "Answer", text: "Any language or framework. Caveman detects your stack from your project files and tailors the README accordingly. Whether it is Python, TypeScript, Go, Rust, or something niche, the output matches your conventions." },
  },
  {
    "@type": "Question",
    name: "Is Caveman free to use?",
    acceptedAnswer: { "@type": "Answer", text: "Yes, Caveman is free during early access. Generate as many READMEs as you need. You only need a Google account to sign in." },
  },
  {
    "@type": "Question",
    name: "How is Caveman different from asking ChatGPT to write a README?",
    acceptedAnswer: { "@type": "Answer", text: "ChatGPT generates generic text based on what you type. Caveman reads your actual repository — your file tree, dependencies, and code — and produces a README that matches your project exactly. It also scores your README quality and fills gaps automatically." },
  },
  {
    "@type": "Question",
    name: "Can I edit the README before downloading?",
    acceptedAnswer: { "@type": "Answer", text: "Yes. Caveman gives you a full markdown editor after generation. Toggle preview mode, copy individual sections, or download the final file. Nothing is final until you ship it." },
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Caveman",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description: "Caveman is an AI README generator that turns your GitHub repo or project description into production-ready documentation.",
      url: siteUrl,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    { "@type": "FAQPage", mainEntity: faqEntries },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Caveman — AI README Generator" },
      { name: "description", content: "Generate production-ready READMEs from your GitHub repo. Caveman analyzes your code and writes docs your users will actually read." },
      { property: "og:title", content: "Caveman — AI README Generator" },
      { property: "og:description", content: "Generate production-ready READMEs from your GitHub repo. Caveman analyzes your code and writes docs your users will actually read." },
      { property: "og:url", content: siteUrl },
      { property: "og:image", content: `${siteUrl}/og-image.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Caveman — AI README Generator" },
      { name: "twitter:description", content: "Generate production-ready READMEs from your GitHub repo. Caveman analyzes your code and writes docs your users will actually read." },
      { name: "twitter:image", content: `${siteUrl}/og-image.png` },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: siteUrl }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-paper">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Preview />
        <Comparison />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
