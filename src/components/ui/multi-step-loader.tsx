import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CavemanMark } from "@/components/layout/Logo";
import { IconCheck as Check, IconPickaxe as Pickaxe } from "@/components/icons";

export type LoadingState = {
  text: string;
};

type MultiStepLoaderProps = {
  loadingStates: LoadingState[];
  loading: boolean;
  duration?: number;
  currentStep?: number;
};

export function MultiStepLoader({
  loadingStates,
  loading,
  duration = 2000,
  currentStep,
}: MultiStepLoaderProps) {
  const reducedMotion = useReducedMotion();
  const [internalStep, setInternalStep] = useState(0);
  const activeStep = Math.min(
    Math.max(currentStep ?? internalStep, 0),
    Math.max(loadingStates.length - 1, 0),
  );

  useEffect(() => {
    if (!loading) {
      setInternalStep(0);
      return;
    }

    if (currentStep !== undefined) return;

    const timeout = window.setTimeout(() => {
      setInternalStep((step) => Math.min(step + 1, loadingStates.length - 1));
    }, duration);

    return () => window.clearTimeout(timeout);
  }, [currentStep, duration, loading, loadingStates.length, internalStep]);

  if (!loading || loadingStates.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-paper px-6 py-10 sm:px-10"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-lg text-center">
        <div className="relative mx-auto flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56">
          <motion.div
            className="absolute inset-2 rounded-full border border-electric-iris/20"
            animate={reducedMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-electric-iris shadow-[0_0_0_5px_rgba(124,111,160,0.12)]" />
          </motion.div>
          <motion.div
            className="absolute inset-7 rounded-full border border-dashed border-ink/15"
            animate={reducedMotion ? undefined : { rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-12 rounded-full border border-electric-iris/20"
            animate={reducedMotion ? undefined : { scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border border-bone bg-cream shadow-[0_18px_50px_rgba(35,21,56,0.12)] sm:h-28 sm:w-28">
            <CavemanMark className="h-20 w-20" iconClassName="h-16 w-16" />
          </div>
          <motion.span
            className="absolute bottom-7 left-2 flex h-8 w-8 items-center justify-center rounded-full border border-electric-iris/25 bg-electric-iris/10 text-electric-iris"
            animate={reducedMotion ? undefined : { y: [0, -6, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Pickaxe size={14} />
          </motion.span>
        </div>

        <div className="mt-4 h-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-center gap-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-electric-iris opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-electric-iris" />
              </span>
              <p className="text-sm font-medium text-ink sm:text-base">
                {loadingStates[activeStep].text}
              </p>
            </motion.div>
          </AnimatePresence>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-ink/35">
            Building your README
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-sm rounded-lg border border-bone bg-cream/60 p-4 text-left">
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-bone/70">
            <motion.div
              className="h-full rounded-full bg-electric-iris"
              animate={{ width: `${((activeStep + 1) / loadingStates.length) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="space-y-2">
            {loadingStates.map((state, index) => {
              const complete = index < activeStep;
              const active = index === activeStep;

              return (
                <div key={state.text} className="flex items-center gap-2.5">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] ${complete ? "border-electric-iris bg-electric-iris text-white" : active ? "border-electric-iris text-electric-iris" : "border-bone text-ink/25"}`}
                  >
                    {complete ? <Check size={10} /> : index + 1}
                  </span>
                  <span
                    className={`text-[11px] ${active ? "font-medium text-ink" : complete ? "text-ink/55" : "text-ink/30"}`}
                  >
                    {state.text.replace("...", "")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
