import { Users, Calendar, TrendingUp, FileText, BarChart2 } from "lucide-react";

export function HeroDashboardMockup() {
  return (
    <div
      className="rounded-2xl border border-border-neutral bg-card-bg shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden text-xs select-none"
      aria-hidden="true"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-warm-beige dark:bg-warm-beige border-b border-border-neutral">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
        <div className="flex-1 mx-3">
          <div className="h-3.5 bg-border-neutral/50 rounded w-40 mx-auto" />
        </div>
      </div>

      <div className="flex h-[260px]">
        {/* Sidebar */}
        <div className="w-14 bg-warm-surface dark:bg-warm-surface border-r border-border-neutral flex flex-col items-center py-3 gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-blue/15 flex items-center justify-center mb-1">
            <div className="w-3.5 h-3.5 rounded-sm bg-brand-blue/70" />
          </div>
          {[
            { Icon: Users, active: true },
            { Icon: Calendar, active: false },
            { Icon: FileText, active: false },
            { Icon: TrendingUp, active: false },
            { Icon: BarChart2, active: false },
          ].map(({ Icon, active }, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                active ? "bg-brand-blue-soft" : "hover:bg-warm-beige"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-brand-blue" : "text-text-secondary"}`} />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-3 bg-background overflow-hidden space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Pacientes", value: "47", bg: "bg-blue-50 dark:bg-blue-900/20" },
              { label: "Hoje", value: "3", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
              { label: "Planos", value: "12", bg: "bg-violet-50 dark:bg-violet-900/20" },
            ].map(({ label, value, bg }) => (
              <div key={label} className={`${bg} rounded-lg p-2`}>
                <div className="text-[9px] text-text-secondary">{label}</div>
                <div className="font-bold text-text-primary text-sm">{value}</div>
              </div>
            ))}
          </div>

          {/* Patients list */}
          <div className="space-y-1">
            <div className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Pacientes recentes
            </div>
            {[
              { name: "Julia Santos", tag: "Pré-consulta", dot: "bg-amber-400" },
              { name: "Marco Alves", tag: "Ativo", dot: "bg-emerald-400" },
              { name: "Bruna Lima", tag: "Retorno", dot: "bg-blue-400" },
            ].map(({ name, tag, dot }) => (
              <div
                key={name}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-warm-surface cursor-default"
              >
                <div className={`w-5 h-5 rounded-full ${dot} opacity-70 shrink-0`} />
                <span className="flex-1 text-[10px] font-medium text-text-primary truncate">{name}</span>
                <span className="text-[8px] text-text-secondary bg-warm-surface px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              </div>
            ))}
          </div>

          {/* Mini bar chart */}
          <div className="bg-warm-surface rounded-lg p-2">
            <div className="text-[9px] text-text-secondary mb-2">Consultas — 6 meses</div>
            <div className="flex items-end gap-1 h-8">
              {[3, 5, 4, 7, 6, 9].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-brand-blue/25 dark:bg-brand-blue/35"
                  style={{ height: `${(h / 9) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[7px] text-text-secondary mt-1">
              {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
