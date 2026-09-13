export async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== "development") return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    console.log(`[perf] ${label}: ${duration.toFixed(1)}ms`);
  }
}

export function measureSync<T>(label: string, fn: () => T): T {
  if (process.env.NODE_ENV !== "development") return fn();
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    console.log(`[perf] ${label}: ${duration.toFixed(1)}ms`);
  }
}
