import { Editor, useEditorState } from '@tiptap/react';
import { useRef, useState } from 'react';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Table as TableIcon, Grid3X3, Trash, Undo, Redo, Columns, CheckSquare, Minus, AlertTriangle, ImageIcon, Loader2,
  BringToFront, SendToBack, GalleryHorizontal, Ratio
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext';
import type { EditorImageAlignment, EditorImageLayer } from './tiptap/EditorImageExtension';

interface TiptapToolbarProps {
  editor: Editor | null;
  onUploadImage: (file: File) => Promise<string | null>;
}

export function TiptapToolbar({ editor, onUploadImage }: TiptapToolbarProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState<string | null>(null);
  const imageState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return {
          active: false,
          alt: '',
          width: null as number | null,
          height: null as number | null,
          alignment: 'CENTER' as EditorImageAlignment,
          layerMode: 'INLINE' as EditorImageLayer,
          x: 24,
          y: 24,
          aspectRatio: null as number | null,
        };
      }
      const attributes = currentEditor.getAttributes('image') as {
        alt?: string | null;
        width?: number | string | null;
        height?: number | string | null;
        alignment?: EditorImageAlignment;
        layerMode?: EditorImageLayer;
        x?: number | string | null;
        y?: number | string | null;
        aspectRatio?: number | string | null;
      };
      const parseNumber = (value: number | string | null | undefined) => {
        const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : null;
        return Number.isFinite(parsed) ? parsed : null;
      };
      const parsedWidth = parseNumber(attributes.width);
      const parsedHeight = parseNumber(attributes.height);
      return {
        active: currentEditor.isActive('image'),
        alt: attributes.alt ?? '',
        width: Number.isFinite(parsedWidth) ? parsedWidth : null,
        height: Number.isFinite(parsedHeight) ? parsedHeight : null,
        alignment: attributes.alignment === 'LEFT' || attributes.alignment === 'RIGHT' ? attributes.alignment : 'CENTER' as EditorImageAlignment,
        layerMode: attributes.layerMode === 'BEHIND' || attributes.layerMode === 'FRONT' ? attributes.layerMode : 'INLINE' as EditorImageLayer,
        x: parseNumber(attributes.x) ?? 24,
        y: parseNumber(attributes.y) ?? 24,
        aspectRatio: parseNumber(attributes.aspectRatio),
      };
    },
  });

  if (!editor) return null;

  const updateActiveImage = (attributes: Record<string, string | number | null>) => {
    editor.chain().focus().updateAttributes('image', attributes).run();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPendingImagePreviewUrl(previewUrl);
    setIsUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url, alt: '' }).run();
      }
    } finally {
      setIsUploading(false);
      setPendingImagePreviewUrl(null);
      URL.revokeObjectURL(previewUrl);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-card-bg border border-border-neutral rounded-t-xl border-b-0 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-1 pr-2 border-r border-border-neutral">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/jpeg,image/png,image/webp"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-1.5 rounded hover:bg-warm-beige disabled:opacity-50 text-brand-blue font-medium flex items-center gap-1"
          title="Inserir Imagem"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </button>
        {pendingImagePreviewUrl && (
          <span className="relative h-7 w-9 overflow-hidden rounded border border-border-neutral bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImagePreviewUrl} alt="" className="h-full w-full object-cover" />
            <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-brand-blue drop-shadow" />
          </span>
        )}
      </div>

      {imageState?.active && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 border-r border-border-neutral">
          <input
            value={imageState.alt}
            onChange={(event) => updateActiveImage({ alt: event.target.value || null })}
            placeholder={t('meal_plan_clinical.editor_image.alt_placeholder')}
            aria-label={t('meal_plan_clinical.editor_image.alt')}
            className="h-7 w-36 rounded border border-border-neutral bg-card-bg px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <input
            type="number"
            min="80"
            max="1200"
            value={imageState.width ?? ''}
            onChange={(event) => {
              const width = Number(event.target.value);
              updateActiveImage({ width: Number.isFinite(width) && width >= 80 ? Math.min(width, 1200) : null });
            }}
            aria-label={t('meal_plan_clinical.editor_image.width')}
            className="h-7 w-16 rounded border border-border-neutral bg-card-bg px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <span className="text-[10px] text-text-secondary">×</span>
          <input
            type="number"
            min="60"
            max="1000"
            value={imageState.height ?? ''}
            onChange={(event) => {
              const height = Number(event.target.value);
              updateActiveImage({ height: Number.isFinite(height) && height >= 60 ? Math.min(height, 1000) : null });
            }}
            aria-label={t('meal_plan_clinical.editor_image.height')}
            className="h-7 w-16 rounded border border-border-neutral bg-card-bg px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <button
            type="button"
            disabled={!imageState.aspectRatio || !imageState.width}
            onClick={() => {
              if (!imageState.aspectRatio || !imageState.width) return;
              updateActiveImage({ height: Math.max(60, Math.min(1000, Math.round(imageState.width / imageState.aspectRatio))) });
            }}
            className="p-1.5 rounded hover:bg-warm-beige text-text-secondary disabled:opacity-40"
            title={t('meal_plan_clinical.editor_image.restore_ratio')}
            aria-label={t('meal_plan_clinical.editor_image.restore_ratio')}
          >
            <Ratio className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-0.5" aria-label={t('meal_plan_clinical.editor_image.alignment')}>
            {([
              ['LEFT', AlignLeft, 'align_left'],
              ['CENTER', AlignCenter, 'align_center'],
              ['RIGHT', AlignRight, 'align_right'],
            ] as const).map(([alignment, Icon, label]) => (
              <button
                key={alignment}
                type="button"
                onClick={() => updateActiveImage({ alignment })}
                className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${imageState.alignment === alignment ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
                title={t(`meal_plan_clinical.editor_image.${label}`)}
                aria-label={t(`meal_plan_clinical.editor_image.${label}`)}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 border-l border-border-neutral pl-1" aria-label={t('meal_plan_clinical.editor_image.layer')}>
            {([
              ['INLINE', GalleryHorizontal, 'layer_inline'],
              ['BEHIND', SendToBack, 'layer_behind'],
              ['FRONT', BringToFront, 'layer_front'],
            ] as const).map(([layerMode, Icon, label]) => (
              <button
                key={layerMode}
                type="button"
                onClick={() => updateActiveImage({ layerMode })}
                className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${imageState.layerMode === layerMode ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
                title={t(`meal_plan_clinical.editor_image.${label}`)}
                aria-label={t(`meal_plan_clinical.editor_image.${label}`)}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          {imageState.layerMode !== 'INLINE' && (
            <div className="flex items-center gap-1 border-l border-border-neutral pl-1">
              <label className="flex items-center gap-1 text-[10px] text-text-secondary">
                X
                <input
                  type="number"
                  value={imageState.x}
                  onChange={(event) => updateActiveImage({ x: Number(event.target.value) || 0 })}
                  className="h-7 w-14 rounded border border-border-neutral bg-card-bg px-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </label>
              <label className="flex items-center gap-1 text-[10px] text-text-secondary">
                Y
                <input
                  type="number"
                  value={imageState.y}
                  onChange={(event) => updateActiveImage({ y: Number(event.target.value) || 0 })}
                  className="h-7 w-14 rounded border border-border-neutral bg-card-bg px-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </label>
            </div>
          )}
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteSelection().run()}
            className="p-1.5 rounded hover:bg-danger/10 text-danger"
            title={t('meal_plan_clinical.editor_image.remove')}
            aria-label={t('meal_plan_clinical.editor_image.remove')}
          >
            <Trash className="w-4 h-4" />
          </button>
          <span className="hidden 2xl:inline text-[10px] text-text-secondary">{t('meal_plan_clinical.editor_image.resize_hint')}</span>
        </div>
      )}

      <div className="flex items-center gap-1 px-2 border-r border-border-neutral">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-warm-beige disabled:opacity-50 text-text-secondary"
          title="Desfazer"
        ><Undo className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-warm-beige disabled:opacity-50 text-text-secondary"
          title="Refazer"
        ><Redo className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-border-neutral">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('heading', { level: 1 }) ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue' : ''}`}
          title="Título 1"
        ><Heading1 className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('heading', { level: 2 }) ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Título 2"
        ><Heading2 className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('heading', { level: 3 }) ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Título 3"
        ><Heading3 className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-border-neutral">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('bold') ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Negrito"
        ><Bold className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('italic') ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Itálico"
        ><Italic className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('strike') ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Tachado"
        ><Strikethrough className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-border-neutral">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive({ textAlign: 'left' }) ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Alinhar à Esquerda"
        ><AlignLeft className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive({ textAlign: 'center' }) ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Centralizar"
        ><AlignCenter className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive({ textAlign: 'right' }) ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Alinhar à Direita"
        ><AlignRight className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive({ textAlign: 'justify' }) ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Justificar"
        ><AlignJustify className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-border-neutral">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('bulletList') ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Lista"
        ><List className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('orderedList') ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Lista Numerada"
        ><ListOrdered className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('taskList') ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Checklist"
        ><CheckSquare className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-border-neutral">
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-warm-beige text-text-secondary ${editor.isActive('blockquote') ? 'bg-brand-blue/10 text-brand-blue' : ''}`}
          title="Alerta (Bloco de Citação)"
        ><AlertTriangle className="w-4 h-4" /></button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded hover:bg-warm-beige text-text-secondary"
          title="Divisor de Linha"
        ><Minus className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-1 pl-2">
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="p-1.5 rounded hover:bg-warm-beige text-text-secondary"
          title="Inserir Tabela"
        ><TableIcon className="w-4 h-4" /></button>
        
        {editor.isActive('table') && (
          <>
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="p-1.5 rounded hover:bg-warm-beige text-text-secondary"
              title="Adicionar Coluna"
            ><Columns className="w-4 h-4" /></button>
            <button
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="p-1.5 rounded hover:bg-warm-beige text-text-secondary"
              title="Adicionar Linha"
            ><Grid3X3 className="w-4 h-4" /></button>
            <button
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="p-1.5 rounded hover:bg-danger/10 text-danger"
              title="Excluir Tabela"
            ><Trash className="w-4 h-4" /></button>
          </>
        )}
      </div>
    </div>
  );
}
