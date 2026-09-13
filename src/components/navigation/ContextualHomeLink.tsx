"use client";

import { usePathname } from "next/navigation";
import { NutriOpusIcon } from "@/components/brand/NutriOpusIcon";
import { PendingButtonLink } from "./PendingButtonLink";

function homeHrefForPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  let href = "/";

  if (segments[0] === "dashboard" && segments[1]) {
    href = `/dashboard/${segments[1]}`;
  } else if (segments[0] === "portal" && segments[1]) {
    href = `/portal/${segments[1]}`;
  } else if (segments[0] === "admin") {
    href = "/admin";
  }

  if (href !== normalizedPathname) return href;
  if (segments[0] === "portal" && segments[1]) return `/portal/${segments[1]}/login`;
  return "/login";
}

export function ContextualHomeLink({
  className,
  label = "Voltar ao início",
  pendingLabel = "Abrindo início...",
}: {
  className?: string;
  label?: string;
  pendingLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <PendingButtonLink
      href={homeHrefForPath(pathname)}
      pendingLabel={pendingLabel}
      className={className}
    >
      <NutriOpusIcon size={24} className="h-6 w-6 object-contain" />
      {label}
    </PendingButtonLink>
  );
}
