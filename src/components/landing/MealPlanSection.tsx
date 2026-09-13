import { Utensils, FileDown, LayoutGrid, Database } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

function MealPlanMockup() {
  const meals = [
    {
      time: "Café da manhã",
      items: ["Omelete de claras (3)", "Pão integral (1 fatia)", "Café sem açúcar"],
      kcal: 320,
    },
    {
      time: "Almoço",
      items: ["Arroz integral", "Feijão carioca", "Frango grelhado", "Salada verde"],
      kcal: 610,
    },
    {
      time: "Lanche",
      items: ["Iogurte natural", "Castanhas (30g)"],
      kcal: 210,
    },
  ];

  return (
    <div className="bg-card-bg rounded-2xl border border-border-neutral shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden select-none" aria-hidden="true">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-neutral bg-warm-surface">
        <div className="flex-1 text-sm font-semibold text-text-primary">Plano Semana 1 — Julia Santos</div>
        <div className="flex gap-1.5">
          {["Clínico", "Visual"].map((v, i) => (
            <button
              key={v}
              className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                i === 0 ? "bg-brand-blue text-white" : "text-text-secondary hover:bg-warm-beige"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <FileDown className="w-4 h-4 text-text-secondary ml-1" />
      </div>

      {/* Macros bar */}
      <div className="grid grid-cols-4 gap-0 border-b border-border-neutral text-center">
        {[
          { label: "Energia", value: "1.640 kcal", color: "text-orange-500 dark:text-orange-400" },
          { label: "Prot.", value: "132g", color: "text-blue-500 dark:text-blue-400" },
          { label: "Carb.", value: "148g", color: "text-amber-500 dark:text-amber-400" },
          { label: "Gord.", value: "52g", color: "text-rose-500 dark:text-rose-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-2 px-1 border-r border-border-neutral last:border-0">
            <div className="text-[9px] text-text-secondary">{label}</div>
            <div className={`text-xs font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Meal cards */}
      <div className="p-3 space-y-2.5">
        {meals.map((meal) => (
          <div key={meal.time} className="bg-warm-surface rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Utensils className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-[11px] font-semibold text-text-primary">{meal.time}</span>
              </div>
              <span className="text-[10px] text-text-secondary">{meal.kcal} kcal</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {meal.items.map((item) => (
                <span key={item} className="text-[9px] bg-card-bg border border-border-neutral text-text-secondary px-2 py-0.5 rounded-full">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MealPlanSection() {
  return (
    <section className="py-24 bg-warm-surface">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <ScrollReveal>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold mb-5">
                <Utensils className="w-3.5 h-3.5" />
                Planos alimentares
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-5 leading-tight">
                Crie cardápios{" "}
                <span className="text-emerald-600 dark:text-emerald-400">bonitos e reutilizáveis</span>{" "}
                sem esforço
              </h2>
              <p className="text-text-secondary text-lg leading-relaxed mb-8">
                Estúdio de planos alimentares com arrastar e soltar, integrado à tabela TACO.
                Exporte em PDF com a identidade da sua clínica e compartilhe diretamente no portal do paciente.
              </p>
            </ScrollReveal>

            <div className="space-y-4">
              {[
                { Icon: LayoutGrid, title: "Layouts clínico e visual", desc: "Alterne entre visualização clínica e layout bonito para o paciente.", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                { Icon: Database, title: "Tabela TACO integrada", desc: "Busque alimentos com valores nutricionais precisos direto no editor.", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
                { Icon: FileDown, title: "Export em PDF profissional", desc: "Gere e envie o plano para o paciente com um clique, com sua marca.", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
              ].map(({ Icon, title, desc, color, bg }, i) => (
                <ScrollReveal key={title} delay={0.15 + i * 0.1}>
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

          {/* Mockup */}
          <ScrollReveal direction="right" delay={0.15}>
            <MealPlanMockup />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
