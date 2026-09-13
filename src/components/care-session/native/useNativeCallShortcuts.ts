"use client";
import { useEffect } from "react";

interface Shortcuts {
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onToggleChat?: () => void;
  onToggleNotes?: () => void;
  onToggleFullscreen?: () => void;
  enabled?: boolean;
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  return (
    INPUT_TAGS.has(el.tagName) ||
    (el as HTMLElement).contentEditable === "true"
  );
}

export function useNativeCallShortcuts({
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleNotes,
  onToggleFullscreen,
  enabled = true,
}: Shortcuts) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "m": e.preventDefault(); onToggleMic?.(); break;
        case "v": e.preventDefault(); onToggleCamera?.(); break;
        case "s": e.preventDefault(); onToggleScreenShare?.(); break;
        case "c": e.preventDefault(); onToggleChat?.(); break;
        case "n": e.preventDefault(); onToggleNotes?.(); break;
        case "f": e.preventDefault(); onToggleFullscreen?.(); break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onToggleMic, onToggleCamera, onToggleScreenShare, onToggleChat, onToggleNotes, onToggleFullscreen]);
}
