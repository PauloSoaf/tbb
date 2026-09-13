"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { MealExtension } from './tiptap/MealExtension';
import { EditorImageExtension } from './tiptap/EditorImageExtension';
import { TiptapToolbar } from './TiptapToolbar';
import { useState } from 'react';
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { MealPlanImageUploadError, uploadMealPlanImage } from './meal-plan-image-upload';
import { useI18n } from '@/lib/i18n/I18nContext';
import { MealPlanNutritionistSignature } from '@/components/meal-plans/MealPlanNutritionistSignature';
import {
  MEAL_PLAN_LIBRARY_FOOD_DRAG_TYPE,
  MEAL_PLAN_LIBRARY_MEAL_DRAG_TYPE,
  parseLibraryDragPayload,
  savedMealToCanvasNode,
} from '@/lib/meal-plan/library-canvas';
import type { MealPlanLibraryFoodSnapshot, MealPlanLibraryMealSnapshot } from '@/lib/meal-plan/library-types';

interface TiptapCanvasProps {
  tenantSlug?: string;
  planId?: string;
  onStructuredImageDetached?: (url: string) => void;
  initialContent?: Record<string, unknown> | null;
  onChange: (json: Record<string, unknown>) => void;
  planTitle?: string;
  planObjective?: string | null;
  nutritionistName?: string | null;
  nutritionistCrn?: string | null;
  onSaveMealToLibrary?: (meal: MealPlanLibraryMealSnapshot) => Promise<void>;
  onSaveFoodToLibrary?: (food: MealPlanLibraryFoodSnapshot) => Promise<void>;
  onLibraryItemUsed?: (type: "MEAL" | "FOOD", id: string) => void;
  onMetaChange?: (field: string, value: string | Record<string, unknown> | Record<string, unknown>[]) => void;
}

