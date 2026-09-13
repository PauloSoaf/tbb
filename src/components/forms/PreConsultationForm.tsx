"use client";

import { useState, useActionState, useEffect } from "react";
import { submitAnamneseAction } from "@/actions/submitAnamnese.action";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Target,
  HeartPulse,
  Utensils,
  AlertTriangle,
  Shield,
} from "lucide-react";

interface PreConsultationFormProps {
  tenantSlug: string;
}

const steps = [
  { title: "Dados Pessoais", icon: User },
  { title: "Objetivo", icon: Target },
  { title: "Saúde e Histórico", icon: HeartPulse },
  { title: "Rotina Alimentar", icon: Utensils },
  { title: "Hábitos e Sintomas", icon: AlertTriangle },
  { title: "Consentimento", icon: Shield },
];

export function PreConsultationForm({
  tenantSlug,
}: PreConsultationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [state, formAction, isPending] = useActionState(
    submitAnamneseAction,
    null
  );

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    } else if (state && !state.error) {
      toast.success("Pré-consulta enviada com sucesso!");
    }
  }, [state]);

  function nextStep() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(i)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300
                  ${
                    i <= currentStep
                      ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                      : "bg-border-neutral text-text-secondary"
                  }
                `}
              >
                {i + 1}
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`hidden sm:block w-8 lg:w-16 h-0.5 mx-1 transition-colors duration-300 ${
                    i < currentStep ? "bg-brand-blue" : "bg-border-neutral"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <StepIcon className="w-5 h-5 text-brand-blue" />
          <h2 className="text-lg font-semibold text-text-primary">
            {steps[currentStep].title}
          </h2>
        </div>
      </div>

      {/* Form */}
      <form action={formAction}>
        <input type="hidden" name="tenant" value={tenantSlug} />

        {/* Step 1: Personal Data */}
        <div className={currentStep === 0 ? "block" : "hidden"}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Nome completo *
              </label>
              <input
                name="name"
                required
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200"
                placeholder="Seu nome completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Telefone *
              </label>
              <input
                name="phone"
                required
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200"
                placeholder="seu@email.com"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Data de nascimento
                </label>
                <input
                  name="birthDate"
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                    text-text-primary focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                    transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Peso (kg)
                </label>
                <input
                  name="weight"
                  type="number"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                    text-text-primary placeholder:text-text-secondary/50
                    focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                    transition-all duration-200"
                  placeholder="70.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Altura (cm)
                </label>
                <input
                  name="height"
                  type="number"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                    text-text-primary placeholder:text-text-secondary/50
                    focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                    transition-all duration-200"
                  placeholder="170"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Goal */}
        <div className={currentStep === 1 ? "block" : "hidden"}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Qual seu principal objetivo? *
              </label>
              <textarea
                name="goal"
                required
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="Ex: Perder peso, ganhar massa muscular, melhorar a alimentação..."
              />
            </div>
          </div>
        </div>

        {/* Step 3: Health History */}
        <div className={currentStep === 2 ? "block" : "hidden"}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Doenças ou condições de saúde
              </label>
              <textarea
                name="diseases"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="Ex: Diabetes, hipertensão, hipotireoidismo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Cirurgias realizadas
              </label>
              <textarea
                name="surgeries"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="Ex: Bariátrica, apendicectomia..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Medicações em uso
              </label>
              <textarea
                name="medications"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="Ex: Metformina, Levotiroxina..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Histórico familiar de doenças
              </label>
              <textarea
                name="familyHistory"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="Ex: Pai com diabetes, mãe com hipertensão..."
              />
            </div>
          </div>
        </div>

        {/* Step 4: Dietary Routine */}
        <div className={currentStep === 3 ? "block" : "hidden"}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Descreva sua rotina alimentar
              </label>
              <textarea
                name="dietaryRoutine"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="O que você costuma comer no café da manhã, almoço, lanche e jantar?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Horários das refeições
              </label>
              <textarea
                name="mealTimes"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="Ex: Café 7h, Almoço 12h, Lanche 16h, Jantar 20h"
              />
            </div>
          </div>
        </div>

        {/* Step 5: Habits and Symptoms */}
        <div className={currentStep === 4 ? "block" : "hidden"}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Como é seu sono?
              </label>
              <textarea
                name="sleepHabits"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="Ex: Durmo 8h por noite, sono tranquilo / Tenho insônia..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Como é seu intestino?
              </label>
              <textarea
                name="gutHealth"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="Ex: Regular, funciona todo dia / Constipação frequente..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Sintomas que sente com frequência
              </label>
              <textarea
                name="symptoms"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200 resize-none"
                placeholder="Ex: Dor de cabeça, inchaço, cansaço..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Alergias alimentares
              </label>
              <input
                name="allergies"
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200"
                placeholder="Ex: Amendoim, camarão..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Intolerâncias
              </label>
              <input
                name="intolerances"
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200"
                placeholder="Ex: Lactose, glúten..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Restrições alimentares
              </label>
              <input
                name="dietaryRestrictions"
                className="w-full px-4 py-3 rounded-xl border border-border-neutral bg-card-bg
                  text-text-primary placeholder:text-text-secondary/50
                  focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20
                  transition-all duration-200"
                placeholder="Ex: Vegetariano, vegano, sem glúten..."
              />
            </div>
          </div>
        </div>

        {/* Step 6: Consent */}
        <div className={currentStep === 5 ? "block" : "hidden"}>
          <div className="space-y-6">
            <div className="bg-warm-surface rounded-xl p-6 border border-border-neutral">
              <h3 className="font-semibold text-text-primary mb-3">
                Termo de consentimento (LGPD)
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Ao preencher este formulário, você autoriza o(a) nutricionista a
                coletar e armazenar suas informações pessoais e de saúde
                exclusivamente para fins de acompanhamento nutricional. Seus
                dados serão tratados com confidencialidade e não serão
                compartilhados com terceiros sem sua autorização prévia, em
                conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº
                13.709/2018).
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="lgpdConsent"
                value="true"
                required
                className="mt-1 w-5 h-5 rounded border-border-neutral text-brand-blue
                  focus:ring-brand-blue/20"
              />
              <span className="text-sm text-text-primary">
                Li e concordo com o termo de consentimento acima e autorizo o uso
                dos meus dados para acompanhamento nutricional. *
              </span>
            </label>
          </div>
        </div>

        {/* Error */}
        {state?.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-neutral">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm
              transition-all duration-200
              ${
                currentStep === 0
                  ? "text-text-secondary/40 cursor-not-allowed"
                  : "text-text-secondary hover:bg-warm-beige hover:text-text-primary"
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white rounded-xl
                font-medium text-sm shadow-md shadow-brand-blue/20
                hover:bg-brand-blue-hover transition-all duration-200"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white rounded-xl
                font-medium text-sm shadow-md shadow-brand-blue/20
                hover:bg-brand-blue-hover transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar pré-consulta"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
