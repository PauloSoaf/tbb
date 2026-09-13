import {
  ClipboardList,
  CalendarDays,
  TrendingUp,
  MessageCircle,
  BrainCircuit,
  Smartphone,
  Shield,
  Utensils,
  Users,
} from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const features = [
  {
    Icon: ClipboardList,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    title: "Pré-consulta digital",
    description: "Formulário completo com anamnese e histórico. O paciente preenche antes da consulta, você chega preparado.",
  },
  {
    Icon: Users,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    title: "Prontuário clínico",
    description: "Evolução clínica, anotações de consulta, arquivos e exames organizados por paciente.",
  },
  {
    Icon: CalendarDays,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    title: "Agenda integrada",
    description: "Gerencie consultas presenciais e online. Sincronize com o Google Agenda automaticamente.",
  },
  {
    Icon: Utensils,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    title: "Planos alimentares",
    description: "Crie cardápios com arrastar e soltar usando a tabela TACO. Exporte em PDF e compartilhe no portal.",
  },
  {
    Icon: TrendingUp,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    title: "Antropometria e evolução",
    description: "Acompanhe peso, medidas, IMC e dobras cutâneas. Gráficos de evolução disponíveis ao paciente.",
  },
  {
    Icon: MessageCircle,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    title: "Portal do paciente",
    description: "Cardápio, diário alimentar, metas, registros de peso, consultas e chat — tudo em um só lugar.",
  },
  {
    Icon: BrainCircuit,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    title: "IA assistiva",
    description: "Resumos clínicos, pontos de atenção automáticos e sugestões com IA integrada ao sistema.",
  },
  {
    Icon: Smartphone,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/40",
    title: "Funciona no celular",
    description: "Instalável como app (PWA). Lembretes automáticos de consulta para reduzir faltas.",
  },
  {
    Icon: Shield,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    title: "LGPD e segurança",
    description: "Dados isolados por clínica, criptografia de senhas e total conformidade com a LGPD.",
  },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-24 bg-warm-surface scroll-mt-[72px] relative overflow-hidden">
      {/* decorative leaf */}
      <div aria-hidden="true" className="absolute top-6 right-10 pointer-events-none hidden lg:block opacity-60">
        <svg width="48" height="70" viewBox="0 0 60 87" fill="none">
          <path d="M30 4 C52 9, 62 28, 59 48 C56 68, 42 83, 30 84 C18 83, 4 68, 1 48 C-2 28, 8 9, 30 4 Z" fill="#BFE3C0" fillOpacity="0.18" />
          <path d="M30 4 C52 9, 62 28, 59 48 C56 68, 42 83, 30 84 C18 83, 4 68, 1 48 C-2 28, 8 9, 30 4 Z" stroke="#7BAE7F" strokeWidth="1.1" fill="none" strokeOpacity="0.22" />
          <path d="M30 4 Q29.5 44, 30 84" stroke="#7BAE7F" strokeWidth="0.7" strokeOpacity="0.14" />
        </svg>
      </div>
      <div className="max-w-6xl mx-auto px-4">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Tudo que você precisa para organizar sua clínica
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto text-lg leading-relaxed">
            Uma plataforma completa para nutricionistas que valorizam a organização,
            o cuidado e a evolução contínua dos seus pacientes.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.05} direction="up">
              <div className="h-full bg-card-bg rounded-2xl p-6 border border-border-neutral hover:shadow-xl hover:shadow-black/6 dark:hover:shadow-black/25 hover:-translate-y-1.5 hover:border-border-neutral/80 transition-all duration-200 cursor-default">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${f.bg} mb-4`}>
                  <f.Icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
