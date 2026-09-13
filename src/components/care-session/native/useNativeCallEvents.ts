"use client";
import { useCallback, useRef } from "react";

export type NativeCallEvent =
  | "REMOTE_CONNECTED"
  | "REMOTE_DISCONNECTED"
  | "SCREEN_SHARE_STARTED"
  | "SCREEN_SHARE_STOPPED"
  | "MIC_MUTED"
  | "MIC_UNMUTED"
  | "CAMERA_DISABLED"
  | "CAMERA_ENABLED"
  | "CALL_ENDED";

type EventHandler = (event: NativeCallEvent) => void;

export function useNativeCallEvents() {
  const handlersRef = useRef<EventHandler[]>([]);

  const subscribe = useCallback((handler: EventHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const emit = useCallback((event: NativeCallEvent) => {
    handlersRef.current.forEach((h) => h(event));
  }, []);

  return { subscribe, emit };
}
