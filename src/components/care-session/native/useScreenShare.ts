"use client";
import { useState, useRef, useCallback, useEffect } from "react";

interface UseScreenShareOptions {
  replaceVideoTrack: (track: MediaStreamTrack | null) => Promise<void>;
  /** Returns the camera track to restore when the share ends (or null). */
  getCameraTrack?: () => MediaStreamTrack | null;
  onStarted?: () => void;
  onStopped?: () => void;
  onError?: (err: string) => void;
}

export type UseScreenShareResult = {
  isSharing: boolean;
  screenStream: MediaStream | null;
  supportsScreenShare: boolean;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => Promise<boolean>;
};

export function supportsScreenShare(): boolean {
  return typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

/**
 * Screen sharing via getDisplayMedia + replaceTrack.
 *
 * - startScreenShare returns the MediaStream (or null on failure) so callers
 *   never depend on React state right after an await;
 * - stopScreenShare is async, returns success and restores the camera track
 *   WITHOUT re-enabling a camera the user had turned off (replaceTrack swaps
 *   the track; `enabled` stays whatever the camera track already was);
 * - stopping via the browser's native control (`track.onended`) is handled.
 *
 * NOTE: startScreenShare must only be called from a user gesture (click) —
 * browsers reject getDisplayMedia without user activation.
 */
export function useScreenShare({
  replaceVideoTrack,
  getCameraTrack,
  onStarted,
  onStopped,
  onError,
}: UseScreenShareOptions): UseScreenShareResult {
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const stoppingRef = useRef(false);

  // Fresh callbacks for the async onended handler.
  const callbacksRef = useRef({ replaceVideoTrack, getCameraTrack, onStarted, onStopped, onError });
  useEffect(() => {
    callbacksRef.current = { replaceVideoTrack, getCameraTrack, onStarted, onStopped, onError };
  });

  const stopScreenShare = useCallback(async (): Promise<boolean> => {
    if (stoppingRef.current) return false;
    stoppingRef.current = true;
    try {
      const stream = screenStreamRef.current;
      screenStreamRef.current = null;
      setScreenStream(null);

      // Stop ALL screen tracks (some browsers add audio tracks too).
      stream?.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });

      // Restore the camera track on the peer. If the camera was off before
      // sharing, the track's `enabled` is still false — it is NOT re-enabled.
      const cameraTrack = callbacksRef.current.getCameraTrack?.() ?? null;
      try {
        await callbacksRef.current.replaceVideoTrack(cameraTrack);
      } catch {
        // peer may already be closed — still report the share as stopped
      }

      setIsSharing(false);
      callbacksRef.current.onStopped?.();
      return true;
    } finally {
      stoppingRef.current = false;
    }
  }, []);

  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    if (!supportsScreenShare()) {
      onError?.("screen_not_supported");
      return null;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) {
        displayStream.getTracks().forEach((t) => t.stop());
        return null;
      }

      try {
        await replaceVideoTrack(screenTrack);
      } catch {
        // Could not send the track to the peer — clean up and fail explicitly.
        displayStream.getTracks().forEach((t) => t.stop());
        onError?.("screen_not_supported");
        return null;
      }

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsSharing(true);
      onStarted?.();

      // User stopped via the browser's native "stop sharing" control.
      screenTrack.onended = () => {
        void stopScreenShare();
      };

      return displayStream;
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === "NotAllowedError" || e.name === "AbortError") {
        onError?.("screen_denied");
      } else {
        onError?.("screen_not_supported");
      }
      return null;
    }
  }, [replaceVideoTrack, onStarted, onError, stopScreenShare]);

  // Cleanup on unmount: never leave the screen capture running.
  useEffect(() => () => {
    screenStreamRef.current?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    screenStreamRef.current = null;
  }, []);

  return {
    isSharing,
    screenStream,
    supportsScreenShare: supportsScreenShare(),
    startScreenShare,
    stopScreenShare,
  };
}
