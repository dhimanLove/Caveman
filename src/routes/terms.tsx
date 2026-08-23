import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service - Caveman" },
      { name: "description", content: "Caveman terms of service." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className="mx-auto max-w-[720px] px-6 py-20">
        <Link to="/" className="text-sm text-fog hover:opacity-60 transition-opacity">
          &larr; Back to home
        </Link>
        <h1 className="mt-8 text-[32px] font-light text-ink">Terms of Service</h1>
        <p className="mt-2 text-sm text-fog">Last updated: August 2026</p>
        <div className="mt-10 space-y-6 text-sm text-fog leading-relaxed">
          <p>By using Caveman, you agree to these Terms of Service ("Terms").</p>

          <h2 className="text-lg font-light text-ink">Use of Service</h2>
          <p>
            Caveman provides an AI-powered README generation tool. You may use it for personal and
            commercial projects. You must be at least 13 years old to use the service. You are
            responsible for reviewing and editing generated content before publication.
          </p>

          <h2 className="text-lg font-light text-ink">Intellectual Property</h2>
          <p>
            <strong className="text-ink">Your content stays yours.</strong> You retain all rights to
            your uploaded repository content and the READMEs you generate. By using the service, you
            grant us a limited, non-exclusive license to process that content solely to provide and
            improve the generation feature, as described in our Privacy Policy. We do not claim
            ownership of your code or generated READMEs.
          </p>
          <p>
            The Caveman name, logo, and site design are our property and may not be reproduced
            without permission.
          </p>

          <h2 className="text-lg font-light text-ink">Prohibited Use</h2>
          <p>
            You agree not to use Caveman to generate content that (a) violates any law or third-party
            right, (b) contains malicious code, secrets, or credentials you are not authorized to
            process, (c) is abusive or infringing, or (d) attempts to disrupt, probe, or circumvent
            the security or rate limits of the service.
          </p>

          <h2 className="text-lg font-light text-ink">Rate Limits and Abuse</h2>
          <p>
            We enforce daily per-account usage limits to keep the service reliable for everyone.
            Attempting to bypass these limits, create accounts to evade them, or otherwise abuse the
            service may result in throttling or termination of access.
          </p>

          <h2 className="text-lg font-light text-ink">Disclaimer of Warranties</h2>
          <p>
            Caveman is provided "as is" and "as available", without warranties of any kind, express
            or implied. We do not guarantee that generated READMEs are accurate, complete, secure, or
            error-free. You are solely responsible for the accuracy and quality of content you
            publish.
          </p>

          <h2 className="text-lg font-light text-ink">Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Caveman and its operators shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages, or for lost
            profits, data, or goodwill, arising out of or related to your use of the service. Our
            total aggregate liability for any claim relating to the service shall not exceed the
            amount you paid us (if any) in the twelve months preceding the claim.
          </p>

          <h2 className="text-lg font-light text-ink">Governing Law and Disputes</h2>
          <p>
            These Terms are governed by the laws of the State of California, without regard to
            conflict-of-law principles. Any dispute arising under these Terms will be resolved in the
            courts located in San Francisco, California. This does not limit any consumer protection
            rights you may have under the laws of your country of residence, including rights under
            the EU GDPR or the California Consumer Privacy Act.
          </p>

          <h2 className="text-lg font-light text-ink">Termination</h2>
          <p>
            We may suspend or terminate your access for violation of these Terms or abuse of the
            service, at our discretion and without notice. Sections that by their nature should
            survive termination (including IP, warranty disclaimers, and liability limits) will
            survive.
          </p>

          <h2 className="text-lg font-light text-ink">Changes</h2>
          <p>
            We may update these Terms at any time. Continued use of the service after changes are
            posted constitutes acceptance of the new Terms.
          </p>

          <h2 className="text-lg font-light text-ink">Contact</h2>
          <p>
            Questions? Email{" "}
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