"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FloatingToolId } from "./types";
import { getWindowToolById } from "./tool-registry";

export type FloatingToolWindowState = {
  id: string;
  toolId: FloatingToolId;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minimized: boolean;
  zIndex: number;
};

const STORAGE_KEY = "nutriopus-floating-tool-windows";
const BASE_Z_INDEX = 200;

type StoredWindow = Pick<FloatingToolWindowState, "toolId" | "position" | "minimized" | "zIndex" | "size">;

export function getInitialFloatingToolPosition(
  index: number,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const rightOffset = 24 + index * 16;
  const topOffset = 88 + index * 16;

  return {
    x: Math.max(16, viewport.width - size.width - rightOffset),
    y: Math.max(72, Math.min(topOffset, viewport.height - 240)),
  };
}

function getInitialPosition(index: number, size: { width: number; height: number }) {
  const viewport = typeof window === "undefined"
    ? { width: 1280, height: 720 }
    : { width: window.innerWidth, height: window.innerHeight };

  return getInitialFloatingToolPosition(index, size, viewport);
}

function clampPosition(position: { x: number; y: number }, size: { width: number; height: number }) {
  if (typeof window === "undefined") return position;
  const headerVisible = 72;
  const minVisible = 96;
  return {
    x: Math.max(8 - size.width + minVisible, Math.min(position.x, window.innerWidth - minVisible)),
    y: Math.max(8, Math.min(position.y, window.innerHeight - headerVisible)),
  };
}

function readStoredWindows(): StoredWindow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function restoreWindows(tenant: string) {
  return readStoredWindows().reduce<FloatingToolWindowState[]>((acc, item) => {
    const tool = getWindowToolById(tenant, item.toolId);
    if (!tool?.floating) return acc;

    const size = item.size ?? tool.windowSize ?? { width: 380, height: 460 };
    acc.push({
      id: item.toolId,
      toolId: item.toolId,
      title: tool.title,
      position: clampPosition(item.position ?? getInitialPosition(acc.length, size), size),
      size,
      minimized: Boolean(item.minimized),
      zIndex: Number.isFinite(item.zIndex) ? item.zIndex : BASE_Z_INDEX,
    });
    return acc;
  }, []);
}

function getNextZIndex(windows: FloatingToolWindowState[]) {
  return windows.reduce((max, item) => Math.max(max, item.zIndex), BASE_Z_INDEX) + 1;
}

export function useFloatingToolsStore(tenant: string) {
  const [windows, setWindows] = useState<FloatingToolWindowState[]>(() => restoreWindows(tenant));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: StoredWindow[] = windows.map(({ toolId, position, minimized, zIndex, size }) => ({
      toolId,
      position,
      minimized,
      zIndex,
      size,
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [windows]);

  const focusToolWindow = useCallback((windowId: string) => {
    setWindows((prev) => {
      const nextZIndex = getNextZIndex(prev);
      return prev.map((item) => (
        item.id === windowId ? { ...item, zIndex: nextZIndex, minimized: false } : item
      ));
    });
  }, []);

  const openToolWindow = useCallback((toolId: FloatingToolId) => {
    const tool = getWindowToolById(tenant, toolId);
    if (!tool?.floating) return;

    setWindows((prev) => {
      const nextZIndex = getNextZIndex(prev);
      const existing = prev.find((item) => item.toolId === toolId);
      if (existing) {
        return prev.map((item) => item.id === existing.id ? { ...item, zIndex: nextZIndex, minimized: false } : item);
      }

      const size = tool.windowSize ?? { width: 380, height: 460 };
      const position = clampPosition(getInitialPosition(prev.length, size), size);
      return [
        ...prev,
        {
          id: toolId,
          toolId,
          title: tool.title,
          position,
          size,
          minimized: false,
          zIndex: nextZIndex,
        },
      ];
    });
  }, [tenant]);

  const closeToolWindow = useCallback((windowId: string) => {
    setWindows((prev) => prev.filter((item) => item.id !== windowId));
  }, []);

  const minimizeToolWindow = useCallback((windowId: string) => {
    setWindows((prev) => prev.map((item) => item.id === windowId ? { ...item, minimized: true } : item));
  }, []);

  const restoreToolWindow = useCallback((windowId: string) => {
    focusToolWindow(windowId);
  }, [focusToolWindow]);

  const moveToolWindow = useCallback((windowId: string, position: { x: number; y: number }) => {
    setWindows((prev) => prev.map((item) => (
      item.id === windowId ? { ...item, position: clampPosition(position, item.size) } : item
    )));
  }, []);

  const focusedWindowId = useMemo(() => (
    windows.reduce<string | null>((focused, item) => {
      if (!focused) return item.id;
      const current = windows.find((candidate) => candidate.id === focused);
      return !current || item.zIndex > current.zIndex ? item.id : focused;
    }, null)
  ), [windows]);

  return {
    windows,
    focusedWindowId,
    openToolWindow,
    closeToolWindow,
    minimizeToolWindow,
    restoreToolWindow,
    focusToolWindow,
    moveToolWindow,
  };
}
