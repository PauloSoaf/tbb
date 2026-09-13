import Link from "next/link";
import { SearchX } from "lucide-react";

export default function PortalNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warm-beige mb-5">
          <SearchX className="w-8 h-8 text-text-secondary" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">
          Página não encontrada
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          O conteúdo que você procura não existe ou foi removido.
        </p>
        <Link
          href="../"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-xl
            text-sm font-semibold hover:bg-brand-blue-hover transition-colors"
        >
          Voltar ao portal
        </Link>
      </div>
    </div>
  );
}
