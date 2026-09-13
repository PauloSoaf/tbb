import { PartialMealItem } from "@/lib/utils/nutrition";
import { Trash2, Edit2 } from "lucide-react";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface MealItemRowProps {
  item: PartialMealItem;
  onRemove: () => void | Promise<void>;
  onEdit?: () => void; // Future: allow inline editing
}

export function MealItemRow({ item, onRemove, onEdit }: MealItemRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-neutral last:border-0 hover:bg-warm-beige/50 transition-colors px-2 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate" title={item.foodName}>
          {item.foodName}
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          {item.quantity}{item.unit} {item.householdMeasure ? `(${item.householdMeasure})` : ""}
          <span className="mx-2">•</span>
          {item.calories} kcal
          <span className="mx-2">•</span>
          C: {item.carbs}g | P: {item.protein}g | G: {item.fat}g
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 text-text-secondary hover:text-brand-blue hover:bg-brand-blue/10 rounded transition-colors"
            title="Editar item"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        <AsyncButton
          onClick={onRemove}
          pendingLabel={null}
          className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded transition-colors"
          title="Remover item"
          aria-label="Remover item"
        >
          <Trash2 className="w-4 h-4" />
        </AsyncButton>
      </div>
    </div>
  );
}
