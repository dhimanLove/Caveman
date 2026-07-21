import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Caveman" },
      { name: "description", content: "Caveman privacy policy." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream-paper">
      <div className="mx-auto max-w-[720px] px-6 py-20">
        <Link to="/" className="text-sm text-graphite hover:text-ink transition-colors">&larr; Back to home</Link>
        <h1 className="mt-8 text-[32px] font-medium text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm text-graphite">Last updated: July 2026</p>
        <div className="mt-10 space-y-6 text-sm text-graphite leading-relaxed">
          <p>
            Caveman generates README files using AI. We do not sell or share your personal data with third parties.
          </p>
          <h2 className="text-lg font-medium text-ink">What We Collect</h2>
          <p>When you use the /generate page, we temporarily process your repository URL or project description to generate a README. We do not permanently store your repository contents.</p>
          <p>If you sign in with Google, we receive your email address and display name for rate-limiting and account management.</p>
          <h2 className="text-lg font-medium text-ink">Data Retention</h2>
          <p>Generated READMEs are not stored on our servers beyond the duration of the generation session. Usage logs (timestamps, feature usage) are retained for up to 30 days for analytics and abuse prevention.</p>
          <h2 className="text-lg font-medium text-ink">Contact</h2>
          <p>Questions? Email <a href="mailto:hello@caveman.dev" className="text-ink underline">hello@caveman.dev</a>.</p>
        </div>
      </div>
    </div>
  );
}
