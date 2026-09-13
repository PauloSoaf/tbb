import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const NUTRITIONIST_CACHE_TAG = (slug: string) => `nutritionist:${slug}`;

// Nutritionist record cached across requests (Data Cache). The record changes
// only when the profile is edited — updateNutritionistConfigAction revalidates
// the tag, so 10 min TTL is just a safety net.
const getNutritionistBySlugCached = (slug: string) =>
  unstable_cache(
    () => prisma.nutritionist.findUnique({ where: { slug } }),
    ["nutritionist-by-slug", slug],
    { revalidate: 600, tags: [NUTRITIONIST_CACHE_TAG(slug)] }
  )();

/**
 * Asserts that the currently logged-in user has access to the specified tenant.
 * Returns the session payload if access is valid, or redirects to /login.
 *
 * PERFORMANCE: wrapped in React.cache so layout + page + nested server
 * components share ONE execution per request (it used to hit the DB once per
 * call — with layout AND page calling it, that was 2 DB round-trips per
 * navigation before any real data was fetched). The nutritionist lookup is
 * additionally cached across requests via unstable_cache.
 */
import { getCurrentTenantContext } from "./getCurrentTenantContext";

export const assertTenantAccess = cache(
  async (tenantSlug: string, options?: { allowedRoles?: string[] }) => {
    const ctx = await getCurrentTenantContext(tenantSlug);

    if (!ctx) {
      redirect("/login");
    }

    // Global administrators have tenant-wide access and must not be rejected by
    // a page's narrower team-role allowlist.
    if (options?.allowedRoles && ctx.session.role && !ctx.isGlobalAdmin) {
      if (!options.allowedRoles.includes(ctx.session.role)) {
        redirect(`/dashboard/${tenantSlug}`); // redirect to home if unauthorized
      }
    }

    return {
      session: ctx.session,
      nutritionist: ctx.nutritionist,
      permissions: ctx.permissions,
      isGlobalAdmin: ctx.isGlobalAdmin,
      isOwner: ctx.isOwner,
      teamMemberRole: ctx.teamMemberRole,
      ctx,
    };
  }
);
