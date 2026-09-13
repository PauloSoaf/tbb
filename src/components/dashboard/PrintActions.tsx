"use client";

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PrintActionsProps {
  backHref: string;
}

export function PrintActions({ backHref }: PrintActionsProps) {
  return (
    <div className="no-print fixed top-4 right-4 flex gap-3 z-50">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200
          text-gray-700 text-sm rounded-lg shadow hover:shadow-md transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>
      <button
        id="btn-imprimir"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
          text-white text-sm rounded-lg shadow hover:shadow-md transition-all"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
    </div>
  );
}
