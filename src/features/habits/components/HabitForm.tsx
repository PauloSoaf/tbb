import type { Habit, HabitSchedule } from "@prisma/client";
import { ActionForm } from "@/components/ui/ActionForm";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { saveHabit } from "../actions";

const types = { BOOLEAN: "Sim ou não", QUANTITY: "Quantidade", DURATION: "Duração", PAGES: "Páginas", DISTANCE: "Distância", MONEY: "Dinheiro", CUSTOM: "Personalizado" };
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function HabitForm({ habit, today }: { habit?: Habit & { schedule: HabitSchedule | null }; today: string }) {
  return <ActionForm action={saveHabit} className="stack" resetOnSuccess={!habit}>
    {habit && <input type="hidden" name="id" value={habit.id} />}
    <div className="form-grid">
      <label className="field">Nome<input name="name" required maxLength={100} defaultValue={habit?.name} placeholder="Ler todos os dias" /></label>
      <label className="field">Tipo<select name="type" defaultValue={habit?.type ?? "BOOLEAN"}>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field">Meta por período<input name="target" type="number" min="0.000001" step="any" max="1000000000" defaultValue={habit?.target ?? 1} required /></label>
      <label className="field">Unidade<input name="unit" maxLength={30} defaultValue={habit?.unit ?? "vezes"} placeholder="minutos, páginas, km…" required /><small className="muted">Para duração, registre sempre na mesma unidade.</small></label>
      <label className="field">Período<select name="frequency" defaultValue={habit?.frequency ?? "DAILY"}><option value="DAILY">Por dia</option><option value="WEEKLY">Por semana</option><option value="MONTHLY">Por mês</option></select></label>
      <label className="field">Cor<input name="color" type="color" defaultValue={habit?.color ?? "#10b981"} /></label>
      <label className="field">Ícone<input name="icon" maxLength={8} defaultValue={habit?.icon ?? "◉"} required /></label>
      <label className="field">Início<input name="startDate" type="date" defaultValue={habit?.startDate ?? today} required /></label>
      <label className="field">Fim opcional<input name="endDate" type="date" defaultValue={habit?.endDate ?? ""} /></label>
      <label className="field">Horário do lembrete<input name="time" type="time" defaultValue={habit?.schedule?.time ?? ""} /></label>
      <label className="field">Dia do lembrete mensal<input name="monthlyDay" type="number" min="1" max="31" defaultValue={habit?.schedule?.monthlyDay ?? ""} placeholder="Opcional" /><small className="muted">Dias 29–31 usam o último dia de meses mais curtos.</small></label>
    </div>
    <fieldset><legend className="muted">Dias para registrar</legend><div className="row" style={{ flexWrap: "wrap", gap: 14, marginTop: 8 }}>{weekdays.map((label, value) => <label key={value} className="row" style={{ gap: 5 }}><input name="days" type="checkbox" value={value} defaultChecked={habit?.schedule ? habit.schedule.days.includes(value) : true} />{label}</label>)}</div></fieldset>
    <label className="field">Descrição<textarea name="description" maxLength={2000} rows={2} defaultValue={habit?.description ?? ""} placeholder="O que este hábito significa para você?" /></label>
    <div><PendingSubmitButton className="button">{habit ? "Salvar alterações" : "Criar hábito"}</PendingSubmitButton></div>
  </ActionForm>;
}
