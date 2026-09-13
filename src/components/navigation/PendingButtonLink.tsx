"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PendingButtonLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode;
  pendingLabel?: ReactNode;
  spinnerClassName?: string;
};

function PendingButtonContent({
  children,
  pendingLabel,
  forcePending,
  spinnerClassName,
}: Pick<PendingButtonLinkProps, "children" | "pendingLabel" | "spinnerClassName"> & { forcePending: boolean }) {
  const { pending } = useLinkStatus();
  const busy = forcePending || pending;

  return (
    <>
      <span className={cn("contents", busy && "invisible")} aria-hidden={busy || undefined}>
        {children}
      </span>
      {busy && (
        <span
          className="absolute inset-0 flex items-center justify-center gap-2"
          role="status"
          aria-live="polite"
        >
          <Loader2 className={cn("h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none", spinnerClassName)} aria-hidden="true" />
          {pendingLabel === null
            ? <span className="sr-only">Carregando...</span>
            : <span>{pendingLabel ?? "Carregando..."}</span>}
        </span>
      )}
    </>
  );
}

export function PendingButtonLink({
  children,
  pendingLabel,
  spinnerClassName,
  className,
  onClick,
  onNavigate,
  target,
  ...props
}: PendingButtonLinkProps) {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const navigationInFlightRef = useRef(false);
  const shouldTrackNavigationRef = useRef(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    navigationInFlightRef.current = false;
    shouldTrackNavigationRef.current = false;
    const frame = window.requestAnimationFrame(() => setNavigating(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!navigating) return;
    const timeout = window.setTimeout(() => {
      navigationInFlightRef.current = false;
      shouldTrackNavigationRef.current = false;
      setNavigating(false);
    }, 15_000);
    return () => window.clearTimeout(timeout);
  }, [navigating]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (navigationInFlightRef.current) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
    shouldTrackNavigationRef.current = false;
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || (event.currentTarget.target && event.currentTarget.target.toLowerCase() !== "_self")
    ) {
      return;
    }

    const current = new URL(window.location.href);
    const destination = new URL(event.currentTarget.href, current);
    // Query/hash-only transitions are already represented by useLinkStatus.
    // Force-pending is reserved for pathname changes, whose completion we can
    // observe without making every consumer depend on useSearchParams/Suspense.
    if (destination.pathname === current.pathname) return;

    shouldTrackNavigationRef.current = true;
    navigationInFlightRef.current = true;
    setNavigating(true);
  };

  return (
    <Link
      {...props}
      target={target}
      data-navigation-feedback="off"
      className={cn("relative", className, navigating && "pointer-events-none cursor-wait opacity-75")}
      aria-busy={navigating || undefined}
      aria-disabled={navigating || undefined}
      onClick={handleClick}
      onNavigate={(event) => {
        let cancelled = false;
        onNavigate?.({
          preventDefault() {
            cancelled = true;
            event.preventDefault();
          },
        });
        if (cancelled) {
          navigationInFlightRef.current = false;
          shouldTrackNavigationRef.current = false;
          setNavigating(false);
          return;
        }
        if (shouldTrackNavigationRef.current) setNavigating(true);
      }}
    >
      <PendingButtonContent
        forcePending={navigating}
        pendingLabel={pendingLabel}
        spinnerClassName={spinnerClassName}
      >
        {children}
      </PendingButtonContent>
    </Link>
  );
}
