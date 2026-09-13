import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

interface StudioShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function StudioShell({ title, subtitle, children }: StudioShellProps) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <DashboardHeader title={title} subtitle={subtitle} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
