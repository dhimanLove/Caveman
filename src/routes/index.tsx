import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/shared/components/layout/Navbar";
import { Footer } from "@/shared/components/layout/Footer";
import { Hero } from "@/features/marketing/components/Hero";
import { LogoStrip } from "@/features/marketing/components/LogoStrip";
import { SecondaryHero } from "@/features/marketing/components/SecondaryHero";
import { StatsStrip } from "@/features/marketing/components/StatsStrip";
import { HowItWorks } from "@/features/marketing/components/HowItWorks";
import { Features } from "@/features/marketing/components/Features";
import { Spotlight } from "@/features/marketing/components/Spotlight";
import { Preview } from "@/features/marketing/components/Preview";
import { Testimonials } from "@/features/marketing/components/Testimonials";
import { FAQ } from "@/features/marketing/components/FAQ";
import { Comparison } from "@/features/marketing/components/Comparison";
import { FinalCTA } from "@/features/marketing/components/FinalCTA";

const siteUrl = "https://caveman-lilac.vercel.app";

const faqEntries = [
  {
    "@type": "Question",
    name: "Does Caveman actually read my source code?",
    acceptedAnswer: {
      "@type": "Answer",
      text: "Yes. It fetches your file tree from GitHub, identifies entry points, and parses your source files. It reads components, APIs, config files, and dependencies to understand exactly what you built.",
    },
  },
  {
    "@type": "Question",
    name: "Do you support private repos?",
    acceptedAnswer: {
      "@type": "Answer",
      text: "Public GitHub repositories are supported. Private-repository access will require a future user-scoped GitHub authorization flow.",
    },
  },
  {
    "@type": "Question",
    name: "How is this different from a template generator?",
    acceptedAnswer: {
      "@type": "Answer",
      text: "Template generators simply fill in your project name. Caveman reads your actual architecture - dependencies, component structures, API routes - and generates each section from real context.",
    },
  },
  {
    "@type": "Question",
    name: "Is my code sent to third parties?",
    acceptedAnswer: {
      "@type": "Answer",
      text: "Only during generation: source code is sent to Groq, our AI inference provider, solely to produce your README. We do not store your source code or generated READMEs on our servers. The entire process is stateless.",
    },
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Caveman AI README Generator",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description:
        "An AI README generator that analyzes a GitHub repository's actual source code to create grounded, production-ready documentation.",
      url: siteUrl,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Organization", name: "Caveman" },
    },
    {
      "@type": "HowTo",
      name: "How to generate a README from a GitHub repository",
      description:
        "Caveman generates an accurate README by scanning your actual source code, detecting your stack, and writing every section from real context.",
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Paste your GitHub URL",
          text: "Paste any public GitHub repository URL, or describe your project in a sentence.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Choose your style",
          text: "Pick tone (Technical, Friendly, Enterprise), depth, and the 17+ sections you want included.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Get your README",
          text: "Caveman scans your file tree and writes a production-ready README within the configured generation window.",
        },
      ],
    },
    { "@type": "FAQPage", mainEntity: faqEntries },
    {
      "@type": "WebPage",
      name: "Caveman | The Smart AI README Generator for Developers",
      url: siteUrl,
      description:
        "Generate accurate, production-ready READMEs from your GitHub repo using deep semantic analysis.",
      speakable: { "@type": "SpeakableSpecification", cssSelector: [".caveman-answer"] },
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Caveman | The Smart AI README Generator for Developers" },
      {
        name: "description",
        content:
          "Generate accurate, production-ready READMEs from your GitHub repo. Caveman uses deep semantic analysis to write documentation your users will actually read.",
      },
      {
        name: "keywords",
        content:
          "AI README generator, GitHub documentation, auto generate README, developer tools, AI coding assistant, semantic code analysis",
      },
      { property: "og:title", content: "Caveman | The Smart AI README Generator" },
      {
        property: "og:description",
        content:
          "Generate accurate, production-ready READMEs from your GitHub repo using deep semantic analysis.",
      },
      { property: "og:url", content: siteUrl },
      { property: "og:image", content: `${siteUrl}/og-image.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Caveman | AI README Generator" },
      {
        name: "twitter:description",
        content:
          "Generate accurate, production-ready READMEs from your GitHub repo using deep semantic analysis.",
      },
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="overflow-hidden">
        <Hero />
        <LogoStrip />
        <SecondaryHero />
        <StatsStrip />
        <HowItWorks />
        <Features />
        <Spotlight />
        <Preview />
        <Comparison />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />

      {/* AEO / GEO answer block - rich, quotable, structured (Speakable) */}
      <div className="caveman-answer sr-only" aria-label="AI answer summary">
        Caveman is an AI README generator that turns any GitHub repository into production-ready
        documentation. Unlike template generators that only fill in a project name, Caveman
        deep-scans your actual source code - entry points, dependencies, API routes, and config
        files - to detect your framework, package manager, and architecture, then writes every
        section from real context. It supports 17+ customizable sections, technical to friendly
        tones, and is designed to finish within the configured generation window. Caveman is free
        during early access and requires a Google sign-in for generation. Public repositories work
        by default. Private repository scanning is not enabled because repository access must be bound to the requesting GitHub user.
      </div>
    </div>
  );
}
