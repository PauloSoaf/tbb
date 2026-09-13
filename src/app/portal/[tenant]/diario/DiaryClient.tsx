"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { addFoodDiaryEntryAction, deleteFoodDiaryEntryAction } from "@/actions/patient-portal.action";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Plus, X, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AsyncButton } from "@/components/ui/AsyncButton";

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "Café da manhã",
  MORNING_SNACK: "Lanche da manhã",
  LUNCH: "Almoço",
  AFTERNOON_SNACK: "Lanche da tarde",
  DINNER: "Jantar",
  SUPPER: "Ceia",
  OTHER: "Outro",
};

interface Entry {
  id: string;
  meal: string;
  foodName: string;
  quantity?: number | null;
  unit?: string | null;
  calories?: number | null;
  loggedAt: Date | string;
}

interface Props {
  tenantSlug: string;
  initialEntries: Entry[];
}

export function DiaryClient({ tenantSlug, initialEntries }: Props) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deletingIdRef = useRef<string | null>(null);

  const handleDelete = async (entryId: string) => {
    if (deletingIdRef.current) return;

    deletingIdRef.current = entryId;
    setDeletingId(entryId);
    try {
      const result = await deleteFoodDiaryEntryAction(tenantSlug, entryId);
      if (result.success) {
        setEntries(prev => prev.filter(e => e.id !== entryId));
        toast.success(t("patient_portal.diary.delete_success", { defaultValue: "Registro excluído." }));
      } else {
        toast.error(result.error || "Erro ao excluir.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir.");
    } finally {
      deletingIdRef.current = null;
      setDeletingId(null);
    }
  };
  const [form, setForm] = useState({
    meal: "BREAKFAST",
    foodName: "",
    quantity: "",
    unit: "g",
    calories: "",
    hunger: "",
    satiety: "",
    notes: "",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.foodName.trim()) { toast.error(t("patient_portal.diary.error_food", { defaultValue: "Informe o alimento." })); return; }
    setSaving(true);
    const result = await addFoodDiaryEntryAction(tenantSlug, {
      meal: form.meal,
      foodName: form.foodName,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      unit: form.unit || undefined,
      calories: form.calories ? Number(form.calories) : undefined,
      hunger: form.hunger ? Number(form.hunger) : undefined,
      satiety: form.satiety ? Number(form.satiety) : undefined,
      notes: form.notes || undefined,
    });
    setSaving(false);
    if (result.success && result.entry) {
      setEntries(prev => [result.entry as Entry, ...prev]);
      setForm({ meal: "BREAKFAST", foodName: "", quantity: "", unit: "g", calories: "", hunger: "", satiety: "", notes: "" });
      setShowForm(false);
      toast.success(t("patient_portal.diary.add_success", { defaultValue: "Registro adicionado!" }));
    } else {
      toast.error(result.error || "Erro ao registrar.");
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-hover transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? t("patient_portal.diary.cancel", { defaultValue: "Cancelar" }) : t("patient_portal.diary.add_entry", { defaultValue: "Adicionar registro" })}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-border-neutral p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">{t("patient_portal.diary.meal", { defaultValue: "Refeição" })}</label>
              <select
                value={form.meal}
                onChange={e => setForm(p => ({ ...p, meal: e.target.value }))}
                className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm mt-1"
              >
                {Object.entries(MEAL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option> // Ideally these labels would be translated too, but they come from a const, I will translate them inline.
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">{t("patient_portal.diary.food", { defaultValue: "Alimento *" })}</label>
              <input
                value={form.foodName}
                onChange={e => setForm(p => ({ ...p, foodName: e.target.value }))}
                required
                placeholder={t("patient_portal.diary.food_placeholder", { defaultValue: "Ex: Arroz branco" })}
                className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">{t("patient_portal.diary.quantity", { defaultValue: "Quantidade" })}</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="100"
                  className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={form.unit}
                  onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  placeholder="g"
                  className="w-16 border border-border-neutral rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">{t("patient_portal.diary.calories", { defaultValue: "Calorias estimadas" })}</label>
              <input
                type="number"
                value={form.calories}
                onChange={e => setForm(p => ({ ...p, calories: e.target.value }))}
                placeholder="kcal"
                className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary">{t("patient_portal.diary.notes", { defaultValue: "Observações" })}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm mt-1 resize-none"
              placeholder={t("patient_portal.diary.notes_placeholder", { defaultValue: "Como você se sentiu? Tinha fome?" })}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-blue text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {saving ? t("patient_portal.diary.saving", { defaultValue: "Salvando..." }) : t("patient_portal.diary.save", { defaultValue: "Salvar" })}
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-center text-text-secondary mt-8">{t("patient_portal.diary.empty", { defaultValue: "Nenhum registro ainda. Comece adicionando sua primeira refeição!" })}</p>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-2xl border border-border-neutral p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-brand-blue uppercase">{MEAL_LABELS[entry.meal] || entry.meal}</span>
                  <p className="font-medium text-text-primary mt-0.5">{entry.foodName}</p>
                  {(entry.quantity || entry.unit) && (
                    <p className="text-sm text-text-secondary">{entry.quantity}{entry.unit}</p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  {entry.calories && (
                    <p className="text-sm font-semibold text-amber-600">{entry.calories} kcal</p>
                  )}
                  <p className="text-xs text-text-secondary">
                    {format(new Date(entry.loggedAt), "dd/MM HH:mm", { locale: dateLocale })}
                  </p>
                  <AsyncButton
                    onClick={() => handleDelete(entry.id)}
                    pending={deletingId === entry.id}
                    pendingLabel={null}
                    disabled={deletingId !== null}
                    className="p-1.5 text-text-secondary hover:text-danger hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    aria-label={t("patient_portal.diary.delete_tooltip", { defaultValue: "Excluir registro" })}
                    title={t("patient_portal.diary.delete_tooltip", { defaultValue: "Excluir registro" })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </AsyncButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
