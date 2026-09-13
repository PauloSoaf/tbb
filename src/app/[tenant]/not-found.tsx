import Link from "next/link";
import { SearchX } from "lucide-react";
import { NutriOpusIcon } from "@/components/brand/NutriOpusIcon";

export default function TenantNotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-warm-beige mb-6">
          <SearchX className="w-10 h-10 text-text-secondary" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          Nutricionista não encontrado(a)
        </h1>
        <p className="text-text-secondary mb-8">
          Não encontramos o perfil que você está procurando. Verifique o link e
          tente novamente.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl
            font-semibold hover:bg-brand-blue-hover transition-all duration-300"
        >
          <NutriOpusIcon size={24} className="h-6 w-6 object-contain" />
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
