"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NutriOpusLogo } from "@/components/ui/NutriOpusLogo";
import {
  Home, Apple, TrendingUp, BookOpen, Calendar, FileText,
  MessageCircle, Video, Calculator, Target, Smile,
  CheckSquare, ChevronLeft, ChevronRight, ShoppingCart,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PortalLoadingLink } from "@/components/patient-portal/PortalLoadingLink";
import { buildPatientPortalBase, buildPatientPortalHref, toPatientPortalPrettyPath } from "@/lib/utils/patientPortalRoute";

const STORAGE_KEY = "nutriopus-portal-sidebar-collapsed";

interface PatientPortalSidebarProps {
  tenantSlug: string;
  patientName: string;
  patientSlug: string;
}

export function PatientPortalSidebar({ tenantSlug, patientName, patientSlug }: PatientPortalSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const base = buildPatientPortalBase(tenantSlug, patientSlug);
  const activePath = toPatientPortalPrettyPath(pathname, tenantSlug, patientSlug);

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setCollapsed(true);
      setMounted(true);
    });
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const links = [
    { href: base, label: t("patient_portal.nav.home"), icon: Home },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "cardapio"), label: t("patient_portal.nav.meal_plan"), icon: Apple },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "compras"), label: t("shopping_list.nav"), icon: ShoppingCart },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "evolucao"), label: t("patient_portal.nav.progress"), icon: TrendingUp },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "diario"), label: t("patient_portal.nav.diary"), icon: BookOpen },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "agenda"), label: t("patient_portal.nav.schedule"), icon: Calendar },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "calculadora"), label: t("patient_portal.nav.taco"), icon: Calculator },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "metas"), label: t("patient_portal.nav.goals"), icon: Target },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "arquivos"), label: t("patient_portal.nav.files"), icon: FileText },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "chat"), label: t("patient_portal.nav.chat"), icon: MessageCircle },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "atendimentos"), label: t("patient_portal.nav.consultations"), icon: Video },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "checkin"), label: t("patient_portal.nav.checkin"), icon: Smile },
    { href: buildPatientPortalHref(tenantSlug, patientSlug, "tarefas"), label: t("patient_portal.nav.tasks"), icon: CheckSquare },
  ];
  if (!mounted) return <aside className="hidden lg:block w-64 shrink-0" />;

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-0 h-full bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)] border-r border-[var(--sidebar-border)] z-50 transition-all duration-300 ${
        collapsed ? "w-[60px]" : "w-64"
      }`}
    >
      {/* Toggle button — filho direto da aside para não ser cortado pelo conteúdo */}
      <button
        onClick={toggle}
        title={collapsed ? t("patient_portal.nav.expand", { defaultValue: "Expandir menu" }) : t("patient_portal.nav.collapse", { defaultValue: "Recolher menu" })}
        className="absolute -right-3 top-[36px] z-50 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--sidebar-border)] bg-[var(--sidebar-background)] text-text-secondary shadow-sm transition-colors hover:border-brand-blue hover:text-brand-blue"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Logo */}
      <div className={`flex h-[72px] items-center border-b border-[var(--sidebar-border)] ${collapsed ? "justify-center px-3" : "px-4"}`}>
        <Link href="/" className="shrink-0">
          {collapsed ? (
            <Image
              src="/nutriopus_mini_logo_exata.svg"
              alt="NutriOpus"
              width={32}
              height={32}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <NutriOpusLogo
              role="img"
              aria-label="NutriOpus"
              className="h-9 w-auto object-contain"
            />
          )}
        </Link>
      </div>

      {/* Patient name */}
      {!collapsed && (
        <div className="border-b border-[var(--sidebar-border)] px-4 py-3">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-0.5">
            {t("patient_portal.header.portal_label")}
          </p>
          <p className="text-sm font-semibold text-text-primary truncate">{patientName}</p>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = activePath === href;
          return (
            <PortalLoadingLink
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex min-h-10 flex-row items-center gap-3 whitespace-nowrap px-2.5 py-2.5 rounded-xl text-sm font-medium leading-none transition-all duration-150 group ${
                active
                  ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] shadow-sm shadow-brand-blue/25"
                  : "text-text-secondary hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-hover-foreground)]"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="min-w-0 truncate leading-none">{label}</span>}
            </PortalLoadingLink>
          );
        })}
      </nav>

      {/* Bottom: logout moved to header */}
    </aside>
  );
}
