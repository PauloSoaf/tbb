"use client";

import type { FloatingTool } from "./FloatingToolCard";
import { getToolRegistry } from "./tool-registry";

export function getFloatingTools(tenant: string): FloatingTool[] {
  return getToolRegistry(tenant).map((tool) => ({
    id: tool.id,
    title: tool.title,
    description: tool.description,
    href: tool.href,
    icon: tool.icon,
    floating: tool.floating,
  }));
}
