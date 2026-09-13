// Lightweight in-memory snapshot of the last dashboard data the client rendered.
// Survives client-side navigations (not page reloads).
// Cleared on logout or after TTL_MS of inactivity.
//
// Purpose: when staleTimes cache misses (user was away > 30s), the dashboard
// page can show stale data immediately via useSnapshot() while new RSC data
// streams in, avoiding a blank loading skeleton.
//
// This is NOT a persistence layer — it's an optimistic UI hint only.
// If unused, it just sits empty and has zero cost.

const TTL_MS = 5 * 60 * 1000; // 5 minutes

type Snapshot = {
  tenant: string;
  data: Record<string, unknown>;
  capturedAt: number;
};

let snapshot: Snapshot | null = null;

export function saveDashboardSnapshot(tenant: string, data: Record<string, unknown>) {
  snapshot = { tenant, data, capturedAt: Date.now() };
}

export function getDashboardSnapshot(tenant: string): Snapshot["data"] | null {
  if (!snapshot) return null;
  if (snapshot.tenant !== tenant) return null;
  if (Date.now() - snapshot.capturedAt > TTL_MS) {
    snapshot = null;
    return null;
  }
  return snapshot.data;
}

export function clearDashboardSnapshot() {
  snapshot = null;
}
