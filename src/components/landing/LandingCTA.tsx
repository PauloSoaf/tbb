import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { FloatingLeaf } from "./FloatingLeaf";

const ctaButtonBase =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold leading-none whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:ring-offset-2 focus:ring-offset-background";

export function LandingCTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-warm-beige via-background to-brand-blue-soft relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-brand-blue-soft/60 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-100/40 dark:bg-emerald-900/15 rounded-full blur-3xl" />
      </div>
      <FloatingLeaf
        className="absolute top-4 left-8 pointer-events-none hidden md:block"
        size={44}
        fillColor="#E8DCC8"
        strokeColor="#b8894d"
        fillOpacity={0.2}
        strokeOpacity={0.2}
      />
      <FloatingLeaf
        className="absolute bottom-8 right-10 pointer-events-none hidden lg:block"
        size={36}
        fillColor="#BFE3C0"
        strokeColor="#7BAE7F"
        fillOpacity={0.15}
        strokeOpacity={0.18}
      />

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-card-bg border border-border-neutral rounded-full text-sm text-text-secondary mb-8 shadow-sm">
            <Leaf className="w-3.5 h-3.5 text-emerald-500" />
            Comece gratuitamente, sem cartão de crédito
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight mb-6">
            Organize sua clínica nutricional com uma experiência mais{" "}
            <span className="text-brand-blue">leve, moderna e conectada</span>
          </h2>

          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed">
            Junte-se às nutricionistas que já transformaram seu atendimento com o NutriOpus.
            Crie sua conta em minutos e experimente a plataforma completa.
          </p>

          <div className="mx-auto grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/cadastro"
              className={`${ctaButtonBase} group bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:-translate-y-0.5 hover:bg-brand-blue-hover hover:shadow-xl hover:shadow-brand-blue/25`}
            >
              Criar conta grátis
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/demo/dashboard"
              className={`${ctaButtonBase} border border-border-neutral bg-card-bg text-text-primary shadow-sm hover:-translate-y-0.5 hover:border-brand-blue/45 hover:text-brand-blue hover:shadow-md`}
            >
              Ver demo interativa
            </Link>
          </div>

          <p className="text-sm text-text-secondary mt-8">
            Explore o painel da nutricionista e o portal do paciente com dados fictícios — sem cadastro.
          </p>
          <p className="text-sm text-text-secondary mt-2">
            Sem necessidade de cartão de crédito · Dados seguros · LGPD compliant
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
