"use client";

import { useTransition } from "react";
import { Clipboard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { copyShoppingListTextAction } from "@/actions/shopping-list.action";
import { useI18n } from "@/lib/i18n/I18nContext";

export function CopyShoppingListButton({
  tenantSlug,
  shoppingListId,
}: {
  tenantSlug: string;
  shoppingListId: string;
}) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  function copy() {
    startTransition(async () => {
      const result = await copyShoppingListTextAction(tenantSlug, shoppingListId);
      if (!result.success || !result.text) {
        toast.error(result.error ?? t("shopping_list.toasts.error_copy"));
        return;
      }
      try {
        await navigator.clipboard.writeText(result.text);
        toast.success(t("shopping_list.list_copied"));
      } catch {
        toast(t("shopping_list.copy_fallback"), { description: result.text });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl border border-border-neutral bg-card-bg px-3 py-2 text-sm font-semibold text-text-primary transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:text-brand-blue hover:shadow-sm disabled:opacity-70"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clipboard className="h-4 w-4" />}
      {t("shopping_list.copy_list")}
    </button>
  );
}
