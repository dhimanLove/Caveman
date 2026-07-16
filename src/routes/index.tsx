import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/marketing/Hero";
import { TrustStrip } from "@/components/marketing/TrustStrip";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Features } from "@/components/marketing/Features";
import { Preview } from "@/components/marketing/Preview";
import { Testimonials } from "@/components/marketing/Testimonials";
import { FinalCTA } from "@/components/marketing/FinalCTA";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Caveman?",
      acceptedAnswer: { "@type": "Answer", text: "Caveman is an AI-powered README generator that creates professional documentation from your GitHub repository URL or project description in seconds." },
    },
    {
      "@type": "Question",
      name: "How does the README generator work?",
      acceptedAnswer: { "@type": "Answer", text: "Paste your GitHub repository URL or describe your project. Caveman analyzes the project and generates a structured README.md with all relevant sections." },
    },
    {
      "@type": "Question",
      name: "Is Caveman free to use?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, Caveman offers a free tier with no account required." },
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Caveman" },
      { name: "description", content: "Generate professional README files in seconds. Paste a GitHub URL or describe your project — Caveman writes docs your users will actually read." },
      { property: "og:title", content: "Caveman — AI-Powered README Generator" },
      { property: "og:description", content: "Generate professional README files in seconds with AI." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd) }],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-paper">
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <Features />
        <Preview />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
