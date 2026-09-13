"use client";

import { useState } from "react";
import { Bot, Wrench, X, Calculator, Scale, ClipboardList, Smile, Apple, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PatientAIAssistantChat } from "@/components/patient-portal/assistant/PatientAIAssistantChat";
import { buildScheduleWhatsAppUrl } from "@/lib/utils/whatsapp";
import { AnimatePresence, motion } from "framer-motion";
import { PortalLoadingLink } from "@/components/patient-portal/PortalLoadingLink";
import { buildPatientPortalHref } from "@/lib/utils/patientPortalRoute";

interface PatientFloatingDockProps {
  tenantSlug: string;
  patientSlug: string;
  nutritionistWhatsApp: string | null;
  patientName: string;
}

export function PatientFloatingDock({
  tenantSlug,
  patientSlug,
  nutritionistWhatsApp,
  patientName,
}: PatientFloatingDockProps) {
  const { t } = useI18n();
  const [aiOpen, setAiOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const tools = [
    { label: t("patient_portal.tools.taco"), icon: Calculator, href: buildPatientPortalHref(tenantSlug, patientSlug, "calculadora"), external: false },
    { label: t("patient_portal.tools.quick_weight"), icon: Scale, href: buildPatientPortalHref(tenantSlug, patientSlug, "peso"), external: false },
    { label: t("patient_portal.tools.checkin"), icon: Smile, href: buildPatientPortalHref(tenantSlug, patientSlug, "checkin"), external: false },
    { label: t("patient_portal.tools.view_meal_plan"), icon: Apple, href: buildPatientPortalHref(tenantSlug, patientSlug, "cardapio"), external: false },
    { label: t("patient_portal.tools.quick_meal"), icon: ClipboardList, href: buildPatientPortalHref(tenantSlug, patientSlug, "diario"), external: false },
    ...(nutritionistWhatsApp
      ? [{ label: t("patient_portal.tools.schedule_whatsapp"), icon: Phone, href: buildScheduleWhatsAppUrl(nutritionistWhatsApp, patientName), external: true }]
      : []),
  ];

  return (
    <>
      {/* Floating buttons */}
      <div className="print:hidden fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
        {/* AI button */}
        <button
          onClick={() => { setAiOpen(true); setToolsOpen(false); }}
          title={t("patient_portal.ai.title")}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-blue text-white shadow-lg shadow-brand-blue/30 hover:bg-brand-blue-hover hover:scale-105 transition-all duration-200"
        >
          <Bot className="w-5 h-5" />
        </button>

        {/* Tools button */}
        <button
          onClick={() => { setToolsOpen(true); setAiOpen(false); }}
          title={t("patient_portal.tools.title")}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-card-bg border border-border-neutral text-text-secondary shadow-md hover:border-brand-blue/40 hover:text-brand-blue hover:scale-105 transition-all duration-200"
        >
          <Wrench className="w-5 h-5" />
        </button>
      </div>

      {/* AI Drawer */}
      <AnimatePresence>
        {aiOpen && (
          <>
            <motion.div
              key="ai-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
              onClick={() => setAiOpen(false)}
            />
            <motion.div
              key="ai-drawer"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] max-h-[80vh] bg-card-bg border border-border-neutral rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <PatientAIAssistantChat tenantSlug={tenantSlug} onClose={() => setAiOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tools Drawer */}
      <AnimatePresence>
        {toolsOpen && (
          <>
            <motion.div
              key="tools-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
              onClick={() => setToolsOpen(false)}
            />
            <motion.div
              key="tools-drawer"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[320px] bg-card-bg border border-border-neutral rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-neutral">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t("patient_portal.tools.title")}</p>
                  <p className="text-xs text-text-secondary">{t("patient_portal.tools.subtitle")}</p>
                </div>
                <button
                  onClick={() => setToolsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-warm-surface text-text-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {tools.map(({ label, icon: Icon, href, external }) =>
                  external ? (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setToolsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-warm-surface hover:bg-brand-blue-soft hover:text-brand-blue text-text-secondary hover:border-brand-blue/30 border border-transparent transition-all text-sm font-medium"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-brand-blue" />
                      <span className="truncate">{label}</span>
                    </a>
                  ) : (
                    <PortalLoadingLink
                      key={label}
                      href={href}
                      onClick={() => setToolsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-warm-surface hover:bg-brand-blue-soft hover:text-brand-blue text-text-secondary hover:border-brand-blue/30 border border-transparent text-sm font-medium"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-brand-blue" />
                      <span className="truncate">{label}</span>
                    </PortalLoadingLink>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
