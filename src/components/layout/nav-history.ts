/** In-app navigation history for the back button, kept per browser tab. It never calls
 * history.back(), so going back can only land on a TBB page, never on another site. */
export type HistoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const STACK = "tbb-nav-history";
const PENDING = "tbb-nav-back";
const LIMIT = 50;
const localPath = (value: unknown): value is string => typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\u0000-\u0020]/.test(value);

function read(storage: HistoryStorage): string[] {
  try {
    const value = JSON.parse(storage.getItem(STACK) || "[]");
    return Array.isArray(value) ? value.filter(localPath).slice(-LIMIT) : [];
  } catch { return []; }
}
const write = (storage: HistoryStorage, stack: string[]) => storage.setItem(STACK, JSON.stringify(stack.slice(-LIMIT)));

/** Called on every in-app navigation (path + query, so filters come back too). */
export function recordVisit(url: string, storage: HistoryStorage) {
  if (!localPath(url)) return;
  const stack = read(storage);
  if (storage.getItem(PENDING) === url) {
    storage.removeItem(PENDING);
    const index = stack.lastIndexOf(url);
    write(storage, index >= 0 ? stack.slice(0, index + 1) : [...stack, url]);
    return;
  }
  if (stack.at(-1) !== url) write(storage, [...stack, url]);
}

/** The page visited before `current` in this tab, or null when there is none (direct link,
 * new tab, first page after login): callers then fall back to the route's parent. */
export function backTarget(current: string, storage: HistoryStorage) {
  const stack = read(storage);
  const index = stack.lastIndexOf(current);
  const previous = index > 0 ? stack[index - 1] : null;
  if (previous) storage.setItem(PENDING, previous);
  return previous;
}
