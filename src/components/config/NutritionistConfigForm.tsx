"use client";

import { useActionState, useEffect } from "react";
import type { NutritionistConfigInput } from "@/validation/nutritionist.schema";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

type DefaultValues = Omit<NutritionistConfigInput, "specialtiesRaw"> & {
  specialtiesRaw?: string;
};

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

interface NutritionistConfigFormProps {
  action: (
    prevState: { error?: string; success?: boolean } | null,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean } | null>;
  defaultValues: DefaultValues;
}

function SubmitButton() {
  const { t } = useI18n();
  return (
    <PendingSubmitButton
      pendingLabel={t("settings.saving", { defaultValue: "Salvando..." })}
      className="px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-hover
        disabled:opacity-60 disabled:cursor-not-allowed
        text-white text-sm font-medium rounded-lg transition-colors duration-200"
    >
      {t("settings.save_settings", { defaultValue: "Salvar configurações" })}
    </PendingSubmitButton>
  );
}

function Field({
  name,
  label,
  hint,
  type = "text",
  placeholder,
  defaultValue,
  required,
  t,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  t: TranslateFn;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-primary mb-1">
        {label}
        {!required && <span className="text-text-secondary font-normal ml-1">({t("common.optional", { defaultValue: "opcional" })})</span>}
      </label>
      {hint && <p className="text-xs text-text-secondary mb-1.5">{hint}</p>}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
          text-sm text-text-primary placeholder:text-text-secondary/60
          focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
          transition-colors duration-200"
      />
    </div>
  );
}

export function NutritionistConfigForm({
  action,
  defaultValues,
}: NutritionistConfigFormProps) {
  const [state, formAction] = useActionState(action, null);
  const { t } = useI18n();

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
    if (state?.success) {
      toast.success(t("settings.saved_success", { defaultValue: "Configurações salvas! Sua página pública foi atualizada." }));
    }
  }, [state, t]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Dados principais */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">
          {t("settings.professional_data", { defaultValue: "Dados profissionais" })}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field t={t} name="name" label={t("settings.public_name", { defaultValue: "Nome público" })} placeholder="Dra. Maria da Silva" required defaultValue={defaultValues.name} />
          <Field t={t} name="crn" label={t("settings.crn", { defaultValue: "CRN" })} placeholder="CRN 12345/SP" required defaultValue={defaultValues.crn} />
          <Field t={t} name="email" label={t("settings.public_email", { defaultValue: "E-mail público" })} type="email" placeholder="contato@clinica.com" required defaultValue={defaultValues.email} />
          <Field
            t={t}
            name="whatsapp"
            label="WhatsApp"
            placeholder="5511999999999"
            hint={t("settings.whatsapp_hint", { defaultValue: "Somente números com DDI (ex: 5511999999999)" })}
            defaultValue={defaultValues.whatsapp ?? ""}
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-text-primary mb-1">
          {t("settings.bio_label", { defaultValue: "Bio / Apresentação" })}
          <span className="text-text-secondary font-normal ml-1">({t("common.optional", { defaultValue: "opcional" })})</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          placeholder={t("settings.bio_placeholder", { defaultValue: "Fale sobre sua especialização, experiência e abordagem..." })}
          defaultValue={defaultValues.bio ?? ""}
          className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
            text-sm text-text-primary placeholder:text-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
            resize-none transition-colors duration-200"
        />
      </div>

      {/* Especialidades */}
      <div>
        <label htmlFor="specialtiesRaw" className="block text-sm font-medium text-text-primary mb-1">
          {t("settings.specialties_label", { defaultValue: "Especialidades" })}
          <span className="text-text-secondary font-normal ml-1">({t("settings.comma_separated", { defaultValue: "opcional — separadas por vírgula" })})</span>
        </label>
        <p className="text-xs text-text-secondary mb-1.5">
          {t("settings.specialties_hint", { defaultValue: "Ex: Nutrição Esportiva, Nutrição Clínica, Emagrecimento" })}
        </p>
        <input
          id="specialtiesRaw"
          name="specialtiesRaw"
          type="text"
          placeholder={t("settings.specialties_placeholder", { defaultValue: "Ex: Nutrição Esportiva, Nutrição Clínica" })}
          defaultValue={defaultValues.specialtiesRaw ?? ""}
          className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
            text-sm text-text-primary placeholder:text-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors duration-200"
        />
      </div>

      {/* Localização */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">
          {t("settings.location_title", { defaultValue: "Localização" })}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Field t={t} name="clinicAddress" label={t("settings.clinic_address", { defaultValue: "Endereço do consultório" })} placeholder="Rua das Flores, 100, Sala 5" defaultValue={defaultValues.clinicAddress ?? ""} />
          </div>
          <Field t={t} name="city" label={t("settings.city", { defaultValue: "Cidade" })} placeholder="São Paulo" required defaultValue={defaultValues.city} />
          <Field
            t={t}
            name="state"
            label={t("settings.state", { defaultValue: "Estado (sigla)" })}
            placeholder="SP"
            required
            defaultValue={defaultValues.state}
          />
        </div>
      </div>

      {/* Visual */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">
          {t("settings.page_appearance", { defaultValue: "Aparência da página" })}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label htmlFor="profileImage" className="block text-sm font-medium text-text-primary mb-1">
              {t("settings.profile_image", { defaultValue: "Foto de perfil" })}
            </label>
            <p className="text-xs text-text-secondary mb-1.5">
              {t("settings.profile_image_hint", { defaultValue: "Selecione uma imagem (PNG, JPG) até 5MB." })}
              {defaultValues.profileImageUrl && " " + t("settings.profile_image_has", { defaultValue: "Você já possui uma foto configurada." })}
            </p>
            <input
              id="profileImage"
              name="profileImage"
              type="file"
              accept="image/*"
              className="w-full text-sm text-text-secondary
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-brand-blue-soft file:text-brand-blue
                hover:file:bg-brand-blue/20 transition-colors"
            />
            {defaultValues.profileImageUrl && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="removeProfileImage"
                  value="true"
                  className="w-4 h-4 rounded border-border-neutral text-brand-blue focus:ring-brand-blue/30"
                />
                <span className="text-sm text-text-secondary hover:text-red-600 transition-colors">
                  {t("settings.remove_profile_image", { defaultValue: "Remover foto de perfil atual" })}
                </span>
              </label>
            )}
          </div>
          <div className="flex flex-col">
            <label htmlFor="themePrimaryColor" className="block text-sm font-medium text-text-primary mb-1">
              {t("settings.primary_color", { defaultValue: "Cor principal" })} <span className="text-text-secondary font-normal ml-1">({t("common.optional", { defaultValue: "opcional" })})</span>
            </label>
            <p className="text-xs text-text-secondary mb-1.5">{t("settings.primary_color_hint", { defaultValue: "Cor principal da sua página pública." })}</p>
            <input
              id="themePrimaryColor"
              name="themePrimaryColor"
              type="color"
              defaultValue={defaultValues.themePrimaryColor || "#2563eb"}
              className="w-16 h-10 p-1 bg-card-bg border border-border-neutral rounded cursor-pointer transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-border-neutral">
        <SubmitButton />
      </div>
    </form>
  );
}
