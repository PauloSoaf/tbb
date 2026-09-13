"use client";

// Demo tools hub = the REAL FerramentasPageClient (it takes only the tenant;
// its links go through the /dashboard/demo bridge back into the demo).
import { FerramentasPageClient } from "@/components/ferramentas/FerramentasPageClient";

export default function DemoToolsPage() {
  return <FerramentasPageClient tenant="demo" />;
}
