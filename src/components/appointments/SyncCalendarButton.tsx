"use client";

import { useState } from "react";
import { CalendarDays, Copy, Check, Info, RefreshCw, Loader2 } from "lucide-react";
import { getOrCreateCalendarTokenAction, regenerateCalendarTokenAction } from "@/actions/calendar.action";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

interface SyncCalendarButtonProps {
  tenantSlug: string;
  nutritionistId: string; // mantido por compatibilidade mas não usado como token
}

export function SyncCalendarButton({ tenantSlug, nutritionistId }: SyncCalendarButtonProps) {
  void tenantSlug;
  void nutritionistId;

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { t } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://nutriopus.com";

  const syncUrl = token
    ? `${baseUrl}/api/calendar/sync?token=${token}`
    : "";

  const loadToken = async () => {
    setLoadingToken(true);
    const result = await getOrCreateCalendarTokenAction();
    if (result.token) {
      setToken(result.token);
    }
    setLoadingToken(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!token) {
      void loadToken();
    }
  };

  const handleCopy = async () => {
    if (!syncUrl) return;
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback para browsers sem clipboard API
      const el = document.createElement("textarea");
      el.value = syncUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRegenerate = async () => {
    const confirmed = await requestConfirmation({
      title: t("confirmations.regenerate_calendar_link.title"),
      description: t("confirmations.regenerate_calendar_link.description"),
      confirmLabel: t("confirmations.regenerate_calendar_link.confirm"),
      tone: "warning",
    });
    if (!confirmed) return;
    setRegenerating(true);
    const result = await regenerateCalendarTokenAction();
    if (result.token) {
      setToken(result.token);
    }
    setRegenerating(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border-neutral hover:bg-gray-50 text-text-secondary text-sm font-medium rounded-lg transition-colors"
      >
        <CalendarDays className="w-4 h-4" />
        {t("agenda.sync.button", { defaultValue: "Sincronizar (iCal)" })}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 text-brand-blue">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary">{t("agenda.sync.title", { defaultValue: "Sincronizar Agenda" })}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Explicação */}
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex gap-3">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p dangerouslySetInnerHTML={{ __html: t("agenda.sync.info", { defaultValue: "Copie o link abaixo e adicione-o ao seu <strong>Google Agenda, Apple Calendar ou Outlook</strong> usando a opção \"Adicionar por URL\". Seus atendimentos aparecerão automaticamente!" }) }} />
              </div>

              {/* URL de Sync */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">
                  {t("agenda.sync.url_label", { defaultValue: "URL de Sincronização (iCal)" })}
                </label>
                <div className="flex items-center gap-2">
                  {loadingToken ? (
                    <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("agenda.sync.generating", { defaultValue: "Gerando link seguro..." })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      value={syncUrl}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none cursor-pointer"
                      onClick={handleCopy}
                      title={t("agenda.sync.click_to_copy", { defaultValue: "Clique para copiar" })}
                    />
                  )}
                  <button
                    onClick={handleCopy}
                    disabled={!syncUrl || loadingToken}
                    className="p-2 bg-brand-blue hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex shrink-0"
                    title={t("agenda.sync.copy_link", { defaultValue: "Copiar link" })}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-emerald-600 font-medium">{t("agenda.sync.copied", { defaultValue: "✓ Link copiado!" })}</p>
                )}
              </div>

              {/* Como adicionar ao Google Agenda */}
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700 mb-2">{t("agenda.sync.how_to", { defaultValue: "Como adicionar no Google Agenda:" })}</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li dangerouslySetInnerHTML={{ __html: t("agenda.sync.step_1", { defaultValue: "Abra o Google Agenda no computador" }) }} />
                  <li dangerouslySetInnerHTML={{ __html: t("agenda.sync.step_2", { defaultValue: "Clique no <strong>+</strong> ao lado de \"Outras agendas\"" }) }} />
                  <li dangerouslySetInnerHTML={{ __html: t("agenda.sync.step_3", { defaultValue: "Selecione <strong>\"Por URL\"</strong>" }) }} />
                  <li dangerouslySetInnerHTML={{ __html: t("agenda.sync.step_4", { defaultValue: "Cole o link acima e clique em \"Adicionar agenda\"" }) }} />
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t flex items-center justify-between">
              <button
                onClick={handleRegenerate}
                disabled={loadingToken || regenerating}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                title={t("agenda.sync.regenerate_tooltip", { defaultValue: "Regenera um novo link (invalida o anterior)" })}
              >
                {regenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {t("agenda.sync.regenerate", { defaultValue: "Regenerar link" })}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-secondary text-sm font-medium rounded-xl transition-colors"
              >
                {t("agenda.sync.close", { defaultValue: "Fechar" })}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog}
    </>
  );
}
