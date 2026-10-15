"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

const changedEvent = "tbb-local-storage-changed";
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(changedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changedEvent, onChange);
  };
}

// The server snapshot also runs during hydration. Stored browser preferences are read afterwards.
export function useLocalStorageString(key: string, fallback: string) {
  const [temporary, setTemporary] = useState<{ key: string; value: string } | null>(null);
  const read = useCallback(() => {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  }, [key, fallback]);
  const stored = useSyncExternalStore(subscribe, read, () => fallback);
  const write = useCallback((value: string) => {
    try {
      localStorage.setItem(key, value);
      setTemporary(null);
      window.dispatchEvent(new Event(changedEvent));
    } catch {
      // Preferences still work for the current component if the browser blocks storage.
      setTemporary({ key, value });
    }
  }, [key]);
  return [temporary?.key === key ? temporary.value : stored, write] as const;
}
