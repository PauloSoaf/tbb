"use client";

import { useState } from "react";
import { AIAssistantDrawer } from "./AIAssistantDrawer";
import { FloatingAIButton } from "./FloatingAIButton";
import { FloatingToolsButton } from "./FloatingToolsButton";
import { FloatingToolsDrawer } from "./FloatingToolsDrawer";
import { FloatingToolsWindow } from "./FloatingToolsWindow";
import { FloatingPortal } from "./FloatingPortal";
import { useFloatingToolsStore } from "./floating-tools-store";
import type { FloatingToolId } from "./types";

export function FloatingActionDock({ tenant }: { tenant: string }) {
  const [aiOpen, setAiOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const {
    windows,
    focusedWindowId,
    openToolWindow,
    closeToolWindow,
    minimizeToolWindow,
    restoreToolWindow,
    focusToolWindow,
    moveToolWindow,
  } = useFloatingToolsStore(tenant);

  return (
    <>
      {/* Dock buttons — fixed to viewport corner, always on top of all layout elements */}
      <div className="floating-action-dock print:hidden fixed bottom-24 right-4 z-[9000] flex flex-col items-end gap-3 lg:bottom-6 lg:right-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
        <FloatingAIButton onClick={() => setAiOpen(true)} />
        <FloatingToolsButton onClick={() => setToolsOpen(true)} />
      </div>

      {/* All overlays rendered directly in document.body via portal — immune to parent stacking contexts */}
      <FloatingPortal>
        <AIAssistantDrawer
          tenant={tenant}
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          onOpenTool={(toolId) => {
            const valid: FloatingToolId[] = ["taco", "portion-converter", "bmi", "macros", "water", "tmb"];
            if (valid.includes(toolId as FloatingToolId)) {
              openToolWindow(toolId as FloatingToolId);
              setAiOpen(false);
            }
          }}
        />
        <FloatingToolsDrawer
          tenant={tenant}
          open={toolsOpen}
          windows={windows}
          onClose={() => setToolsOpen(false)}
          onOpenFloatingTool={(toolId) => {
            openToolWindow(toolId);
            setToolsOpen(false);
          }}
          onFocusWindow={focusToolWindow}
          onMinimizeWindow={minimizeToolWindow}
          onRestoreWindow={restoreToolWindow}
          onCloseWindow={closeToolWindow}
        />
        {windows.map((toolWindow) => (
          <FloatingToolsWindow
            key={toolWindow.id}
            tenant={tenant}
            window={toolWindow}
            mobileActive={focusedWindowId === toolWindow.id}
            onClose={() => closeToolWindow(toolWindow.id)}
            onMinimize={() => minimizeToolWindow(toolWindow.id)}
            onRestore={() => restoreToolWindow(toolWindow.id)}
            onFocus={() => focusToolWindow(toolWindow.id)}
            onMove={(position) => moveToolWindow(toolWindow.id, position)}
            onOpenTools={() => setToolsOpen(true)}
          />
        ))}
      </FloatingPortal>
    </>
  );
}
