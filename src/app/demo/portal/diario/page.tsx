"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/demo/demo-context";
import { DemoCard } from "@/demo/components/DemoUi";

const MEAL_OPTIONS = ["Café da manhã", "Almoço", "Lanche", "Jantar", "Ceia"];

export default function DemoPortalDiaryPage() {
  const { t } = useI18n();
  const { diaryEntries, addDiaryEntry } = useDemo();
  const [meal, setMeal] = useState(MEAL_OPTIONS[0]);
  const [description, setDescription] = useState("");

  const submit = () => {
    if (!description.trim()) return;
    addDiaryEntry(meal, description.trim());
    setDescription("");
    toast.success(t("demo.pages.diary_saved"));
  };

  const byDate = new Map<string, typeof diaryEntries>();
  for (const e of diaryEntries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-text-primary">{t("nav.diary")}</h1>

      <DemoCard title={t("demo.pages.register_meal")}>
        <div className="flex flex-wrap gap-2">
          <select
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            className="rounded-xl border border-border-neutral bg-surface-warm px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue"
          >
            {MEAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder={t("demo.pages.diary_placeholder")}
            className="min-w-0 flex-1 rounded-xl border border-border-neutral bg-surface-warm px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue"
          />
          <button type="button" onClick={submit} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover">
            <Plus className="h-4 w-4" />
            {t("demo.pages.save")}
          </button>
        </div>
      </DemoCard>

      {[...byDate.entries()].map(([date, entries]) => (
        <DemoCard key={date} title={date}>
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start gap-3 rounded-xl bg-surface-warm px-3 py-2">
                <span className="text-lg">{e.feeling ?? "🍽"}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{e.meal}</p>
                  <p className="text-sm text-text-secondary">{e.description}</p>
                </div>
              </div>
            ))}
          </div>
        </DemoCard>
      ))}
    </div>
  );
}
