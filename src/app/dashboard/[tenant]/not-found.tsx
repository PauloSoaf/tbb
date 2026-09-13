import { SearchX } from "lucide-react";
import { ContextualHomeLink } from "@/components/navigation/ContextualHomeLink";

export default function DashboardNotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-warm-beige">
          <SearchX className="h-10 w-10 text-text-secondary" />
        </div>
        <p className="mb-4 text-6xl font-black text-brand-blue">404</p>
        <h1 className="mb-3 text-2xl font-bold text-text-primary">Página não encontrada</h1>
        <p className="mb-8 text-text-secondary">
          Este conteúdo não existe, foi movido ou você não possui mais acesso a ele.
        </p>
        <ContextualHomeLink
          label="Voltar ao dashboard"
          pendingLabel="Abrindo dashboard..."
          className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover"
        />
      </div>
    </main>
  );
}
