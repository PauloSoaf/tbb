"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="fixed bottom-8 right-8 z-50 print:hidden flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-full shadow-lg hover:bg-brand-hover transition-all hover:scale-105 font-medium"
    >
      <Printer className="w-5 h-5" />
      Imprimir / Salvar PDF
    </button>
  );
}
