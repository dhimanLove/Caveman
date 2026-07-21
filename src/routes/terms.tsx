import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Caveman" },
      { name: "description", content: "Caveman terms of service." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-cream-paper">
      <div className="mx-auto max-w-[720px] px-6 py-20">
        <Link to="/" className="text-sm text-graphite hover:text-ink transition-colors">&larr; Back to home</Link>
        <h1 className="mt-8 text-[32px] font-medium text-ink">Terms of Service</h1>
        <p className="mt-2 text-sm text-graphite">Last updated: July 2026</p>
        <div className="mt-10 space-y-6 text-sm text-graphite leading-relaxed">
          <p>By using Caveman, you agree to these terms.</p>
          <h2 className="text-lg font-medium text-ink">Use of Service</h2>
          <p>Caveman provides an AI-powered README generation tool. You may use it for personal and commercial projects. You are responsible for reviewing and editing generated content before publication.</p>
          <h2 className="text-lg font-medium text-ink">Limitations</h2>
          <p>We do not guarantee that generated READMEs are accurate, complete, or error-free. Caveman is provided "as is" without warranties of any kind.</p>
          <h2 className="text-lg font-medium text-ink">Changes</h2>
          <p>We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          <h2 className="text-lg font-medium text-ink">Contact</h2>
          <p>Questions? Email <a href="mailto:hello@caveman.dev" className="text-ink underline">hello@caveman.dev</a>.</p>
        </div>
      </div>
    </div>
  );
}
