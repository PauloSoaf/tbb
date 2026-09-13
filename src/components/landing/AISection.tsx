"use client";
import { useRef, useState, useEffect } from "react";
import { useInView, motion, useReducedMotion } from "framer-motion";
import { BrainCircuit, Send, Calendar, Sparkles } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

interface Message {
  role: "user" | "ai";
  text: string;
  delay?: number;
  action?: boolean;
}

const conversation: Message[] = [
  { role: "user", text: "Resuma o paciente Paulo Amorim." },
  { role: "ai", text: "Paulo tem objetivo de perda de peso, anamnese recente com queixas relatadas e última avaliação com IMC em sobrepeso. Sugiro revisar o plano alimentar e agendar retorno.", delay: 1400 },
  { role: "user", text: "Abra a agenda.", delay: 900 },
  { role: "ai", text: "Claro! Você pode abrir a agenda agora.", delay: 1000, action: true },
];

function AIAssistantDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (inView && !started) setStarted(true);
  }, [inView, started]);

  useEffect(() => {
    if (!started) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (reduced) { setVisible(conversation.length); return; }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;
    conversation.forEach((msg, i) => {
      cumulative += i === 0 ? 500 : (msg.delay ?? 900);
      timers.push(setTimeout(() => setVisible(i + 1), cumulative));
    });
    return () => timers.forEach(clearTimeout);
  }, [started, reduced]);

  return (
    <div ref={ref} className="bg-card-bg border border-border-neutral rounded-2xl overflow-hidden shadow-xl shadow-black/5 dark:shadow-black/25 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-neutral bg-warm-surface">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-text-primary">Assistente NutriOpus</div>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Online
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-indigo-400 ml-auto" />
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 min-h-[200px]">
        {conversation.slice(0, visible).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="bg-brand-blue text-white text-sm px-4 py-2 rounded-2xl rounded-tr-sm max-w-[75%] leading-relaxed">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[82%] space-y-2">
                <div className="bg-warm-surface border border-border-neutral text-sm px-4 py-2 rounded-2xl rounded-tl-sm text-text-primary leading-relaxed">
                  {msg.text}
                </div>
                {msg.action && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 }}
                    className="inline-flex items-center gap-1.5 text-xs text-brand-blue border border-brand-blue/30 rounded-lg px-3 py-1.5 bg-brand-blue-soft hover:bg-brand-blue hover:text-white transition-all duration-200"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Abrir agenda
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        ))}

        {/* Typing indicator */}
        {started && visible > 0 && visible < conversation.length && conversation[visible]?.role === "ai" && (
          <div className="flex justify-start">
            <div className="bg-warm-surface border border-border-neutral px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1 items-center h-3">
                {[0, 0.18, 0.36].map((d, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-text-secondary"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: d }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border-neutral flex gap-2 items-center">
        <div className="flex-1 bg-warm-surface border border-border-neutral rounded-xl px-3 py-2 text-sm text-text-secondary/60">
          Pergunte algo sobre seus pacientes...
        </div>
        <button aria-label="Enviar mensagem" className="w-8 h-8 bg-brand-blue text-white rounded-lg flex items-center justify-center hover:bg-brand-blue-hover transition-colors">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AISection() {
  return (
    <section id="ia" className="py-24 bg-warm-surface scroll-mt-[72px]">
      <div className="max-w-6xl mx-auto px-4">
        <ScrollReveal className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-semibold mb-5">
            <BrainCircuit className="w-3.5 h-3.5" />
            IA dentro do sistema
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Inteligência artificial{" "}
            <span className="text-indigo-600 dark:text-indigo-400">integrada ao seu fluxo de trabalho</span>
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
            A IA do NutriOpus resume prontuários, identifica pontos de atenção, responde perguntas
            e navega pelo sistema junto com você — sem sair da plataforma.
          </p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal delay={0.15}>
            <AIAssistantDemo />
          </ScrollReveal>

          <div className="space-y-5">
            {[
              {
                title: "Resumo instantâneo de prontuário",
                desc: "Peça um resumo do paciente antes de entrar na consulta. A IA analisa histórico, evolução e últimas anotações.",
                color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
              },
              {
                title: "Pontos de atenção automáticos",
                desc: "Alergias, medicamentos incompatíveis, restrições alimentares — detectados automaticamente na pré-consulta.",
                color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
              },
              {
                title: "Navegação por voz e texto",
                desc: 'Diga "abra a agenda" ou "mostre os pacientes de hoje" e a IA navega pelo sistema para você.',
                color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
              },
              {
                title: "Relatórios de progresso",
                desc: "Avaliação automática de adesão calórica, evolução e sugestões clínicas baseadas nos dados do paciente.",
                color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
              },
            ].map(({ title, desc, color }, i) => (
              <ScrollReveal key={title} delay={0.2 + i * 0.08}>
                <div className="flex gap-4">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${color.split(" ").slice(-2).join(" ")}`} />
                  <div>
                    <div className="font-semibold text-text-primary mb-1">{title}</div>
                    <div className="text-sm text-text-secondary">{desc}</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
