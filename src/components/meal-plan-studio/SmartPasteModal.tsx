"use client";

import { useState } from "react";
import { X, Info } from "lucide-react";
import { parseSmartPasteText, type ParsedMeal } from "./smart-paste-parser";

export type { ParsedMeal };

interface SmartPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (meals: ParsedMeal[]) => void;
}

export function SmartPasteModal({ isOpen, onClose, onImport }: SmartPasteModalProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedMeal[] | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    const result = parseSmartPasteText(text);
    setParsed(result);
  };

  const handleImport = () => {
    if (parsed) {
      onImport(parsed);
      setText("");
      setParsed(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border-neutral">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Colar Inteligente</h2>
            <p className="text-sm text-text-secondary">Cole texto de um plano alimentar e o sistema tentará estruturá-lo automaticamente.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-semibold mb-1">Formato esperado:</p>
              <ul className="text-[10px] text-text-secondary mt-1 ml-4 list-disc space-y-0.5">
              <li>Para cada refeição, use um cabeçalho claro como <strong>&quot;Refeição 1: Café da Manhã&quot;</strong> ou apenas <strong>&quot;Almoço&quot;</strong>.</li>
              <li>Em seguida, liste os alimentos, começando pela quantidade. Ex: <strong>&quot;100g de frango&quot;</strong>, <strong>&quot;2 fatias de pão&quot;</strong>.</li>
              <li>A inteligência tentará mapear os nomes para a base natural TACO e trazer as calorias.</li>
            </ul>
            </div>
          </div>

          {!parsed ? (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Café da manhã 07:30:\n- 3 ovos mexidos\n- 1 fatia pão integral\n- café sem açúcar\n\nAlmoço 12:00:\n- 120g frango grelhado\n- 100g arroz integral\n- salada à vontade`}
              rows={10}
              className="w-full px-4 py-3 border border-border-neutral rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue font-mono text-sm"
            />
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              <p className="text-sm font-semibold text-text-primary">
                {parsed.length} refeição(ões) identificada(s):
              </p>
              {parsed.map((meal, i) => (
                <div key={i} className="bg-gray-50 border border-border-neutral rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-text-primary text-sm">{meal.name}</span>
                    {meal.time && (
                      <span className="text-xs text-text-secondary bg-white border border-border-neutral px-2 py-0.5 rounded-full">{meal.time}</span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {meal.items.map((item, j) => (
                      <li key={j} className="text-xs text-text-secondary flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-text-secondary shrink-0" />
                        <span className="font-medium">{item.quantity}{item.unit !== "unid" ? item.unit : "×"}</span>
                        {item.foodName}
                      </li>
                    ))}
                  </ul>
                  {meal.notes && (
                    <p className="text-xs text-text-secondary mt-1 italic">{meal.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {parsed ? (
              <>
                <button onClick={() => setParsed(null)} className="px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 rounded-lg transition-colors font-medium">
                  Editar texto
                </button>
                <button onClick={handleImport} className="px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-hover transition-colors text-sm font-medium">
                  Importar {parsed.length} refeição(ões)
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 rounded-lg transition-colors font-medium">
                  Cancelar
                </button>
                <button
                  onClick={handleParse}
                  disabled={!text.trim()}
                  className="px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-hover transition-colors text-sm font-medium disabled:opacity-60"
                >
                  Analisar Texto
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
