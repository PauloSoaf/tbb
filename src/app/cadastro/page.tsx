"use client";

import { useActionState, useState } from "react";
import { registerAction, type RegisterFieldErrors } from "@/actions/register.action";
import { NutriOpusIcon } from "@/components/brand/NutriOpusIcon";
import { AlertCircle, Lock, Mail, User, MapPin, Award } from "lucide-react";
import Link from "next/link";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

function SubmitButton() {
  return (
    <PendingSubmitButton
      pendingLabel="Criando conta..."
      spinnerClassName="h-5 w-5"
      className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-blue text-white rounded-xl
        font-semibold shadow-md shadow-brand-blue/20
        hover:bg-brand-blue-hover transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Criar conta gratuita
    </PendingSubmitButton>
  );
}

function inputClass(hasError: boolean) {
  return `w-full pl-9 pr-4 py-2.5 rounded-xl border bg-card-bg
    text-text-primary placeholder:text-text-secondary/50 text-sm
    focus:ring-2 transition-all ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
        : "border-border-neutral focus:border-brand-blue focus:ring-brand-blue/20"
    }`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600" role="alert">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {message}
    </p>
  );
}

type ShakeMap = Partial<Record<keyof RegisterFieldErrors, boolean>>;

export default function CadastroPage() {
  const [state, formAction] = useActionState(registerAction, null);
  const [shaking, setShaking] = useState<ShakeMap>({});
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    const errs = state?.fieldErrors ?? {};
    const next: ShakeMap = {};
    for (const field of Object.keys(errs) as (keyof RegisterFieldErrors)[]) {
      next[field] = true;
    }
    setShaking(next);
  }

  const fieldErrors: RegisterFieldErrors = state?.fieldErrors ?? {};
  const values = state?.values ?? {};
  const shakeClass = (field: keyof RegisterFieldErrors) =>
    shaking[field] ? "animate-field-shake" : undefined;
  const stopShake = (field: keyof RegisterFieldErrors) => () =>
    setShaking((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

  return (
    <main className="min-h-screen flex">
      {/* Left side - Marketing */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-brand-blue to-brand-blue-hover items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-2 mb-8">
            <NutriOpusIcon size={42} className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold">NutriOpus</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Comece a organizar sua clínica hoje
          </h2>
          <p className="text-white/80 text-lg leading-relaxed">
            Portal do paciente, pré-consultas digitais, agenda e muito mais — tudo em uma plataforma só.
          </p>
          <div className="mt-12 space-y-4">
            {[
              "Portal personalizado para seus pacientes",
              "Pré-consultas digitais com IA",
              "Agenda online com Google Agenda",
              "Envio automático de lembretes",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-white/90">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg width="10" height="8" fill="none" viewBox="0 0 10 8">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 text-brand-blue font-bold text-xl mb-8 justify-center">
            <NutriOpusIcon size={32} className="h-8 w-8 object-contain" />
            NutriOpus
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-1">Criar conta</h1>
          <p className="text-text-secondary mb-6 text-sm">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-brand-blue font-medium hover:underline">
              Entrar
            </Link>
          </p>

          <form action={formAction} className="space-y-4" noValidate>
            <div className={shakeClass("name")} onAnimationEnd={stopShake("name")}>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Nome completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Dra. Ana Silva"
                  defaultValue={values.name}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                  className={inputClass(!!fieldErrors.name)}
                />
              </div>
              {fieldErrors.name && <FieldError message={fieldErrors.name} />}
              {fieldErrors.name && <span id="name-error" className="sr-only">{fieldErrors.name}</span>}
            </div>

            <div className={shakeClass("email")} onAnimationEnd={stopShake("email")}>
              <label className="block text-sm font-medium text-text-primary mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ana@clinica.com.br"
                  defaultValue={values.email}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className={inputClass(!!fieldErrors.email)}
                />
              </div>
              <FieldError message={fieldErrors.email} />
            </div>

            <div className={shakeClass("password")} onAnimationEnd={stopShake("password")}>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  className={inputClass(!!fieldErrors.password)}
                />
              </div>
              <FieldError message={fieldErrors.password} />
            </div>

            <div className={shakeClass("crn")} onAnimationEnd={stopShake("crn")}>
              <label className="block text-sm font-medium text-text-primary mb-1.5">CRN</label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  name="crn"
                  type="text"
                  required
                  placeholder="CRN-3 12345"
                  defaultValue={values.crn}
                  aria-invalid={!!fieldErrors.crn}
                  aria-describedby={fieldErrors.crn ? "crn-error" : undefined}
                  className={inputClass(!!fieldErrors.crn)}
                />
              </div>
              <FieldError message={fieldErrors.crn} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={shakeClass("city")} onAnimationEnd={stopShake("city")}>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Cidade</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input
                    name="city"
                    type="text"
                    required
                    placeholder="São Paulo"
                    defaultValue={values.city}
                    aria-invalid={!!fieldErrors.city}
                    aria-describedby={fieldErrors.city ? "city-error" : undefined}
                    className={`${inputClass(!!fieldErrors.city)} pr-3`}
                  />
                </div>
                <FieldError message={fieldErrors.city} />
              </div>
              <div className={shakeClass("state")} onAnimationEnd={stopShake("state")}>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Estado</label>
                <select
                  name="state"
                  required
                  defaultValue={values.state ?? ""}
                  aria-invalid={!!fieldErrors.state}
                  aria-describedby={fieldErrors.state ? "state-error" : undefined}
                  className={`w-full px-3 py-2.5 rounded-xl border bg-card-bg
                    text-text-primary text-sm focus:ring-2 transition-all ${
                      fieldErrors.state
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                        : "border-border-neutral focus:border-brand-blue focus:ring-brand-blue/20"
                    }`}
                >
                  <option value="" disabled>UF</option>
                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
                <FieldError message={fieldErrors.state} />
              </div>
            </div>

            {state?.error && (
              <div
                className="animate-field-shake p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {state.error}
              </div>
            )}

            <SubmitButton />

            <p className="text-xs text-text-secondary text-center leading-relaxed">
              Ao criar sua conta você concorda com nossos{" "}
              <span className="text-brand-blue">Termos de Uso</span> e{" "}
              <span className="text-brand-blue">Política de Privacidade</span>.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
