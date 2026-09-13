import type { MembershipRole } from "@prisma/client";
export function roleAllows(role: MembershipRole, permission = "READ") {
  if (role === "OWNER") return true;
  const key = permission.toLowerCase();
  if (key === "admin" || /^(members|permissions|billing|workspace)\.(manage|write|delete|edit)$/.test(key)) return role === "ADMIN";
  if (role === "ADMIN" || role === "MEMBER") return true;
  return key === "read" || /\.(read|view|list)$/.test(key);
}
export function resolvePermission(base: boolean, roleOverride?: boolean, memberOverride?: "ALLOW" | "DENY") {
  let allowed = roleOverride ?? base;
  if (memberOverride) allowed = memberOverride === "ALLOW";
  return allowed;
}
