import { SearchX } from "lucide-react";
import { ContextualHomeLink } from "@/components/navigation/ContextualHomeLink";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-warm-beige mb-6">
          <SearchX className="w-10 h-10 text-text-secondary" />
        </div>
        <p className="text-6xl font-black text-brand-blue mb-4">404</p>
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          Página não encontrada
        </h1>
        <p className="text-text-secondary mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>
        <ContextualHomeLink
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl
            font-semibold hover:bg-brand-blue-hover transition-all duration-300"
        />
      </div>
    </main>
  );
}
