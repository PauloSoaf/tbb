"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/demo/demo-context";
import { DemoCard } from "@/demo/components/DemoUi";

export default function DemoPortalShoppingPage() {
  const { t } = useI18n();
  const { shoppingItems, toggleShoppingItem } = useDemo();

  const byCategory = new Map<string, typeof shoppingItems>();
  for (const item of shoppingItems) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  const copyList = () => {
    const text = shoppingItems
      .filter((i) => !i.bought)
      .map((i) => `- ${i.name} (${i.quantity})`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => toast.success(t("demo.pages.list_copied")));
  };

  const pending = shoppingItems.filter((i) => !i.bought).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary">{t("nav.shopping_list")}</h1>
          <p className="text-sm text-text-secondary">{pending} {t("demo.pages.pending_items")}</p>
        </div>
        <button type="button" onClick={copyList} className="inline-flex items-center gap-1.5 rounded-xl border border-border-neutral bg-card-bg px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-brand-blue">
          <Copy className="h-4 w-4" />
          {t("demo.pages.copy_list")}
        </button>
      </div>

      {[...byCategory.entries()].map(([category, items]) => (
        <DemoCard key={category} title={category}>
          <div className="space-y-1.5">
            {items.map((item) => (
              <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-warm">
                <input
                  type="checkbox"
                  checked={item.bought}
                  onChange={() => toggleShoppingItem(item.id)}
                  className="h-4 w-4 accent-[var(--brand-blue,#2563eb)]"
                />
                <span className={`flex-1 text-sm ${item.bought ? "text-text-secondary line-through" : "text-text-primary"}`}>
                  {item.name}
                </span>
                <span className="text-xs text-text-secondary">{item.quantity}</span>
              </label>
            ))}
          </div>
        </DemoCard>
      ))}
    </div>
  );
}
