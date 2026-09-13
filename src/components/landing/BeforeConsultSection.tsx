import { ClipboardList, BrainCircuit, UserCheck, AlertCircle } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

function FormMockup() {
  return (
    <div
      className="bg-card-bg rounded-2xl border border-border-neutral shadow-xl shadow-black/5 dark:shadow-black/20 p-5 select-none"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-brand-blue-soft flex items-center justify-center">
          <ClipboardList className="w-4 h-4 text-brand-blue" />
        </div>
        <span className="text-sm font-semibold text-text-primary">Anamnese — Julia Santos</span>
      </div>

      <div className="space-y-3">
        {[
          { label: "Objetivo principal", value: "Perda de peso e mais energia" },
          { label: "Alergias", value: "Lactose" },
          { label: "Atividade física", value: "Caminhada 3x por semana" },
          { label: "Medicamentos em uso", value: "Metformina 500mg" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-warm-surface rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-text-secondary mb-0.5">{label}</div>
            <div className="text-xs font-medium text-text-primary">{value}</div>
          </div>
        ))}

        {/* AI attention points */}
        <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Pontos de atenção detectados</span>
          </div>
          <ul className="space-y-0.5">
            {["Intolerância à lactose", "Medicamento hipoglicemiante"].map((p) => (
              <li key={p} className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-7 rounded-lg bg-brand-blue text-white text-[10px] flex items-center justify-center font-medium">
            Criar prontuário automaticamente
          </div>
          <div className="w-7 h-7 rounded-lg border border-border-neutral flex items-center justify-center">
            <UserCheck className="w-3.5 h-3.5 text-text-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BeforeConsultSection() {
  return (
    <section id="pre-consulta" className="py-24 bg-background scroll-mt-[72px]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Mockup */}
          <ScrollReveal direction="left">
            <FormMockup />
          </ScrollReveal>

          {/* Copy */}
          <div>
            <ScrollReveal delay={0.1}>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold mb-5">
                <ClipboardList className="w-3.5 h-3.5" />
                Antes da consulta
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-5 leading-tight">
                Receba informações importantes{" "}
                <span className="text-amber-600 dark:text-amber-400">antes do atendimento começar</span>
              </h2>
              <p className="text-text-secondary text-lg leading-relaxed mb-8">
                O paciente preenche a pré-consulta no próprio dispositivo, no momento mais conveniente.
                A IA identifica pontos de atenção automáticos e cria o prontuário com um clique.
              </p>
            </ScrollReveal>

            <div className="space-y-4">
              {[
                { Icon: ClipboardList, title: "Anamnese detalhada", desc: "Histórico clínico, hábitos alimentares, objetivos e queixas." },
                { Icon: BrainCircuit, title: "Pontos de atenção com IA", desc: "Alergias, medicamentos e restrições identificados automaticamente." },
                { Icon: UserCheck, title: "Paciente criado automaticamente", desc: "Prontuário gerado direto da pré-consulta, sem retrabalho." },
              ].map(({ Icon, title, desc }, i) => (
                <ScrollReveal key={title} delay={0.2 + i * 0.1}>
                  <div className="flex gap-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary mb-0.5">{title}</div>
                      <div className="text-sm text-text-secondary">{desc}</div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
