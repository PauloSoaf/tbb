"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * React clears uncontrolled fields after every form action, even one the server refused. Wrapping a form here cancels that
 * native reset, so a refused request keeps what the person typed. Remount the form (a `key`) to show freshly saved values.
 */
export function KeepFormValues({ children, className }: { children: ReactNode; className?: string }) {
  const scope = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scope.current;
    const keep = (event: Event) => event.preventDefault();
    element?.addEventListener("reset", keep);
    return () => element?.removeEventListener("reset", keep);
  }, []);
  return <div ref={scope} className={className}>{children}</div>;
}
