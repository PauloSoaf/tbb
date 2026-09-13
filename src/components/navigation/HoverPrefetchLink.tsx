"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

export function HoverPrefetchLink({ href, children, ...props }: Props) {
  const router = useRouter();
  const hrefStr = typeof href === "string" ? href : String(href);

  return (
    <Link
      href={href}
      onMouseEnter={() => router.prefetch(hrefStr)}
      onFocus={() => router.prefetch(hrefStr)}
      {...props}
    >
      {children}
    </Link>
  );
}
