"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export type PartnerScope = "me" | "partner" | "together";
const scopes: PartnerScope[] = ["me", "partner", "together"];

export function PartnerScopeSwitcher({ partnerName }: { partnerName: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const current = (searchParams.get("scope") as PartnerScope) || "me";
  const label = (scope: PartnerScope) => (scope === "partner" ? partnerName : t(`partner.${scope}`));

  function select(scope: PartnerScope) {
    setOpen(false);
    const params = new URLSearchParams(searchParams);
    if (scope === "me") params.delete("scope"); else params.set("scope", scope);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return <div className="shell-dropdown" ref={ref}>
    <button className="topbar-control" onClick={() => setOpen((v) => !v)} aria-label={t("partner.switcher")} aria-expanded={open}>
      <Users size={16}/><span>{label(current)}</span><ChevronDown size={13} className={open ? "rotate" : ""}/>
    </button>
    <div className="shell-menu" data-open={open}>
      {scopes.map((scope, index) => <button key={scope} onClick={() => select(scope)} data-active={current === scope} style={{ transitionDelay: open ? `${index * 30}ms` : "0ms" }}>
        <span>{label(scope)}</span>{current === scope && <Check size={15}/>}
      </button>)}
    </div>
  </div>;
}
