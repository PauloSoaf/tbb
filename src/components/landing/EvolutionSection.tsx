import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

function EvolutionChart() {
  const weights = [82.5, 81.8, 81.2, 80.5, 79.8, 79.1, 78.2];
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const toY = (v: number) => ((max - v) / (max - min)) * 80;

  const points = weights.map((w, i) => `${i * (220 / 6)},${toY(w)}`).join(" ");

  return (
    <div className="bg-card-bg rounded-2xl border border-border-neutral shadow-xl shadow-black/5 dark:shadow-black/20 p-5 select-none" aria-hidden="true">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-text-secondary">Evolução de peso</div>
          <div className="text-sm font-bold text-text-primary">Paulo Amorim — 7 semanas</div>
        </div>
        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">
          <TrendingDown className="w-3.5 h-3.5" />
          −4.3 kg
        </div>
      </div>

      {/* Chart */}
      <svg viewBox="0 0 220 90" className="w-full">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <polygon
          points={`0,${toY(weights[0])} ${points} 220,90 0,90`}
          fill="url(#wg)"
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#10b981"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {weights.map((w, i) => (
          <circle key={i} cx={i * (220 / 6)} cy={toY(w)} r="3" fill="#10b981" />
        ))}
      </svg>

      {/* Labels */}
      <div className="flex justify-between mt-2">
        {["S1", "S2", "S3", "S4", "S5", "S6", "S7"].map((s) => (
          <span key={s} className="text-[9px] text-text-secondary">{s}</span>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { label: "Peso inicial", value: "82.5 kg", icon: Minus, color: "text-text-secondary" },
          { label: "Peso atual", value: "78.2 kg", icon: TrendingDown, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "IMC atual", value: "24.8", icon: TrendingDown, color: "text-emerald-600 dark:text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-warm-surface rounded-xl px-2.5 py-2 text-center">
            <div className="text-[9px] text-text-secondary mb-0.5">{label}</div>
            <div className={`text-xs font-bold ${color} flex items-center justify-center gap-0.5`}>
              <Icon className="w-3 h-3" />
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvolutionSection() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* decorative leaf */}
      <div aria-hidden="true" className="absolute bottom-12 right-6 pointer-events-none hidden lg:block opacity-50">
        <svg width="42" height="61" viewBox="0 0 60 87" fill="none">
          <path d="M30 4 C52 9, 62 28, 59 48 C56 68, 42 83, 30 84 C18 83, 4 68, 1 48 C-2 28, 8 9, 30 4 Z" fill="#E8DCC8" fillOpacity="0.22" />
          <path d="M30 4 C52 9, 62 28, 59 48 C56 68, 42 83, 30 84 C18 83, 4 68, 1 48 C-2 28, 8 9, 30 4 Z" stroke="#b8894d" strokeWidth="1" fill="none" strokeOpacity="0.2" />
          <path d="M30 4 Q29.5 44, 30 84" stroke="#b8894d" strokeWidth="0.6" strokeOpacity="0.12" />
        </svg>
      </div>
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <ScrollReveal>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold mb-5">
                <TrendingUp className="w-3.5 h-3.5" />
                Evolução do paciente
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-5 leading-tight">
                Transforme acompanhamento{" "}
                <span className="text-emerald-600 dark:text-emerald-400">em dados claros e motivadores</span>
              </h2>
              <p className="text-text-secondary text-lg leading-relaxed mb-8">
                Visualize a evolução completa do paciente: peso, medidas, IMC, gordura corporal
                e dobras cutâneas. Gráficos disponíveis tanto para a nutricionista quanto para o paciente no portal.
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-2 gap-4">
              {[
                { metric: "Peso", icon: "⚖️" },
                { metric: "IMC", icon: "📊" },
                { metric: "% Gordura", icon: "📉" },
                { metric: "Massa magra", icon: "💪" },
                { metric: "Cintura", icon: "📐" },
                { metric: "Dobras cutâneas", icon: "🔬" },
              ].map(({ metric, icon }, i) => (
                <ScrollReveal key={metric} delay={0.1 + i * 0.06}>
                  <div className="flex items-center gap-2.5 bg-warm-surface rounded-xl px-3.5 py-2.5 border border-border-neutral">
                    <span className="text-base">{icon}</span>
                    <span className="text-sm font-medium text-text-primary">{metric}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Chart mockup */}
          <ScrollReveal direction="right" delay={0.15}>
            <EvolutionChart />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
