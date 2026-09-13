"use client";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, Scale, Calendar, Sparkles, Check } from "lucide-react";

interface NotificationCard {
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  sub: string;
}

const cards: NotificationCard[] = [
  {
    Icon: FileText,
    iconBg: "bg-amber-50 dark:bg-amber-900/25",
    iconColor: "text-amber-600 dark:text-amber-400",
    label: "Pré-consulta recebida",
    sub: "Julia Santos · agora mesmo",
  },
  {
    Icon: Scale,
    iconBg: "bg-blue-50 dark:bg-blue-900/25",
    iconColor: "text-blue-600 dark:text-blue-400",
    label: "Paciente registrou o peso",
    sub: "Paulo → 78.2 kg ↓ 0.8",
  },
  {
    Icon: Calendar,
    iconBg: "bg-violet-50 dark:bg-violet-900/25",
    iconColor: "text-violet-600 dark:text-violet-400",
    label: "Consulta em 30 min",
    sub: "Marco Alves · 14h00",
  },
  {
    Icon: Sparkles,
    iconBg: "bg-indigo-50 dark:bg-indigo-900/25",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    label: "IA resumiu prontuário",
    sub: "Bruna Lima · revisão disponível",
  },
  {
    Icon: Check,
    iconBg: "bg-emerald-50 dark:bg-emerald-900/25",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    label: "Plano alimentar liberado",
    sub: "Cardápio enviado ao portal",
  },
];

type Position = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
};

const positions: { pos: Position; delay: number; floatDelay: number }[] = [
  { pos: { top: "5%", right: "-8%" }, delay: 0.2, floatDelay: 0 },
  { pos: { top: "38%", left: "-10%" }, delay: 0.6, floatDelay: 0.8 },
  { pos: { bottom: "28%", right: "-6%" }, delay: 0.4, floatDelay: 0.4 },
  { pos: { bottom: "5%", left: "-6%" }, delay: 1.0, floatDelay: 1.2 },
];

export function FloatingNotifications() {
  const reduced = useReducedMotion();

  return (
    <>
      {cards.slice(0, 4).map((card, i) => {
        const { pos, delay, floatDelay } = positions[i];
        const { Icon } = card;

        return (
          <motion.div
            key={card.label}
            className="absolute z-10 flex items-center gap-2.5 bg-card-bg/95 backdrop-blur-sm border border-border-neutral rounded-xl px-3 py-2.5 shadow-lg shadow-black/8 dark:shadow-black/30 min-w-[180px] max-w-[220px] cursor-default select-none"
            style={pos}
            initial={reduced ? {} : { opacity: 0, scale: 0.85 }}
            animate={
              reduced
                ? {}
                : {
                    opacity: 1,
                    scale: 1,
                    y: [0, -7, 0],
                  }
            }
            whileHover={reduced ? {} : { scale: 1.05, boxShadow: "0 12px 28px -8px rgba(0,0,0,0.14)" }}
            transition={{
              opacity: { delay, duration: 0.4 },
              scale: { delay, duration: 0.4, type: "spring", stiffness: 200 },
              y: {
                delay: floatDelay + 0.8,
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          >
            <div className={`w-7 h-7 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-text-primary leading-tight">{card.label}</div>
              <div className="text-[9px] text-text-secondary leading-tight mt-0.5 truncate">{card.sub}</div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
