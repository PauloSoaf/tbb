"use client";
// Document PiP types are declared globally in src/types/document-picture-in-picture.d.ts
import { useState, useCallback, useRef } from "react";

export type PipMode = "document" | "video" | "internal" | null;

export function supportsDocumentPip(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

export function supportsVideoPip(): boolean {
  return typeof document !== "undefined" && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;
}

export function clampVolume(v: number): number {
  return Math.max(0, Math.min(1, v));
}

interface UsePictureInPictureOptions {
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  patientName?: string;
  onRestore?: () => void;
}

export function usePictureInPicture({ remoteVideoRef, onRestore }: UsePictureInPictureOptions) {
  const [isInPip, setIsInPip] = useState(false);
  const [pipMode, setPipMode] = useState<PipMode>(null);
  const pipWindowRef = useRef<Window | null>(null);

  const exitDocumentPip = useCallback(() => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
    setIsInPip(false);
    setPipMode(null);
  }, []);

  const enterDocumentPip = useCallback(async () => {
    if (!supportsDocumentPip() || !window.documentPictureInPicture) return false;
    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 400,
        height: 240,
      });
      pipWindowRef.current = pipWin;

      // Copy styles from parent
      [...document.styleSheets].forEach((sheet) => {
        try {
          const cssRules = [...sheet.cssRules].map((r) => r.cssText).join("");
          const style = pipWin.document.createElement("style");
          style.textContent = cssRules;
          pipWin.document.head.appendChild(style);
        } catch { /* cross-origin stylesheet — skip */ }
      });

      // Move video to pip window
      const videoEl = remoteVideoRef.current;
      if (videoEl) {
        const container = pipWin.document.createElement("div");
        container.style.cssText = "width:100%;height:100%;background:#111;display:flex;align-items:center;justify-content:center;";
        pipWin.document.body.style.margin = "0";
        pipWin.document.body.appendChild(container);
        container.appendChild(videoEl);
      }

      pipWin.addEventListener("pagehide", () => {
        // Move video back when pip closes
        document.body.appendChild(remoteVideoRef.current!);
        setIsInPip(false);
        setPipMode(null);
        pipWindowRef.current = null;
        onRestore?.();
      });

      setIsInPip(true);
      setPipMode("document");
      return true;
    } catch {
      return false;
    }
  }, [remoteVideoRef, onRestore]);

  const enterVideoPip = useCallback(async () => {
    const video = remoteVideoRef.current;
    if (!video || !supportsVideoPip()) return false;
    try {
      await video.requestPictureInPicture();
      setIsInPip(true);
      setPipMode("video");

      video.addEventListener("leavepictureinpicture", () => {
        setIsInPip(false);
        setPipMode(null);
        onRestore?.();
      }, { once: true });
      return true;
    } catch {
      return false;
    }
  }, [remoteVideoRef, onRestore]);

  const enterInternalPip = useCallback(() => {
    setIsInPip(true);
    setPipMode("internal");
  }, []);

  const exitPip = useCallback(async () => {
    if (pipMode === "document") {
      exitDocumentPip();
    } else if (pipMode === "video") {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture().catch(() => {});
      }
      setIsInPip(false);
      setPipMode(null);
    } else if (pipMode === "internal") {
      setIsInPip(false);
      setPipMode(null);
      onRestore?.();
    }
  }, [pipMode, exitDocumentPip, onRestore]);

  // Try in cascade: document → video → internal
  const enterPip = useCallback(async () => {
    if (await enterDocumentPip()) return;
    if (await enterVideoPip()) return;
    enterInternalPip();
  }, [enterDocumentPip, enterVideoPip, enterInternalPip]);

  return {
    isInPip,
    pipMode,
    enterPip,
    exitPip,
    supportsDocumentPip: supportsDocumentPip(),
    supportsVideoPip: supportsVideoPip(),
  };
}
