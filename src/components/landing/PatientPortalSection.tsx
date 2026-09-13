import { Smartphone, BookOpen, Scale, MessageCircle, Calendar } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

function MobileMockup() {
  return (
    <div className="mx-auto w-56 select-none" aria-hidden="true">
      {/* Phone frame */}
      <div className="rounded-[2rem] border-[3px] border-border-neutral bg-background shadow-2xl shadow-black/15 dark:shadow-black/40 overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 bg-background">
          <span className="text-[9px] font-semibold text-text-primary">9:41</span>
          <div className="flex gap-1">
            <div className="w-10 h-1.5 rounded-full bg-border-neutral" />
          </div>
        </div>

        {/* App content */}
        <div className="bg-warm-surface px-3 pb-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-[10px] text-text-secondary">Olá, Julia</div>
              <div className="text-xs font-bold text-text-primary">Seu painel</div>
            </div>
            <div className="w-6 h-6 rounded-full bg-brand-blue-soft flex items-center justify-center">
              <span className="text-[8px] font-bold text-brand-blue">JS</span>
            </div>
          </div>

          {/* Progress card */}
          <div className="bg-card-bg rounded-xl px-3 py-2.5 border border-border-neutral">
            <div className="text-[9px] text-text-secondary mb-1">Peso esta semana</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-text-primary">78.2</span>
              <span className="text-[9px] text-text-secondary">kg</span>
              <span className="text-[9px] text-emerald-600 font-semibold ml-auto">↓ 0.8 kg</span>
            </div>
            <div className="mt-2 h-1.5 bg-warm-beige rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-emerald-400 rounded-full" />
            </div>
          </div>

          {/* Meal plan */}
          <div className="bg-card-bg rounded-xl px-3 py-2.5 border border-border-neutral">
            <div className="text-[9px] font-semibold text-text-primary mb-2">Cardápio de hoje</div>
            {[
              { time: "08h", name: "Café da manhã", done: true },
              { time: "12h", name: "Almoço", done: true },
              { time: "15h", name: "Lanche", done: false },
              { time: "19h", name: "Jantar", done: false },
            ].map(({ time, name, done }) => (
              <div key={time} className="flex items-center gap-2 py-1">
                <div
                  className={`w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center ${
                    done ? "bg-emerald-400 border-emerald-400" : "border-border-neutral"
                  }`}
                >
                  {done && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <span className="text-[8px] text-text-secondary w-6">{time}</span>
                <span className="text-[9px] text-text-primary">{name}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { Icon: Scale, label: "Peso" },
              { Icon: BookOpen, label: "Diário" },
              { Icon: MessageCircle, label: "Chat" },
            ].map(({ Icon, label }) => (
              <div key={label} className="bg-card-bg rounded-xl flex flex-col items-center py-2.5 gap-1 border border-border-neutral">
                <Icon className="w-4 h-4 text-brand-blue" />
                <span className="text-[8px] text-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PatientPortalSection() {
  return (
    <section id="portal" className="py-24 bg-background scroll-mt-[72px]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Mobile mockup */}
          <ScrollReveal direction="left">
            <MobileMockup />
          </ScrollReveal>

          {/* Copy */}
          <div>
            <ScrollReveal delay={0.1}>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 rounded-full text-xs font-semibold mb-5">
                <Smartphone className="w-3.5 h-3.5" />
                Portal do paciente
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-5 leading-tight">
                O paciente acompanha{" "}
                <span className="text-cyan-600 dark:text-cyan-400">tudo pelo próprio painel</span>
              </h2>
              <p className="text-text-secondary text-lg leading-relaxed mb-8">
                Cada paciente tem acesso exclusivo ao seu espaço digital: cardápio, evolução,
                registros de peso, consultas agendadas, arquivos e chat direto com a nutricionista.
              </p>
            </ScrollReveal>

            <div className="space-y-4">
              {[
                { Icon: BookOpen, title: "Diário alimentar", desc: "O paciente registra o que consome ao longo do dia, direto pelo celular.", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
                { Icon: Scale, title: "Registro de peso e medidas", desc: "Acompanhe a evolução em tempo real, com histórico gráfico.", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
                { Icon: Calendar, title: "Consultas e arquivos", desc: "Agenda, exames, documentos e histórico — tudo organizado e acessível.", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
                { Icon: MessageCircle, title: "Chat integrado", desc: "Comunicação direta entre nutricionista e paciente sem sair do sistema.", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
              ].map(({ Icon, title, desc, color, bg }, i) => (
                <ScrollReveal key={title} delay={0.2 + i * 0.08}>
                  <div className="flex gap-4">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} />
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
