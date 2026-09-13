"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginPatientAction } from "@/actions/patient-portal.action";
import { useI18n } from "@/lib/i18n/I18nContext";
import { buildPatientPortalBase } from "@/lib/utils/patientPortalRoute";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface Props {
  tenantSlug: string;
}

export function PatientLoginForm({ tenantSlug }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginPatientAction(tenantSlug, email, password);
      if (result.success) {
        router.push(buildPatientPortalBase(tenantSlug, result.patientSlug));
        return;
      }

      toast.error(result.error || t("patient_portal.login.error"));
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">{t("patient_portal.login.email")}</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          placeholder={t("patient_portal.login.email_placeholder")}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">{t("patient_portal.login.password")}</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          placeholder="••••••••"
        />
      </div>
      <AsyncButton
        type="submit"
        disabled={loading}
        pending={loading}
        pendingLabel={t("patient_portal.login.loading")}
        className="w-full bg-brand-blue text-white rounded-xl py-2.5 font-medium text-sm hover:bg-brand-hover transition-colors disabled:opacity-60"
      >
        {t("patient_portal.login.submit")}
      </AsyncButton>
      <p className="text-center text-xs text-text-secondary">
        {t("patient_portal.login.first_access")}
      </p>
    </form>
  );
}
