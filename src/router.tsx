import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  if (!routeTree) {
    throw new Error("Route tree is empty. Run `npm run generate` to generate the route tree.");
  }

  try {
    const router = createRouter({
      routeTree,
      context: { queryClient },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0,
      defaultErrorComponent: ({ error }) => {
        console.error("[router] Unhandled error:", error);
        return (
          <div className="min-h-screen bg-cream flex items-center justify-center p-6">
            <div className="max-w-md text-center">
              <h1 className="text-xl font-medium text-ink mb-2">Something went wrong</h1>
              <p className="text-sm text-fog mb-4">
                {error instanceof Error ? error.message : "An unexpected error occurred."}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Reload page
              </button>
            </div>
          </div>
        );
      },
    });

    return router;
  } catch (err) {
    console.error("[router] Failed to create router:", err);
    throw new Error(
      `Router initialization failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
};
