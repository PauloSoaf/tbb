import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MealNodeView } from './MealNodeView';
import type { MealPlanLibraryFoodSnapshot, MealPlanLibraryMealSnapshot } from '@/lib/meal-plan/library-types';

export interface MealExtensionOptions {
  planId?: string;
  tenantSlug?: string;
  onStructuredImageDetached?: (url: string) => void;
  onSaveMealToLibrary?: (meal: MealPlanLibraryMealSnapshot) => Promise<void>;
  onSaveFoodToLibrary?: (food: MealPlanLibraryFoodSnapshot) => Promise<void>;
  onLibraryItemUsed?: (type: "MEAL" | "FOOD", id: string) => void;
}

export const MealExtension = Node.create<MealExtensionOptions>({
  name: 'meal',
  group: 'block',
  atom: true, // It's a single block, not editable like text from Tiptap's perspective
  draggable: true,

  addOptions() {
    return {
      planId: undefined,
      tenantSlug: undefined,
      onStructuredImageDetached: undefined,
      onSaveMealToLibrary: undefined,
      onSaveFoodToLibrary: undefined,
      onLibraryItemUsed: undefined,
    };
  },

  addAttributes() {
    return {
      id: { default: null },
      name: { default: 'Nova Refeição' },
      time: { default: null },
      notes: { default: null },
      imageUrl: { default: null },
      imageAlt: { default: null },
      imageCaption: { default: null },
      showImageInPdf: { default: true },
      imageWidth: { default: 480 },
      imageHeight: { default: 270 },
      imageFit: { default: 'COVER' },
      imageAlignment: { default: 'CENTER' },
      imageLayer: { default: 'INLINE' },
      imageX: { default: 24 },
      imageY: { default: 24 },
      items: { default: [] },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="meal"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'meal' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MealNodeView);
  },
});
