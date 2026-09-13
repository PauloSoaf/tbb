"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/login.action";
import { NutriOpusIcon } from "@/components/brand/NutriOpusIcon";
import { LangToggle } from "@/components/layout/LangToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--navbar-border)] bg-[var(--navbar-background)] px-4 py-3 backdrop-blur-md sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-brand-blue">
            <NutriOpusIcon size={34} className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold">NutriOpus</span>
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-4 pb-10 pt-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-beige/50 bg-brand-beige-soft px-3 py-1 text-xs font-semibold text-brand-blue">
              <ShieldCheck className="h-3.5 w-3.5" />
              Plataforma clinica NutriOpus
            </div>
            <h1 className="text-4xl font-bold leading-tight text-text-primary">
              Atendimento nutricional organizado com a identidade da sua clinica.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-text-secondary">
              Acesse pacientes, prontuarios, anamneses e agenda em uma experiencia clara, leve e preparada para rotina clinica.
            </p>

            <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
              {[
                { label: "Prontuario", value: "Central" },
                { label: "Agenda", value: "Integrada" },
                { label: "Portal", value: "Paciente" },
                { label: "Dados", value: "Clinicos" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border-neutral bg-card-bg p-4 shadow-sm">
                  <p className="text-lg font-bold text-brand-blue">{item.value}</p>
                  <p className="mt-1 text-xs font-medium text-text-secondary">{item.label}</p>
                </div>
              ))}
            </div>

          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border-neutral bg-card-bg p-6 shadow-[0_18px_60px_rgba(8,40,77,0.10)] sm:p-8">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <NutriOpusIcon size={36} className="h-9 w-9 object-contain" />
              <div>
                <p className="text-lg font-bold text-brand-blue">NutriOpus</p>
                <p className="text-xs text-text-secondary">Plataforma clinica</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-text-primary">Entrar</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Ainda nao tem conta?{" "}
              <Link href="/cadastro" className="font-semibold text-brand-blue hover:text-brand-blue-hover hover:underline">
                Criar conta gratis
              </Link>
            </p>

            <form action={formAction} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-xl border border-border-neutral bg-background py-3 pl-10 pr-4 text-text-primary placeholder:text-text-secondary/50 transition-all duration-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                  <input
                    name="password"
                    type="password"
                    required
                    className="w-full rounded-xl border border-border-neutral bg-background py-3 pl-10 pr-4 text-text-primary placeholder:text-text-secondary/50 transition-all duration-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                    placeholder="******"
                  />
                </div>
              </div>

              {state?.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {state.error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-md shadow-brand-blue/20 transition-all duration-300 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
