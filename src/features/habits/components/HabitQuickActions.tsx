import { ActionForm } from "@/components/ui/ActionForm";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { recordHabitEntry } from "../actions";

export function HabitQuickActions({ habitId, date, type, completed, value }: { habitId: string; date: string; type: string; completed: boolean; value: number }) {
  const actions = type === "BOOLEAN"
    ? [{ operation: value > 0 ? "undo" : "complete", label: value > 0 ? "Desfazer" : "Concluir", text: value > 0 ? "✓ Feito" : "Concluir" }]
    : [{ operation: "decrement", label: "Diminuir um", text: "−" }, { operation: "increment", label: "Adicionar um", text: "+" }, { operation: value > 0 && completed ? "undo" : "complete", label: value > 0 && completed ? "Desfazer registro de hoje" : "Completar meta do período", text: value > 0 && completed ? "Desfazer" : "Concluir" }];
  return <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{actions.map(({ operation, label, text }) => <ActionForm key={operation} action={recordHabitEntry}>
    <input type="hidden" name="habitId" value={habitId} /><input type="hidden" name="date" value={date} /><input type="hidden" name="operation" value={operation} /><input type="hidden" name="value" value="1" />
    <AppTooltip content={label}><PendingSubmitButton className={operation === "complete" ? "button" : "button-secondary"} aria-label={label} pendingLabel={null}>{text}</PendingSubmitButton></AppTooltip>
  </ActionForm>)}</div>;
}
