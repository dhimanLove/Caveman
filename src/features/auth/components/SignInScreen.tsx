import {
  IconArrowRight as ArrowRight,
  IconWarning as Warning,
  IconLock as LockSimple,
} from "@/shared/components/icons";
import { CavemanMark } from "@/shared/components/layout/Logo";

export function SignInScreen({ onSignIn, error }: { onSignIn: () => void; error?: string | null }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <CavemanMark className="w-12 h-12 mx-auto" iconClassName="w-7 h-7" />
        <h1 className="mt-4 text-2xl font-light text-ink">Caveman</h1>
        <p className="mt-1.5 text-sm text-fog leading-relaxed">
          Sign in to generate production-ready READMEs from your GitHub repos.
        </p>
        <button
          onClick={onSignIn}
          className="btn-primary w-full justify-center mt-8 h-11 text-sm gap-2"
        >
          Continue with Google <ArrowRight size={15} />
        </button>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-bone bg-paper p-3 text-left">
          <LockSimple size={13} className="shrink-0 mt-0.5 text-ink/60" />
          <span className="text-xs text-ink/60 leading-relaxed">
            Sign-in enables generation and tracks your limit (10 free per 10 hours during early
            access). Private repository scans require a configured GitHub access token.
          </span>
        </div>
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-err/30 p-3 text-err bg-err/5 text-left">
            <Warning size={13} className="shrink-0 mt-0.5" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
