"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { toast } from "sonner";
import { logoutPatientAction } from "@/actions/patient-portal.action";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface Props {
  tenantSlug: string;
  name: string;
}

export function PatientProfileDropdown({ tenantSlug, name }: Props) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutPatientAction();
      toast.success(t("patient_portal.nav.logout_success", { defaultValue: "Saiu com sucesso." }));
      router.push(`/portal/${tenantSlug}/login`);
    } catch (error) {
      setLoggingOut(false);
      throw error;
    }
  };

  const initial = name ? name.charAt(0).toUpperCase() : "P";
  const firstName = name ? name.split(" ")[0] : "Paciente";

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 p-1.5 pl-2 pr-2.5 rounded-full hover:bg-warm-surface transition-colors border border-transparent hover:border-border-neutral"
      >
        <div className="w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initial}
        </div>
        <span className="hidden md:block text-sm font-medium text-text-primary ml-1">{firstName}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-secondary hidden md:block" />
      </button>

      {/* Dropdown */}
      <div
        className={`absolute right-0 mt-2 w-48 bg-card-bg border border-border-neutral rounded-xl shadow-lg z-50 transform origin-top-right transition-all duration-200 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="px-4 py-3 border-b border-border-neutral">
          <p className="text-xs font-medium text-text-secondary">{t("patient_portal.header.portal_label", { defaultValue: "Portal do Paciente" })}</p>
          <p className="text-sm font-bold text-text-primary truncate">{name}</p>
        </div>
        <div className="p-1.5">
          <AsyncButton
            onClick={handleLogout}
            pending={loggingOut}
            pendingLabel={t("patient_portal.nav.logging_out", { defaultValue: "Saindo..." })}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text-secondary hover:text-danger hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t("patient_portal.nav.logout")}
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
