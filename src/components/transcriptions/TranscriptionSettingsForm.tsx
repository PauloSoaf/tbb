"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic2,
  Save,
  Server,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  testTranscriptionProviderAction,
  updateTranscriptionSettingsAction,
} from "@/actions/transcription.action";
import { useI18n } from "@/lib/i18n/I18nContext";

type Settings = {
  enabled: boolean;
  autoStartOnlineAppointments: boolean;
  autoStartInPersonAppointments: boolean;
  requirePatientNotice: boolean;
  requireInPersonConfirmation: boolean;
  saveTranscriptByDefault: boolean;
  attachToMedicalRecordByDefault: boolean;
  provider: "speaches" | "whisper_live" | "whisper_cpp" | "vosk" | "mock";
  model: string;
  fallbackModel: string;
  language: string;
  sampleRate: number;
  chunkMs: number;
  saveAudio: false;
  maxSessionMinutes: number | null;
};

interface Props {
  tenantSlug: string;
  canEdit: boolean;
  initialSettings: Settings;
  initialProviderStatus: {
    online: boolean;
    provider: string;
    model: string;
    latencyMs: number;
    checkedAt: string;
  };
  usage: { currentMinutes: number; limitMinutes: number | null };
}

const fieldClass =
  "h-10 w-full rounded-lg border border-border-neutral bg-background px-3 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 disabled:opacity-60";

