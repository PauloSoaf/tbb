"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home, Apple, TrendingUp, BookOpen, Calendar, FileText,
  MessageCircle, Video, LogOut, Calculator, Target, Smile,
  CheckSquare, MoreHorizontal, X, ShoppingCart, Loader2,
} from "lucide-react";
import { useState } from "react";
import { logoutPatientAction } from "@/actions/patient-portal.action";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { LangToggle } from "@/components/layout/LangToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PortalLoadingLink } from "@/components/patient-portal/PortalLoadingLink";
import { buildPatientPortalBase, buildPatientPortalHref, toPatientPortalPrettyPath } from "@/lib/utils/patientPortalRoute";

interface PatientPortalMobileNavProps {
  tenantSlug: string;
  patientSlug: string;
}

export function PatientPortalMobileNav({ tenantSlug, patientSlug }: PatientPortalMobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const base = buildPatientPortalBase(tenantSlug, patientSlug);
  const activePath = toPatientPortalPrettyPath(pathname, tenantSlug, patientSlug);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const allLinks = [
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

  const primaryLinks = allLinks.slice(0, 4);
  const secondaryLinks = allLinks.slice(4);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutPatientAction();
      toast.success(t("patient_portal.nav.logout_success"));
      router.push(`/portal/${tenantSlug}/login`);
    } catch (error) {
      setLoggingOut(false);
      throw error;
    }
  };

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-card-bg rounded-t-2xl p-4 shadow-2xl border-t border-border-neutral"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {t("patient_portal.nav.more")}
              </p>
              <div className="flex items-center gap-2">
                <LangToggle />
                <ThemeToggle />
                <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-lg hover:bg-warm-surface">
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {secondaryLinks.map(({ href, label, icon: Icon }) => (
                <PortalLoadingLink
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors ${
                    activePath === href
                      ? "bg-brand-blue text-white shadow-sm"
                      : "bg-warm-surface text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </PortalLoadingLink>
              ))}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                aria-busy={loggingOut || undefined}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium bg-red-50 dark:bg-red-900/20 text-danger transition-colors"
              >
                {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <LogOut className="w-5 h-5" />}
                {loggingOut
                  ? t("patient_portal.nav.logging_out", { defaultValue: "Saindo..." })
                  : t("patient_portal.nav.logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card-bg border-t border-border-neutral z-40 flex items-center justify-around px-1 py-1.5 safe-area-inset-bottom">
        {primaryLinks.map(({ href, label, icon: Icon }) => {
          const active = activePath === href;
          return (
            <PortalLoadingLink
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1 text-xs transition-colors ${
                active ? "text-brand-blue" : "text-text-secondary"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : ""}`} />
              <span className={`text-[10px] ${active ? "font-semibold" : ""}`}>{label}</span>
            </PortalLoadingLink>
          );
        })}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1 text-xs transition-colors ${
            moreOpen ? "text-brand-blue" : "text-text-secondary"
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className={`text-[10px] ${moreOpen ? "font-semibold" : ""}`}>{t("patient_portal.nav.more")}</span>
        </button>
      </nav>
    </>
  );
}
