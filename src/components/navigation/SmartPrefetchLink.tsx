"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { HoverPrefetchLink } from "./HoverPrefetchLink";

type Props = ComponentProps<typeof Link> & { disablePrefetch?: boolean };

export function SmartPrefetchLink({ href, children, disablePrefetch, ...props }: Props) {
  if (disablePrefetch) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <HoverPrefetchLink href={href} {...props}>
      {children}
    </HoverPrefetchLink>
  );
}