export function TranscriptionSettingsForm({
  tenantSlug,
  canEdit,
  initialSettings,
  initialProviderStatus,
  usage,
}: Props) {
  const { t } = useI18n();
  const [settings, setSettings] = useState(initialSettings);
  const [providerStatus, setProviderStatus] = useState(initialProviderStatus);
  const [isPending, startTransition] = useTransition();
  const usagePercent =
    usage.limitMinutes && usage.limitMinutes > 0
      ? Math.min(100, Math.round((usage.currentMinutes / usage.limitMinutes) * 100))
      : 0;

  const toggle = (key: keyof Settings) => {
    if (!canEdit) return;
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const save = () => {
    startTransition(async () => {
      const result = await updateTranscriptionSettingsAction(tenantSlug, settings);
      if (result.success) {
        setSettings(result.settings as Settings);
        toast.success(t("transcription.success.settingsSaved"));
      } else {
        toast.error(result.error);
      }
    });
  };

  const testProvider = () => {
    startTransition(async () => {
      const result = await testTranscriptionProviderAction(tenantSlug);
      if (result.success) {
        setProviderStatus(result.status);
        toast[result.status.online ? "success" : "error"](
          t(
            result.status.online
              ? "transcription.providerTestSuccess"
              : "transcription.providerTestFailed"
          )
        );
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric
          icon={providerStatus.online ? CheckCircle2 : AlertTriangle}
          label={t("transcription.provider")}
          value={t(
            providerStatus.online
              ? "transcription.providerOnline"
              : "transcription.providerOffline"
          )}
          tone={providerStatus.online ? "success" : "warning"}
        />
        <Metric
          icon={Activity}
          label={t("transcription.settings.monthlyUsage")}
          value={
            usage.limitMinutes == null
              ? `${usage.currentMinutes} min`
              : `${usage.currentMinutes} / ${usage.limitMinutes} min`
          }
        />
        <Metric
          icon={Server}
          label={t("transcription.settings.latency")}
          value={`${providerStatus.latencyMs} ms`}
        />
      </section>

      {usage.limitMinutes != null && (
        <div className="h-2 overflow-hidden rounded-full bg-warm-surface">
          <div
            className="h-full bg-brand-blue transition-[width]"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      )}

      <section className="border-y border-border-neutral bg-card-bg py-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-brand-blue">
              <Mic2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">
                {t("transcription.settings.title")}
              </h2>
              <p className="text-sm text-text-secondary">
                {t("transcription.automaticDescription")}
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.enabled}
            disabled={!canEdit}
            onChange={() => toggle("enabled")}
            label={t("transcription.settings.enable")}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <SettingToggle
            label={t("transcription.settings.autoStartOnline")}
            checked={settings.autoStartOnlineAppointments}
            disabled={!canEdit || !settings.enabled}
            onChange={() => toggle("autoStartOnlineAppointments")}
          />
          <SettingToggle
            label={t("transcription.settings.autoStartInPerson")}
            checked={settings.autoStartInPersonAppointments}
            disabled={!canEdit || !settings.enabled}
            onChange={() => toggle("autoStartInPersonAppointments")}
          />
          <SettingToggle
            label={t("transcription.settings.requirePatientNotice")}
            checked={settings.requirePatientNotice}
            disabled={!canEdit}
            onChange={() => toggle("requirePatientNotice")}
          />
          <SettingToggle
            label={t("transcription.settings.requireInPersonConfirmation")}
            checked={settings.requireInPersonConfirmation}
            disabled={!canEdit}
            onChange={() => toggle("requireInPersonConfirmation")}
          />
          <SettingToggle
            label={t("transcription.settings.saveByDefault")}
            checked={settings.saveTranscriptByDefault}
            disabled={!canEdit}
            onChange={() => toggle("saveTranscriptByDefault")}
          />
          <SettingToggle
            label={t("transcription.settings.attachByDefault")}
            checked={settings.attachToMedicalRecordByDefault}
            disabled={!canEdit}
            onChange={() => toggle("attachToMedicalRecordByDefault")}
          />
        </div>
      </section>

      <section className="grid gap-4 border-b border-border-neutral bg-card-bg pb-6 md:grid-cols-2">
        <Field label={t("transcription.provider")}>
          <select
            value={settings.provider}
            disabled={!canEdit}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                provider: event.target.value as Settings["provider"],
              }))
            }
            className={fieldClass}
          >
            {["speaches", "whisper_live", "whisper_cpp", "vosk", "mock"].map(
              (provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              )
            )}
          </select>
        </Field>
        <Field label={t("transcription.language")}>
          <select
            value={settings.language}
            disabled={!canEdit}
            onChange={(event) =>
              setSettings((current) => ({ ...current, language: event.target.value }))
            }
            className={fieldClass}
          >
            <option value="pt">{t("transcription.languages.pt")}</option>
            <option value="en">{t("transcription.languages.en")}</option>
            <option value="es">{t("transcription.languages.es")}</option>
          </select>
        </Field>
        <Field label={t("transcription.model")}>
          <input
            value={settings.model}
            disabled={!canEdit}
            onChange={(event) =>
              setSettings((current) => ({ ...current, model: event.target.value }))
            }
            className={fieldClass}
          />
        </Field>
        <Field label={t("transcription.settings.fallbackModel")}>
          <input
            value={settings.fallbackModel}
            disabled={!canEdit}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                fallbackModel: event.target.value,
              }))
            }
            className={fieldClass}
          />
        </Field>
        <Field label={t("transcription.settings.maxSessionMinutes")}>
          <input
            type="number"
            min={5}
            max={480}
            value={settings.maxSessionMinutes ?? ""}
            disabled={!canEdit}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                maxSessionMinutes: event.target.value
                  ? Number(event.target.value)
                  : null,
              }))
            }
            className={fieldClass}
          />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={testProvider}
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-neutral px-4 text-sm font-semibold text-text-primary hover:bg-primary-subtle disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
            {t("transcription.settings.testProvider")}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <ShieldCheck className="h-4 w-4 text-success" />
          {t("transcription.audioNotSaved")}
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-brand-blue-hover disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("transcription.settings.save")}
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4 accent-brand-blue"
      />
      <span>{label}</span>
    </label>
  );
}

function SettingToggle(props: Parameters<typeof Toggle>[0]) {
  return (
    <div className="flex min-h-12 items-center rounded-lg border border-border-neutral bg-background px-3">
      <Toggle {...props} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-text-primary">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-brand-blue";
  return (
    <div className="border-b border-border-neutral bg-card-bg p-4">
      <div className={`mb-2 flex items-center gap-2 ${toneClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase">{label}</span>
      </div>
      <p className="font-semibold text-text-primary">{value}</p>
    </div>
  );
}
