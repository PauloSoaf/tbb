"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

interface FormField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
}

interface PatientFormProps {
  action: (
    prevState: { error?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string } | null>;
  defaultValues?: {
    name?: string;
    phone?: string;
    email?: string;
    birthDate?: string;
    gender?: string | null;
    weight?: number | null;
    height?: number | null;
    goal?: string;
    notes?: string;
    status?: string;
  };
  submitLabel?: string;
  showStatus?: boolean;
}

function SubmitButton({ label }: { label: string }) {
  return (
    <PendingSubmitButton
      pendingLabel="Salvando..."
      className="w-full sm:w-auto px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-hover
        disabled:opacity-60 disabled:cursor-not-allowed
        text-white text-sm font-medium rounded-lg transition-colors duration-200"
    >
      {label}
    </PendingSubmitButton>
  );
}

function FormInput({
  name,
  label,
  type = "text",
  placeholder,
  required,
  optional,
  defaultValue,
}: FormField & { defaultValue?: string | number }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
        {optional && <span className="text-text-secondary font-normal ml-1">(opcional)</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue !== null && defaultValue !== undefined ? String(defaultValue) : ""}
        className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
          text-sm text-text-primary placeholder:text-text-secondary/60
          focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
          transition-colors duration-200"
      />
    </div>
  );
}

export function PatientForm({
  action,
  defaultValues,
  submitLabel = "Salvar",
  showStatus = false,
}: PatientFormProps) {
  const [state, formAction] = useActionState(action, null);

  const birthDateValue = defaultValues?.birthDate
    ? new Date(defaultValues.birthDate).toISOString().split("T")[0]
    : "";

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    } else if (state && !state.error) {
      toast.success("Paciente salvo com sucesso!");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormInput
          name="name"
          label="Nome completo"
          placeholder="Ex: Maria da Silva"
          required
          defaultValue={defaultValues?.name}
        />
        <FormInput
          name="phone"
          label="Telefone"
          type="tel"
          placeholder="(11) 99999-9999"
          required
          defaultValue={defaultValues?.phone}
        />
        <FormInput
          name="email"
          label="E-mail"
          type="email"
          placeholder="maria@email.com"
          optional
          defaultValue={defaultValues?.email ?? ""}
        />
        <FormInput
          name="birthDate"
          label="Data de nascimento"
          type="date"
          optional
          defaultValue={birthDateValue}
        />
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-text-primary mb-1.5">
            Sexo
            <span className="text-text-secondary font-normal ml-1">(opcional)</span>
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={defaultValues?.gender ?? ""}
            className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
              text-sm text-text-primary
              focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
              transition-colors duration-200"
          >
            <option value="">Não informado</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
            <option value="O">Outro</option>
          </select>
        </div>
        <FormInput
          name="weight"
          label="Peso"
          type="number"
          placeholder="Ex: 65.5"
          optional
          defaultValue={defaultValues?.weight ?? ""}
        />
        <FormInput
          name="height"
          label="Altura (cm)"
          type="number"
          placeholder="Ex: 165"
          optional
          defaultValue={defaultValues?.height ? defaultValues.height > 3 ? defaultValues.height : defaultValues.height * 100 : ""}
        />
      </div>

      <div>
        <label htmlFor="goal" className="block text-sm font-medium text-text-primary mb-1.5">
          Objetivo principal
          <span className="text-text-secondary font-normal ml-1">(opcional)</span>
        </label>
        <input
          id="goal"
          name="goal"
          type="text"
          placeholder="Ex: Perda de peso, Ganho de massa..."
          defaultValue={defaultValues?.goal ?? ""}
          className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
            text-sm text-text-primary placeholder:text-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
            transition-colors duration-200"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1.5">
          Observações internas
          <span className="text-text-secondary font-normal ml-1">(opcional — não visível ao paciente)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Anotações privadas sobre o paciente..."
          defaultValue={defaultValues?.notes ?? ""}
          className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
            text-sm text-text-primary placeholder:text-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
            transition-colors duration-200 resize-none"
        />
      </div>

      {showStatus && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-text-primary mb-1.5">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "ACTIVE"}
            className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg
              text-sm text-text-primary
              focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
              transition-colors duration-200"
          >
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
