"use client";

import { useActionState, useEffect } from "react";
import {
  submitInternalAnamneseAction,
  updateInternalAnamneseAction,
} from "@/actions/submitInternalAnamnese.action";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { AnamneseInput } from "@/validation/anamnese.schema";

interface InternalAnamneseFormProps {
  tenantSlug: string;
  patientId: string;
  patientRouteParam: string;
  responseId?: string;
  defaultValues: Partial<AnamneseInput>;
}

export function InternalAnamneseForm({
  tenantSlug,
  patientId,
  patientRouteParam,
  responseId,
  defaultValues,
}: InternalAnamneseFormProps) {
  const boundAction = responseId
    ? updateInternalAnamneseAction.bind(null, tenantSlug, responseId, patientRouteParam)
    : submitInternalAnamneseAction.bind(null, tenantSlug, patientId, patientRouteParam);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    } else if (state && !state.error) {
      toast.success(responseId ? "Anamnese atualizada com sucesso!" : "Anamnese salva com sucesso!");
    }
  }, [responseId, state]);

  return (
    <form action={formAction} className="space-y-8 max-w-4xl mx-auto pb-8">
      {/* Dados Básicos */}
      <section className="bg-white rounded-xl border border-border-neutral p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Dados Básicos e Objetivo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Nome completo *</label>
            <input name="name" required defaultValue={defaultValues.name ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-gray-50 text-text-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Telefone *</label>
            <input name="phone" required defaultValue={defaultValues.phone ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-gray-50 text-text-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">E-mail</label>
            <input name="email" type="email" defaultValue={defaultValues.email ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 focus:ring-brand-blue" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Nascimento</label>
              <input name="birthDate" type="date" defaultValue={defaultValues.birthDate ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 focus:ring-brand-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Peso (kg)</label>
              <input name="weight" type="number" step="0.1" defaultValue={defaultValues.weight ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 focus:ring-brand-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Altura (cm)</label>
              <input name="height" type="number" step="0.1" defaultValue={defaultValues.height ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 focus:ring-brand-blue" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1">Objetivo principal *</label>
            <textarea name="goal" required defaultValue={defaultValues.goal ?? ""} rows={2} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 focus:ring-brand-blue resize-none" placeholder="Perder peso, hipertrofia..." />
          </div>
        </div>
      </section>

      {/* Histórico Clínico */}
      <section className="bg-white rounded-xl border border-border-neutral p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Histórico Clínico</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Doenças ou condições</label>
            <textarea name="diseases" rows={2} defaultValue={defaultValues.diseases ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 resize-none" placeholder="Diabetes, hipertensão..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Cirurgias</label>
            <textarea name="surgeries" rows={2} defaultValue={defaultValues.surgeries ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Medicações em uso</label>
            <textarea name="medications" rows={2} defaultValue={defaultValues.medications ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Histórico familiar</label>
            <textarea name="familyHistory" rows={2} defaultValue={defaultValues.familyHistory ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 resize-none" />
          </div>
        </div>
      </section>

      {/* Hábitos */}
      <section className="bg-white rounded-xl border border-border-neutral p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Hábitos e Sintomas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1">Rotina alimentar e horários</label>
            <textarea name="dietaryRoutine" rows={3} defaultValue={defaultValues.dietaryRoutine ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 resize-none" placeholder="Descreva o café, almoço, jantar..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1">Horários de refeição</label>
            <textarea name="mealTimes" rows={2} defaultValue={defaultValues.mealTimes ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 resize-none" placeholder="Horários, intervalos e padrão de refeições." />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Sono</label>
            <textarea name="sleepHabits" rows={2} defaultValue={defaultValues.sleepHabits ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 resize-none" placeholder="Horas por noite, qualidade..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Intestino</label>
            <textarea name="gutHealth" rows={2} defaultValue={defaultValues.gutHealth ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 resize-none" placeholder="Frequência, consistência..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1">Sintomas Frequentes</label>
            <textarea name="symptoms" rows={2} defaultValue={defaultValues.symptoms ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1 resize-none" placeholder="Dor de cabeça, inchaço..." />
          </div>
        </div>
      </section>

      {/* Restrições */}
      <section className="bg-white rounded-xl border border-border-neutral p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Restrições Alimentares</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Alergias</label>
            <input name="allergies" defaultValue={defaultValues.allergies ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1" placeholder="Ex: Amendoim" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Intolerâncias</label>
            <input name="intolerances" defaultValue={defaultValues.intolerances ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1" placeholder="Ex: Lactose" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Preferências/Restrições</label>
            <input name="dietaryRestrictions" defaultValue={defaultValues.dietaryRestrictions ?? ""} className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-card-bg text-text-primary focus:border-brand-blue focus:ring-1" placeholder="Ex: Vegano" />
          </div>
        </div>
      </section>

      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white rounded-xl font-medium shadow-sm hover:bg-brand-blue-hover transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {responseId ? "Atualizar Anamnese" : "Salvar Anamnese"}
        </button>
      </div>
    </form>
  );
}
