import { ArrowRight } from "@phosphor-icons/react";

export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen bg-cream-paper flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <span className="step-badge mx-auto">
          <span className="step-badge-num">1</span>
          <span className="step-badge-label">AI README Generator</span>
        </span>
        <h1 className="mt-6 text-3xl font-medium text-ink">Caveman</h1>
        <p className="mt-2 text-sm text-graphite leading-relaxed">
          Sign in to generate production-ready READMEs from your GitHub repos.
        </p>
        <button
          onClick={onSignIn}
          className="mt-8 w-full h-11 text-sm font-medium bg-sunshine-highlight text-ink rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          Continue with Google <ArrowRight size={15} weight="bold" />
        </button>
      </div>
    </div>
  );
}
