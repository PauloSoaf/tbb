"use client";

import { useTransition, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { AsyncButton } from "@/components/ui/AsyncButton";

export function ComparisonNavigationForm({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    const query = new URLSearchParams();
    const data = new FormData(event.currentTarget);
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value) query.set(key, value);
    }

    startTransition(() => {
      router.push(query.size > 0 ? `${pathname}?${query.toString()}` : pathname);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isPending || undefined}
      className="grid grid-cols-1 items-end gap-4 rounded-xl border border-border-neutral bg-card-bg p-5 md:grid-cols-[1fr_1fr_auto]"
    >
      {children}
      <AsyncButton
        type="submit"
        pending={isPending}
        pendingLabel="Comparando..."
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
      >
        <ArrowLeftRight className="h-4 w-4" />
        Comparar
      </AsyncButton>
    </form>
  );
}
