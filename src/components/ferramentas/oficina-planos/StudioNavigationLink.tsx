"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

interface StudioNavigationLinkProps {
  href: string;
  label: string;
  pendingLabel: string;
  className: string;
  iconClassName?: string;
}

function StudioNavigationStatus({
  label,
  pendingLabel,
  forcePending,
  iconClassName,
}: {
  label: string;
  pendingLabel: string;
  forcePending: boolean;
  iconClassName: string;
}) {
  const { pending } = useLinkStatus();
  const isPending = forcePending || pending;

  return (
    <>
      <span className="relative inline-grid min-w-0 flex-1 place-items-center">
        <span className={isPending ? "invisible" : ""}>{label}</span>
        <span
          className={`absolute inset-0 flex items-center justify-center ${
            isPending ? "visible" : "invisible"
          }`}
          role="status"
          aria-live="polite"
        >
          {pendingLabel}
        </span>
      </span>
      <span className={`inline-flex shrink-0 items-center justify-center ${iconClassName}`}>
        {isPending ? (
          <Loader2 className="h-full w-full animate-spin" aria-hidden="true" />
        ) : (
          <ExternalLink className="h-full w-full" aria-hidden="true" />
        )}
      </span>
    </>
  );
}

export function StudioNavigationLink({
  href,
  label,
  pendingLabel,
  className,
  iconClassName = "h-3.5 w-3.5",
}: StudioNavigationLinkProps) {
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!isNavigating) return;

    const fallbackTimer = window.setTimeout(() => setIsNavigating(false), 12_000);
    return () => window.clearTimeout(fallbackTimer);
  }, [isNavigating]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isNavigating) {
      event.preventDefault();
      return;
    }

    // `onNavigate` only fires after Next has accepted the client transition.
    // Starting the visual state on the unmodified primary click keeps the
    // button responsive while a cold dynamic route is being prefetched or
    // compiled, without interfering with opening the link in a new tab.
    const isModifiedClick =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;

    if (!event.defaultPrevented && !isModifiedClick) {
      setIsNavigating(true);
    }
  };

  return (
    <Link
      href={href}
      data-navigation-feedback="off"
      onClick={handleClick}
      onNavigate={() => setIsNavigating(true)}
      aria-busy={isNavigating}
      aria-disabled={isNavigating}
      className={`${className} ${isNavigating ? "pointer-events-none opacity-75" : ""}`}
    >
      <StudioNavigationStatus
        label={label}
        pendingLabel={pendingLabel}
        forcePending={isNavigating}
        iconClassName={iconClassName}
      />
    </Link>
  );
}
