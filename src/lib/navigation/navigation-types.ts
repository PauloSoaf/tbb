import type { ComponentType } from "react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: ComponentType<{ className?: string }>;
  current?: boolean;
};

export type BackButtonConfig = {
  label: string;
  href: string;
};

export type PageHeaderConfig = {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  backButton?: BackButtonConfig;
  actions?: React.ReactNode;
};
