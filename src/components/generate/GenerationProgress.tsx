import { MultiStepLoader } from "@/components/ui/multi-step-loader";

type GenerationProgressProps = {
  stepIndex: number;
  steps: string[];
};

export function GenerationProgress({ stepIndex, steps }: GenerationProgressProps) {
  return (
    <MultiStepLoader
      loading
      currentStep={stepIndex}
      duration={2000}
      loadingStates={steps.map((text) => ({ text }))}
    />
  );
}
