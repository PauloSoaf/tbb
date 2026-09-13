"use client";

// Demo dashboard = the REAL DashboardPageClient fed with mock data.
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";
import { useDemo } from "@/demo/demo-context";
import { buildDemoDashboardData } from "@/demo/adapters/dashboard-demo-adapter";

export default function DemoDashboardPage() {
  const { patients, appointments, messages } = useDemo();
  return <DashboardPageClient data={buildDemoDashboardData(patients, appointments, messages)} />;
}
