import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - Caveman" },
      {
        name: "description",
        content:
          "Caveman privacy policy. We do not sell your data. Repository contents are processed by Groq for generation and are not stored.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className="mx-auto max-w-[720px] px-6 py-20">
        <Link to="/" className="text-sm text-fog hover:opacity-60 transition-opacity">
          &larr; Back to home
        </Link>
        <h1 className="mt-8 text-[32px] font-light text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm text-fog">Last updated: August 2026</p>
        <div className="mt-10 space-y-6 text-sm text-fog leading-relaxed">
          <p>
            This Privacy Policy explains what information Caveman ("we", "our") collects when you
            use our README generation service, how we use it, and the rights you have under the EU
            General Data Protection Regulation (GDPR) and the California Consumer Privacy Act
            (CCPA/CPRA).
          </p>

          <h2 className="text-lg font-light text-ink">Information We Collect</h2>
          <p>
            <strong className="text-ink">Account data.</strong> If you sign in with Google, we
            receive your email address and display name. We use this only for authentication,
            rate-limiting, and account management. We never post to or otherwise modify your Google
            or GitHub accounts.
          </p>
          <p>
            <strong className="text-ink">Generation inputs.</strong> When you generate a README, we
            temporarily receive a repository URL or project description, plus a subset of your
            repository's source files (up to 25 files, up to 5,000 characters each) needed to write
            the README.
          </p>

          <h2 className="text-lg font-light text-ink">Third-Party AI Processing</h2>
          <p>
            To generate READMEs, the repository content described above is transmitted to{" "}
            <strong className="text-ink">Groq</strong> (a third-party AI inference provider) via
            their API. Groq processes the content only to produce the generated README text.
          </p>
          <p>
            We do not permanently store, train on, or share your repository contents. We do not use
            your code to improve third-party models. The AI provider's handling of data is governed
            by its own privacy policy, but we only send the minimal content required for a single
            generation and receive the generated text back immediately.
          </p>

          <h2 className="text-lg font-light text-ink">Cookies and Local Storage</h2>
          <p>
            Caveman uses your browser's local storage to persist your authentication session and
            in-progress README drafts locally on your device. We do not use advertising cookies and
            we do not sell or share your personal data with advertisers.
          </p>

          <h2 className="text-lg font-light text-ink">Analytics</h2>
          <p>
            We collect aggregated, non-identifying usage metrics (page views, feature usage,
            timestamps) to understand how the product is used and to prevent abuse. Aggregated logs
            are retained for up to 30 days and are not sold.
          </p>

          <h2 className="text-lg font-light text-ink">Data Retention</h2>
          <p>
            Generated READMEs are not stored on our servers beyond the duration of the generation
            session. Local drafts in your browser remain until you clear them.
          </p>

          <h2 className="text-lg font-light text-ink">Data Transfers</h2>
          <p>
            We operate on cloud infrastructure and our AI provider (Groq) may process data on
            servers located outside your country of residence. Where applicable, we rely on
            appropriate safeguards, such as the EU Standard Contractual Clauses or the provider's
            adequacy certifications, for such international transfers.
          </p>

          <h2 className="text-lg font-light text-ink">Your Rights (GDPR/CCPA/CPRA)</h2>
          <p>
            You have the right to access, correct, and delete the personal data we hold about you, to
            object to or restrict certain processing, and to data portability. California residents
            have the right to know what personal information we collect and to opt out of any "sale"
            or "sharing" of personal information - we do not sell or share your personal data. To
            exercise any of these rights, email{" "}
            <a href="mailto:hello@caveman.dev" className="text-ink underline">
              hello@caveman.dev
            </a>{" "}
            and we will respond within 30 days.
          </p>

          <h2 className="text-lg font-light text-ink">Children's Privacy</h2>
          <p>
            Caveman is not directed at children under 13 and we do not knowingly collect personal
            information from children. If you believe a child has provided us personal information,
            contact us and we will delete it.
          </p>

          <h2 className="text-lg font-light text-ink">Security</h2>
          <p>
            We use encryption in transit (HTTPS) for all traffic to and from our servers. Access to
            any stored account data is restricted to authorized personnel and used only for support
            and abuse prevention.
          </p>

          <h2 className="text-lg font-light text-ink">Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be reflected by a new
            "Last updated" date above. Continued use of the service after changes constitutes
            acceptance of the updated policy.
          </p>

          <h2 className="text-lg font-light text-ink">Contact</h2>
          <p>
            Questions about this policy or your data? Email{" "}
            <a href="mailto:hello@caveman.dev" className="text-ink underline">
              hello@caveman.dev
            </a>
            .
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}