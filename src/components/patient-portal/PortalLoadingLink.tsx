"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";

export function PortalLoadingLink({
  href,
  children,
  className = "",
  onClick,
  target,
  rel,
  ariaLabel,
  title,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  target?: string;
  rel?: string;
  ariaLabel?: string;
  title?: string;
}) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 0);
    return () => window.clearTimeout(timeout);
  }, [href, pathname, searchParams]);

  useEffect(() => {
    if (!loading) return;
    const timeout = window.setTimeout(() => setLoading(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.();
    if (
      target === "_blank" ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    if (href === pathname) return;

    setLoading(true);
  }

  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      title={title}
      aria-busy={loading}
      onClick={handleClick}
      className={[
        "group/portal-link relative overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:ring-offset-2 active:scale-[0.98]",
        "hover:-translate-y-0.5 hover:shadow-md",
        loading ? "pointer-events-none opacity-80" : "",
        className,
      ].join(" ")}
    >
      {children}
      {loading && (
        <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-brand-blue shadow-sm dark:bg-card-bg/90">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </span>
      )}
    </Link>
  );
}
