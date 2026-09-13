import { buildPatientSlug } from "./patientSlug";

export function buildPatientPortalSlug(patient: { id: string; name: string }) {
  return buildPatientSlug(patient);
}

export function buildPatientPortalBase(tenantSlug: string, patientSlug: string) {
  return `/portal/${tenantSlug}/paciente/${patientSlug}`;
}

export function buildPatientPortalHref(tenantSlug: string, patientSlug: string, path = "") {
  const base = buildPatientPortalBase(tenantSlug, patientSlug);
  if (!path || path === "/") return base;
  return `${base}/${path.replace(/^\/+/, "")}`;
}

export function toPatientPortalPrettyPath(pathname: string, tenantSlug: string, patientSlug: string) {
  const legacyBase = `/portal/${tenantSlug}`;
  const prettyBase = buildPatientPortalBase(tenantSlug, patientSlug);

  if (!pathname.startsWith(legacyBase)) return pathname;
  if (pathname.startsWith(prettyBase)) return pathname;
  if (pathname.includes("/login") || pathname.includes("/ativar-acesso")) return pathname;

  const suffix = pathname.slice(legacyBase.length);
  return `${prettyBase}${suffix}`;
}
