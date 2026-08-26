import { useServerFn } from "@tanstack/react-start";
import { fetchCommitGraph } from "@/lib/graph.functions";

export function useGraph() {
  return useServerFn(fetchCommitGraph);
}
