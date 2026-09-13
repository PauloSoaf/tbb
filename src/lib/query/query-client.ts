import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 5 minutes stale time — matches server-side staleTimes.
        // Data is reused across navigations; revalidated in background after 5min.
        staleTime: 5 * 60 * 1000,
        // Keep data in memory for 30 minutes after component unmounts.
        gcTime: 30 * 60 * 1000,
        // Don't refetch when window regains focus — Server Actions handle mutations.
        refetchOnWindowFocus: false,
        // Do refetch on reconnect — safeguard for users who go offline briefly.
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });
}

// Singleton for browser; new instance per request on server.
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
