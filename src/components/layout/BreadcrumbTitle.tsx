"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

// Detail pages already load their record for the current session; they hand its friendly name to
// the breadcrumb here, so the breadcrumb never queries the database or shows an id from the URL.
type Entry = { path: string; title: string } | null;
let current: Entry = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function BreadcrumbTitle({ title }: { title: string }) {
  const pathname = usePathname();
  useEffect(() => {
    current = { path: pathname, title };
    notify();
    return () => { if (current?.path === pathname) { current = null; notify(); } };
  }, [pathname, title]);
  return null;
}

export function usePageTitle(pathname: string) {
  const entry = useSyncExternalStore(subscribe, () => current, () => null);
  return entry?.path === pathname ? entry.title : null;
}
