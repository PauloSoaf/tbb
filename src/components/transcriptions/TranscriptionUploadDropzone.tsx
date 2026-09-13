"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Loader2, Music, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { toast } from "sonner";
import { uploadTranscriptionAudioAction } from "@/actions/transcription.action";

const ALLOWED_TYPES = [
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg",
  "video/webm", "video/mp4",
];

const MAX_SIZE_MB = parseInt(process.env.NEXT_PUBLIC_MAX_AUDIO_SIZE_MB ?? "100", 10);

interface Props {
  transcriptionId: string;
  tenantSlug: string;
  onUploaded?: () => void;
}

export function TranscriptionUploadDropzone({ transcriptionId, tenantSlug, onUploaded }: Props) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipo de arquivo não suportado: ${file.type}`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Arquivo muito grande. Máximo: ${MAX_SIZE_MB}MB`;
    }
    return null;
  }

  function handleFileSelect(file: File) {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSelectedFile(file);
  }

  function handleUpload() {
    if (!selectedFile) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("audio", selectedFile);
      formData.append("consentForRecording", "true");
      formData.append("consentForTranscription", "true");
      const res = await uploadTranscriptionAudioAction(tenantSlug, transcriptionId, formData);
      if (res.success) {
        toast.success(t("transcriptions.toasts.uploaded"));
        setSelectedFile(null);
        onUploaded?.();
      } else {
        toast.error(res.error ?? "Erro ao enviar áudio.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFileSelect(file);
        }}
        className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors text-center ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          {t("transcriptions.actions.upload_audio")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MP3, MP4, WAV, WebM, OGG · máx {MAX_SIZE_MB}MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
      />

      {selectedFile && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <Music className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
          <span className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
          </span>
          <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={handleUpload}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}
