"use server";

import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { generatePatientJoinToken, invalidatePatientJoinToken } from "@/services/care-session-link.service";

export async function generateCareSessionPatientLinkAction(tenantSlug: string, sessionId: string) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    const token = await generatePatientJoinToken(sessionId, session.nutritionistId);
    return { success: true, token };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function invalidateCareSessionPatientLinkAction(tenantSlug: string, sessionId: string) {
  try {
    const { session } = await assertTenantAccess(tenantSlug);
    await invalidatePatientJoinToken(sessionId, session.nutritionistId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}
