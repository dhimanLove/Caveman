import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { auth } from "@/lib/firebase";
import { generateSecure } from "@/lib/generate.server";

interface GenerateInput {
  projectUrl?: string;
  description?: string;
  style?: "minimal" | "standard" | "comprehensive";
  sections?: string[];
  tone?: "technical" | "friendly" | "enterprise";
}

interface GenerateResult {
  readme: string;
  discovery?: any;
  remaining: number;
  cooldownEnd: number;
}

interface GenerateState {
  data: GenerateResult | null;
  error: string | null;
  cooldownExpiry: number;
  isPending: boolean;
}

export function useGenerate() {
  const fn = useServerFn(generateSecure);
  const [state, setState] = useState<GenerateState>({
    data: null,
    error: null,
    cooldownExpiry: 0,
    isPending: false,
  });

  const generate = useCallback(async (input: GenerateInput) => {
    setState((s) => ({ ...s, error: null, data: null, isPending: true }));

    try {
      if (!auth) throw new Error("Firebase Auth not initialized");
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");

      const token = await user.getIdToken();

      const result = await (fn as any)({
        data: {
          projectUrl: input.projectUrl || "",
          description: input.description || "",
          style: input.style || "standard",
          sections: input.sections || ["Installation", "Usage", "License"],
          tone: input.tone || "technical",
        },
      });

      setState({ data: result, error: null, cooldownExpiry: 0, isPending: false });
      return result;
    } catch (err: any) {
      let message = "Something went wrong. Please try again.";
      let cooldown = 0;

      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.cooldownEnd) {
            cooldown = parsed.cooldownEnd;
            message = "Daily limit reached";
          }
        } catch {
          if (err.message === "Unauthorized") {
            message = "Session expired. Please sign in again.";
          } else if (err.message === "Invalid input") {
            message = "Invalid input detected";
          } else {
            message = err.message;
          }
        }
      }

      setState({ data: null, error: message, cooldownExpiry: cooldown, isPending: false });
    }
  }, [fn]);

  const reset = useCallback(() => {
    setState({ data: null, error: null, cooldownExpiry: 0, isPending: false });
  }, []);

  return { ...state, generate, reset };
}