export function TiptapCanvas({ tenantSlug, planId, onStructuredImageDetached, initialContent, onChange, planTitle, planObjective, nutritionistName, nutritionistCrn, onSaveMealToLibrary, onSaveFoodToLibrary, onLibraryItemUsed, onMetaChange }: TiptapCanvasProps) {
  const { t } = useI18n();
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      EditorImageExtension,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'Digite "/" para ver os comandos ou comece a escrever as orientações...',
      }),
      MealExtension.configure({
        planId,
        tenantSlug,
        onStructuredImageDetached,
        onSaveMealToLibrary,
        onSaveFoodToLibrary,
        onLibraryItemUsed,
      }),
    ],
    content: initialContent || { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        class: 'meal-plan-document prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[500px] relative isolate',
      },
      handleDrop: function(view, event, _slice, moved) {
        if (!moved && event.dataTransfer) {
          // Check for sticker/emoji payload
          const customData = event.dataTransfer.getData(MEAL_PLAN_LIBRARY_MEAL_DRAG_TYPE)
            || event.dataTransfer.getData(MEAL_PLAN_LIBRARY_FOOD_DRAG_TYPE)
            || event.dataTransfer.getData('application/json');
          if (customData) {
            try {
              const libraryPayload = parseLibraryDragPayload(customData);
              if (libraryPayload?.type === 'meal-plan-library-meal') {
                event.preventDefault();
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                editor?.chain().focus().insertContentAt(coordinates?.pos ?? view.state.doc.content.size, savedMealToCanvasNode(libraryPayload.meal)).run();
                onLibraryItemUsed?.('MEAL', libraryPayload.meal.id);
                return true;
              }

              const parsed = JSON.parse(customData);
              if (parsed.type === 'sticker' || parsed.type === 'block' || parsed.type === 'custom-sticker') {
                event.preventDefault();
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (coordinates) {
                  if (parsed.type === 'sticker') {
                    editor?.chain().focus().insertContentAt(coordinates.pos, parsed.content).run();
                  } else if (parsed.type === 'custom-sticker') {
                    editor?.chain().focus().insertContentAt(coordinates.pos, {
                      type: 'image',
                      attrs: { src: parsed.url }
                    }).run();
                  } else if (parsed.type === 'block') {
                    // depending on block type
                    if (parsed.id === 'checklist') {
                      editor?.chain().focus().insertContentAt(coordinates.pos, { type: 'taskList', content: [{ type: 'taskItem', content: [{ type: 'paragraph' }] }] }).run();
                    } else if (parsed.id === 'divider') {
                      editor?.chain().focus().insertContentAt(coordinates.pos, { type: 'horizontalRule' }).run();
                    } else if (parsed.id === 'alert') {
                      editor?.chain().focus().insertContentAt(coordinates.pos, { type: 'blockquote', content: [{ type: 'paragraph' }] }).run();
                    } else {
                      editor?.chain().focus().insertContentAt(coordinates.pos, { type: 'paragraph' }).run();
                    }
                  }
                }
                return true;
              }
            } catch {
              // Ignore parse errors
            }
          }

          if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            const file = event.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              uploadImage(file).then(url => {
                if (url) {
                  const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  editor?.chain().focus().insertContentAt(coordinates?.pos || 0, {
                    type: 'image',
                    attrs: { src: url, alt: '' }
                  }).run();
                }
              });
              return true;
            }
          }
        }
        return false;
      },
      handlePaste: function(_view, event) {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            uploadImage(file).then(url => {
              if (url) {
                editor?.chain().focus().setImage({ src: url, alt: '' }).run();
              }
            });
            return true;
          }
        }
        return false;
      }
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  const uploadImage = async (file: File) => {
    if (!planId) {
      toast.error(t('meal_plan_clinical.images.plan_required'));
      return null;
    }

    try {
      const result = await uploadMealPlanImage({
        file,
        planId,
        kind: 'EDITOR',
      });
      return result.url;
    } catch (error) {
      if (error instanceof MealPlanImageUploadError) {
        const message = error.message.startsWith('meal_plan_clinical.') ? t(error.message) : error.message;
        toast.error(message);
      } else {
        toast.error(t('meal_plan_clinical.images.upload_error'));
      }
    }
    return null;
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    toast.info("A IA está processando seu pedido...");
    try {
      const res = await fetch('/api/ai/generate-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      
      const data = await res.json();
      
      if (data.meals && Array.isArray(data.meals)) {
        // Inject each meal into Tiptap
        const mealNodes = data.meals.map((meal: Record<string, unknown>) => ({
          type: 'meal',
          attrs: {
            name: meal.name,
            time: meal.time || "",
            notes: meal.notes,
            items: (Array.isArray(meal.items) ? meal.items : []).map((item: Record<string, unknown>) => ({
              ...item,
              id: `ai-${Math.random().toString(36).substr(2, 9)}`
            }))
          }
        }));

        editor?.chain().focus().insertContent(mealNodes).run();

        toast.success("Cardápio gerado com sucesso!");
        setAiPrompt("");
      } else {
        toast.error("Resposta inválida da IA.");
      }
    } catch {
      toast.error("Erro ao comunicar com a IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto py-8 px-4 sm:px-8 bg-card-bg min-h-screen">
      
      {/* Plan Header */}
      {(planTitle !== undefined || onMetaChange) && (
        <div className="mb-6">
          <input
            value={planTitle || ""}
            onChange={e => onMetaChange && onMetaChange("title", e.target.value)}
            className="text-4xl font-black text-text-primary bg-transparent border-none focus:outline-none w-full placeholder:text-gray-300 dark:placeholder:text-gray-600"
            placeholder="Nome do Plano"
          />
          <input
            value={planObjective || ""}
            onChange={e => onMetaChange && onMetaChange("objective", e.target.value)}
            className="text-xl text-text-secondary bg-transparent border-none focus:outline-none w-full mt-2 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            placeholder="Objetivo do plano (ex: Hipertrofia)"
          />
        </div>
      )}

      {/* AI Command Bar */}
      <div className="mb-8 p-4 bg-gradient-to-r from-brand-blue/10 to-indigo-50/50 dark:from-brand-blue/10 dark:to-slate-800 rounded-2xl border border-brand-blue/20 flex gap-3 shadow-sm items-center">
        <Sparkles className="w-5 h-5 text-brand-blue shrink-0" />
        <input
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerateAI()}
          placeholder="Peça à IA: 'Crie um cardápio de 2000kcal hipertrofia...'"
          className="flex-1 bg-transparent border-none focus:outline-none text-text-primary text-sm placeholder:text-text-secondary/60"
          disabled={isGenerating}
        />
        <button
          onClick={handleGenerateAI}
          disabled={isGenerating || !aiPrompt.trim()}
          className="bg-brand-blue hover:bg-brand-hover text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar"}
        </button>
        <div className="w-px h-6 bg-border-neutral mx-1"></div>
        <button
          onClick={() => {
            editor?.chain().focus().insertContent({
              type: 'meal',
              attrs: { name: 'Nova Refeição', items: [] }
            }).run();
          }}
          className="bg-card-bg border border-border-neutral hover:border-brand-blue text-text-primary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 text-brand-blue" />
          Refeição
        </button>
      </div>

      <TiptapToolbar editor={editor} onUploadImage={uploadImage} />
      <div className="border border-border-neutral border-t-0 rounded-b-xl bg-card-bg p-4 sm:p-8 min-h-[500px]">
        <EditorContent editor={editor} className="meal-plan-editor flex-1 outline-none" />
        {nutritionistName && (
          <MealPlanNutritionistSignature
            nutritionistName={nutritionistName}
            crn={nutritionistCrn}
            title={t("meal_plan_clinical.signature.title")}
            professionLabel={t("meal_plan_clinical.signature.nutritionist")}
            automaticHint={t("meal_plan_clinical.signature.automatic_hint")}
            showAutomaticHint
            className="mt-12 border-t border-dashed border-border-neutral pt-8"
          />
        )}
      </div>

    </div>
  );
}
