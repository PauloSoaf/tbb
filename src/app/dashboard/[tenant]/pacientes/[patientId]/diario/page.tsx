import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { Metadata } from "next";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getPatientById } from "@/services/patient.service";
import { getPatientFoodDiary } from "@/services/patient-portal.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const metadata: Metadata = { title: "Diário Alimentar" };

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "Café da Manhã",
  MORNING_SNACK: "Lanche da Manhã",
  LUNCH: "Almoço",
  AFTERNOON_SNACK: "Lanche da Tarde",
  DINNER: "Jantar",
  SUPPER: "Ceia",
  OTHER: "Outro",
};

interface Props {
  params: Promise<{ tenant: string; patientId: string }>;
  searchParams: Promise<{ days?: string }>;
}

export default async function PatientFoodDiaryPage({ params, searchParams }: Props) {
  const { tenant, patientId: patientSlug } = await params;
  const { days: daysParam } = await searchParams;
  const { nutritionist } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientSlug);

  const patient = await getPatientById(nutritionist.id, patientId);
  if (!patient) notFound();

  const days = Math.min(Math.max(parseInt(daysParam ?? "7", 10) || 7, 1), 30);
  const entries = await getPatientFoodDiary(patientId, nutritionist.id, days);

  // Group entries by day
  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    const day = format(new Date(entry.loggedAt), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Meal timing heatmap: count entries per hour (5am–10pm)
  const hourCounts: number[] = Array(24).fill(0);
  for (const entry of entries) {
    const h = new Date(entry.loggedAt).getHours();
    hourCounts[h]++;
  }
  const maxHourCount = Math.max(...hourCounts, 1);
  const DISPLAY_HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  // Nutritional averages per day
  const totalKcal = entries.reduce((s, e) => s + (e.calories ?? 0), 0);
  const totalProt = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
  const totalCarbs2 = entries.reduce((s, e) => s + (e.carbs ?? 0), 0);
  const totalFat2 = entries.reduce((s, e) => s + (e.fat ?? 0), 0);
  const numDays = Math.max(sortedDays.length, 1);
  const avgKcal = Math.round(totalKcal / numDays);
  const avgProt = Math.round(totalProt / numDays);
  const avgCarbs = Math.round(totalCarbs2 / numDays);
  const avgFat = Math.round(totalFat2 / numDays);

  // Meal type distribution
  const mealTypeCounts: Record<string, number> = {};
  for (const entry of entries) {
    mealTypeCounts[entry.meal] = (mealTypeCounts[entry.meal] ?? 0) + 1;
  }
  const mealTypeTotal = Math.max(entries.length, 1);
  const MEAL_COLORS: Record<string, string> = {
    BREAKFAST: "#f59e0b",
    MORNING_SNACK: "#10b981",
    LUNCH: "#3b82f6",
    AFTERNOON_SNACK: "#8b5cf6",
    DINNER: "#ef4444",
    SUPPER: "#6366f1",
    OTHER: "#6b7280",
  };
  const mealTypeEntries = Object.entries(mealTypeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/${tenant}/pacientes/${patientId}`}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-blue" />
            Diário Alimentar
          </h1>
          <p className="text-text-secondary text-sm">{patient.name}</p>
        </div>
      </div>

      {/* Day filter */}
      <div className="flex gap-2 mb-6">
        {[7, 14, 30].map((d) => (
          <Link
            key={d}
            href={`?days=${d}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? "bg-brand-blue text-white"
                : "bg-surface-card border border-border-neutral text-text-secondary hover:text-text-primary"
            }`}
          >
            {d} dias
          </Link>
        ))}
      </div>

      {/* Nutritional averages */}
      {entries.length > 0 && avgKcal > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Média kcal/dia", value: `${avgKcal}`, unit: "kcal" },
            { label: "Proteínas/dia", value: `${avgProt}`, unit: "g" },
            { label: "Carboidratos/dia", value: `${avgCarbs}`, unit: "g" },
            { label: "Gorduras/dia", value: `${avgFat}`, unit: "g" },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-surface-card border border-border-neutral rounded-xl p-3 text-center">
              <p className="text-[10px] text-text-secondary leading-tight mb-1">{label}</p>
              <p className="text-lg font-bold text-text-primary">{value}<span className="text-xs font-normal ml-0.5">{unit}</span></p>
            </div>
          ))}
        </div>
      )}

      {/* Meal timing heatmap */}
      {entries.length > 0 && (
        <div className="bg-surface-card border border-border-neutral rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-text-primary mb-3">Horários de refeição (últimos {days} dias)</p>
          <div className="flex items-end gap-1">
            {DISPLAY_HOURS.map((h) => {
              const count = hourCounts[h];
              const intensity = count / maxHourCount;
              const opacity = count === 0 ? 0.08 : 0.15 + intensity * 0.85;
              const heightPx = count === 0 ? 8 : Math.max(8, Math.round(intensity * 48));
              return (
                <div key={h} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${heightPx}px`,
                      backgroundColor: `rgba(59, 130, 246, ${opacity})`,
                    }}
                    title={`${h}:00 — ${count} registro(s)`}
                  />
                  <span className="text-[9px] text-text-secondary">{h}h</span>
                </div>
              );
            })}
          </div>
          {maxHourCount > 0 && (
            <p className="text-xs text-text-secondary mt-2">
              Pico: {hourCounts.indexOf(maxHourCount)}h ({maxHourCount} registro{maxHourCount > 1 ? "s" : ""})
            </p>
          )}
        </div>
      )}

      {/* Meal type distribution */}
      {mealTypeEntries.length > 0 && (
        <div className="bg-surface-card border border-border-neutral rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-text-primary mb-3">Distribuição por tipo de refeição</p>
          <div className="space-y-2">
            {mealTypeEntries.map(([type, count]) => {
              const pct = Math.round((count / mealTypeTotal) * 100);
              const color = MEAL_COLORS[type] ?? "#6b7280";
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-32 shrink-0">{MEAL_LABELS[type] ?? type}</span>
                  <div className="flex-1 bg-border-neutral/30 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary w-12 text-right">{count}x ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sortedDays.length === 0 ? (
        <div className="bg-surface-card border border-border-neutral rounded-xl p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 text-border-neutral mx-auto mb-3" />
          <p className="text-text-secondary">Nenhum registro encontrado nos últimos {days} dias.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => {
            const dayEntries = grouped[day];
            const totalCalories = dayEntries.reduce((s, e) => s + (e.calories ?? 0), 0);
            const totalProtein = dayEntries.reduce((s, e) => s + (e.protein ?? 0), 0);
            const totalCarbs = dayEntries.reduce((s, e) => s + (e.carbs ?? 0), 0);
            const totalFat = dayEntries.reduce((s, e) => s + (e.fat ?? 0), 0);

            return (
              <div key={day} className="bg-surface-card border border-border-neutral rounded-xl overflow-hidden">
                {/* Day header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-neutral bg-surface-bg">
                  <p className="font-semibold text-text-primary">
                    {format(new Date(day + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  {totalCalories > 0 && (
                    <span className="text-xs text-text-secondary bg-surface-card px-2 py-1 rounded-lg border border-border-neutral">
                      {Math.round(totalCalories)} kcal total
                    </span>
                  )}
                </div>

                {/* Entries */}
                <div className="divide-y divide-border-neutral">
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">
                              {MEAL_LABELS[entry.meal] ?? entry.meal}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {format(new Date(entry.loggedAt), "HH:mm")}
                            </span>
                          </div>
                          <p className="font-medium text-text-primary text-sm">
                            {entry.foodName}
                            {entry.quantity && entry.unit ? ` — ${entry.quantity}${entry.unit}` : ""}
                          </p>
                          {entry.notes && (
                            <p className="text-xs text-text-secondary mt-0.5 italic">{entry.notes}</p>
                          )}
                        </div>
                        {entry.calories != null && (
                          <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
                            {Math.round(entry.calories)} kcal
                          </span>
                        )}
                      </div>

                      {/* Hunger/mood */}
                      {(entry.hunger != null || entry.mood) && (
                        <div className="flex gap-3 mt-1.5">
                          {entry.hunger != null && (
                            <span className="text-xs text-text-secondary">
                              Fome: {entry.hunger}/10
                            </span>
                          )}
                          {entry.satiety != null && (
                            <span className="text-xs text-text-secondary">
                              Saciedade: {entry.satiety}/10
                            </span>
                          )}
                          {entry.mood && (
                            <span className="text-xs text-text-secondary">Humor: {entry.mood}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Day totals */}
                {totalCalories > 0 && (
                  <div className="px-4 py-2 bg-surface-bg border-t border-border-neutral flex gap-4 text-xs text-text-secondary">
                    <span>P: <strong className="text-text-primary">{Math.round(totalProtein)}g</strong></span>
                    <span>C: <strong className="text-text-primary">{Math.round(totalCarbs)}g</strong></span>
                    <span>G: <strong className="text-text-primary">{Math.round(totalFat)}g</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
