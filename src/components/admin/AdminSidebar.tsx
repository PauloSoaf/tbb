"use client";

import type { ReactNode } from "react";
import { LayoutDashboard, Building2, CreditCard, FileText, HardDrive } from "lucide-react";
import { DashboardSidebar, type SidebarNavItem } from "@/components/layout/DashboardSidebar";
import { GlobalAdminBadge } from "@/components/admin/AdminBadges";
import { useI18n } from "@/lib/i18n/I18nContext";

interface AdminSidebarProps {
  footer?: ReactNode;
}

export function AdminSidebar({ footer }: AdminSidebarProps) {
  const { t } = useI18n();

  const items: SidebarNavItem[] = [
    { label: t("admin.nav.overview"), href: "/admin", icon: LayoutDashboard },
    { label: t("admin.nav.tenants"), href: "/admin/tenants", icon: Building2 },
    { label: t("admin.nav.plans"), href: "/admin/planos", icon: CreditCard },
    { label: t("admin.nav.storage"), href: "/admin/storage", icon: HardDrive },
    { label: t("admin.nav.audit"), href: "/admin/auditoria", icon: FileText },
  ];

  return (
    <DashboardSidebar
      tenantSlug=""
      nutritionistName=""
      items={items}
      badge={<GlobalAdminBadge />}
      footer={footer}
    />
  );
}
